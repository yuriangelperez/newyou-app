// Edge Function: API de tarjetas propia (simulada) para "Tarjeta de crédito" y "Tarjeta de débito".
// No cobra plata real ni usa Mercado Pago: valida la tarjeta como lo haría un procesador
// (Luhn, marca, tipo, vencimiento, CVV) y decide el resultado según el nombre del titular.
//
// Desplegar (una vez):
//   supabase functions deploy pago-tarjeta
//
// La app la llama con { accion, compraid } después de confirmar_compra:
//   - "pagar" con { tarjeta }: valida y cobra compras.total (incluye la comisión del crédito)
//     más el interés de las cuotas (INTERES_CUOTAS en _shared/tarjeta.ts).
//   - "cancelar": el comprador cerró el formulario; se anula la compra y vuelve el stock.
//
// Titular de prueba → resultado: APRO aprobado · FUND sin fondos · SECU código incorrecto ·
// CONT pendiente · OTHE rechazado. Cualquier otro nombre se aprueba.
// Nunca se guarda el número completo ni el CVV: sólo la marca y los últimos 4 dígitos.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { registrarPago } from '../_shared/mercadopago.ts';
import {
  calcularCuotas,
  type DatosTarjeta,
  detectarMarca,
  soloDigitos,
  validarTarjeta,
} from '../_shared/tarjeta.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function respuesta(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

const TIPO_DEL_MEDIO: Record<string, 'credito' | 'debito'> = {
  'Tarjeta de crédito': 'credito',
  'Tarjeta de débito': 'debito',
};

const RESULTADOS: Record<string, { estado: 'aprobado' | 'pendiente' | 'rechazado'; detalle: string | null }> = {
  APRO: { estado: 'aprobado', detalle: null },
  FUND: { estado: 'rechazado', detalle: 'La tarjeta no tiene fondos suficientes.' },
  SECU: { estado: 'rechazado', detalle: 'El código de seguridad es incorrecto.' },
  CONT: { estado: 'pendiente', detalle: 'El pago quedó en revisión. Te avisamos cuando se acredite.' },
  OTHE: { estado: 'rechazado', detalle: 'La tarjeta rechazó el pago. Probá con otra.' },
};

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

  const { accion, compraid, tarjeta } = await req.json().catch(() => ({}));
  if (!compraid || !['pagar', 'cancelar'].includes(accion)) {
    return respuesta({ error: 'Pedido inválido' }, 400);
  }

  const admin = createClient(url, servicio);
  const { data: compra, error } = await admin
    .from('compras')
    .select('compraid, metodo_pago, total, interes_cuotas, estado_pago')
    .eq('compraid', compraid)
    .eq('usuario_id', auth.user.id)
    .maybeSingle();
  if (error) return respuesta({ error: `Error al leer la compra: ${error.message}` }, 500);
  if (!compra) return respuesta({ error: 'Compra no encontrada' }, 404);

  const tipoEsperado = TIPO_DEL_MEDIO[compra.metodo_pago];
  if (!tipoEsperado) return respuesta({ error: 'Esta compra no se paga con tarjeta' }, 409);

  try {
    if (accion === 'cancelar') {
      const anulada = await registrarPago(admin, compra.compraid, 'cancelado');
      return respuesta({ estado: anulada.estado_pago });
    }

    // 'rechazado' también: el comprador puede reintentar con otra tarjeta.
    if (!['pendiente', 'rechazado'].includes(compra.estado_pago)) {
      return respuesta({ error: 'Esta compra no tiene un pago pendiente' }, 409);
    }

    const datos = tarjeta as DatosTarjeta | undefined;
    if (!datos) return respuesta({ error: 'Faltan los datos de la tarjeta' }, 400);

    // Se valida de nuevo: no se confía en la validación del celular.
    // También rechaza una tarjeta de débito como crédito y al revés (la comisión depende del tipo).
    const errores = validarTarjeta(
      { ...datos, cuotas: tipoEsperado === 'debito' ? 1 : Number(datos.cuotas) },
      new Date(),
      tipoEsperado,
    );
    const primerError = Object.values(errores)[0];
    if (primerError) return respuesta({ estado: 'rechazado', detalle: primerError });

    const resultado = RESULTADOS[datos.titular.trim().toUpperCase()] ?? RESULTADOS.APRO;
    const operacion = `NY-TAR-${crypto.randomUUID()}`;

    // El interés se calcula sobre el total sin interés: si reintenta con otras cuotas no se acumula.
    const cuotas = tipoEsperado === 'debito' ? 1 : Number(datos.cuotas);
    const base = Number(compra.total) - Number(compra.interes_cuotas ?? 0);
    const { interes, total } = calcularCuotas(base, cuotas);

    const { error: errorCuotas } = await admin
      .from('compras')
      .update({
        tarjeta_marca: detectarMarca(datos.numero),
        tarjeta_ultimos4: soloDigitos(datos.numero).slice(-4),
        cuotas,
        interes_cuotas: interes,
        total,
      })
      .eq('compraid', compra.compraid);
    if (errorCuotas) throw new Error(errorCuotas.message);

    await registrarPago(admin, compra.compraid, resultado.estado, operacion);

    return respuesta({ estado: resultado.estado, detalle: resultado.detalle, operacion, total, interes, cuotas });
  } catch (e) {
    return respuesta({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
