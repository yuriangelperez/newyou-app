// Edge Function: cobra con Mercado Pago (Checkout Pro) las compras con "Mercado Pago".
// Las tarjetas de crédito y débito van por la API propia: ver pago-tarjeta.
//
// Desplegar (una vez):
//   supabase functions deploy pago-mercadopago
//   supabase functions deploy mp-webhook --no-verify-jwt
//   supabase secrets set MP_ACCESS_TOKEN=APP_USR-xxxx   (Access Token de PRUEBA de tu aplicación)
//
// La app la llama con { accion, compraid } después de confirmar_compra:
//   - "crear": arma la preferencia del Checkout Pro con los precios del servidor y devuelve el link.
//   - "verificar": pregunta a Mercado Pago cómo quedó el pago y lo guarda en la compra.
//   - "cancelar": el comprador cerró el pago sin pagar; se anula la compra y vuelve el stock.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { llamarMp, registrarPago, sincronizarCompra } from '../_shared/mercadopago.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function respuesta(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

interface PedidoConItems {
  envio: number | string;
  pedido_items: { producto_id: number; nombre: string; precio_unitario: number | string; cantidad: number }[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const servicio = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const usuario = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: auth } = await usuario.auth.getUser();
  if (!auth?.user) return respuesta({ error: 'Sesión requerida' }, 401);

  const { accion, compraid } = await req.json().catch(() => ({}));
  if (!compraid || !['crear', 'verificar', 'cancelar'].includes(accion)) {
    return respuesta({ error: 'Pedido inválido' }, 400);
  }

  const admin = createClient(url, servicio);
  const { data: compra } = await admin
    .from('compras')
    .select('compraid, numero_orden, metodo_pago, total, estado_pago, mp_preference_id')
    .eq('compraid', compraid)
    .eq('usuario_id', auth.user.id)
    .maybeSingle();
  if (!compra) return respuesta({ error: 'Compra no encontrada' }, 404);

  try {
    if (accion === 'crear') {
      // De paso libera el stock de compras viejas que nunca se pagaron.
      await admin.rpc('anular_pagos_vencidos');

      if (compra.estado_pago !== 'pendiente' || compra.metodo_pago !== 'Mercado Pago') {
        return respuesta({ error: 'Esta compra no tiene un pago pendiente con Mercado Pago' }, 409);
      }

      // Precios y envío tal como los calculó confirmar_compra (no los del celular).
      const { data: pedidos, error } = await admin
        .from('pedidos')
        .select('envio, pedido_items(producto_id, nombre, precio_unitario, cantidad)')
        .eq('compra_id', compra.compraid);
      if (error) throw new Error(error.message);

      const items = (pedidos as PedidoConItems[]).flatMap((pedido) =>
        pedido.pedido_items.map((item) => ({
          id: String(item.producto_id),
          title: item.nombre,
          quantity: item.cantidad,
          unit_price: Number(item.precio_unitario),
          currency_id: 'ARS',
        })),
      );
      const envio = (pedidos as PedidoConItems[]).reduce((total, p) => total + Number(p.envio ?? 0), 0);
      if (envio > 0) {
        items.push({ id: 'envio', title: 'Envío', quantity: 1, unit_price: envio, currency_id: 'ARS' });
      }

      // Se excluye efectivo (Rapipago/Pago Fácil), que dejaría el stock reservado por días, y el
      // crédito, que tiene su propio medio con comisión.
      const excluidos = [{ id: 'ticket' }, { id: 'atm' }, { id: 'digital_currency' }, { id: 'credit_card' }];

      const retorno = `${url}/functions/v1/mp-webhook`;
      const vence = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const preferencia = await llamarMp<{ id: string; init_point: string; sandbox_init_point: string }>(
        '/checkout/preferences',
        {
          method: 'POST',
          body: JSON.stringify({
            items,
            external_reference: String(compra.compraid),
            statement_descriptor: 'NEW YOU',
            back_urls: {
              success: `${retorno}?retorno=aprobado`,
              pending: `${retorno}?retorno=pendiente`,
              failure: `${retorno}?retorno=rechazado`,
            },
            auto_return: 'approved',
            notification_url: retorno,
            payment_methods: { excluded_payment_types: excluidos, installments: 1 },
            expires: true,
            expiration_date_to: vence,
          }),
        },
      );

      await registrarPago(admin, compra.compraid, 'pendiente', null, preferencia.id);
      return respuesta({ preferenceId: preferencia.id, url: preferencia.init_point, retorno });
    }

    // verificar / cancelar: primero lo que diga Mercado Pago.
    const sincronizada = await sincronizarCompra(admin, compra.compraid);
    let estado = sincronizada?.estado_pago ?? compra.estado_pago;

    // Sin pago o con el último rechazado se anula; un pago en revisión se espera (lo resuelve el webhook).
    if (accion === 'cancelar' && (estado === 'rechazado' || (estado === 'pendiente' && !sincronizada))) {
      // Se vence la preferencia para que no se pueda pagar una compra ya anulada.
      if (compra.mp_preference_id) {
        await llamarMp(`/checkout/preferences/${compra.mp_preference_id}`, {
          method: 'PUT',
          body: JSON.stringify({ expires: true, expiration_date_to: new Date().toISOString() }),
        }).catch(() => undefined);
      }
      estado = (await registrarPago(admin, compra.compraid, 'cancelado')).estado_pago;
    }

    return respuesta({ estado });
  } catch (error) {
    return respuesta({ error: error instanceof Error ? error.message : String(error) }, 502);
  }
});
