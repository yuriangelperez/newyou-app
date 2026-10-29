// Edge Function: avisos de Mercado Pago (webhooks) y página de regreso del Checkout Pro.
//
// Desplegar SIN verificación de JWT (Mercado Pago no manda la sesión del usuario):
//   supabase functions deploy mp-webhook --no-verify-jwt
// Opcional: la clave secreta de "Webhooks" del panel de Mercado Pago, para validar la firma:
//   supabase secrets set MP_WEBHOOK_SECRET=xxxx
//
// - POST (webhook): consulta el pago a la API de Mercado Pago (nunca confía en el cuerpo)
//   y actualiza la compra con registrar_pago_mp.
// - GET ?retorno=...: adonde vuelve el navegador al terminar de pagar. En el celular la app
//   corta esa navegación antes; en la web el usuario vuelve a la pestaña de New You.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { llamarMp, mapearEstado, type PagoMp, registrarPago } from '../_shared/mercadopago.ts';

async function firmaValida(req: Request, dataId: string) {
  const secreto = Deno.env.get('MP_WEBHOOK_SECRET');
  if (!secreto) return true;

  const partes = Object.fromEntries(
    (req.headers.get('x-signature') ?? '').split(',').map((parte) => parte.trim().split('=') as [string, string]),
  );
  if (!partes.ts || !partes.v1) return false;

  const manifiesto = `id:${dataId.toLowerCase()};request-id:${req.headers.get('x-request-id') ?? ''};ts:${partes.ts};`;
  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const firma = await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(manifiesto));
  const hex = Array.from(new Uint8Array(firma), (b) => b.toString(16).padStart(2, '0')).join('');
  return hex === partes.v1;
}

Deno.serve(async (req) => {
  const params = new URL(req.url).searchParams;

  if (req.method === 'GET') {
    // Supabase sirve las funciones como texto plano, así que el mensaje va sin HTML.
    return new Response('Listo. Volvé a la app New You para ver el estado de tu compra.', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const cuerpo = await req.json().catch(() => ({}));
  const tipo = params.get('type') ?? params.get('topic') ?? cuerpo.type ?? cuerpo.topic;
  const dataId = String(params.get('data.id') ?? params.get('id') ?? cuerpo.data?.id ?? '');

  // Sólo interesan los pagos (también llegan merchant_order y otros).
  if (tipo !== 'payment' || !dataId) return new Response('ignorado', { status: 200 });
  if (!(await firmaValida(req, dataId))) return new Response('firma inválida', { status: 401 });

  try {
    const pago = await llamarMp<PagoMp>(`/v1/payments/${dataId}`);
    const compraid = Number(pago.external_reference);
    if (!compraid) return new Response('sin compra', { status: 200 });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await registrarPago(admin, compraid, mapearEstado(pago.status), String(pago.id));
    return new Response('ok', { status: 200 });
  } catch (error) {
    // Con un 500 Mercado Pago reintenta el aviso más tarde.
    return new Response(error instanceof Error ? error.message : 'error', { status: 500 });
  }
});
