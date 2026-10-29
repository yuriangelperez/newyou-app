// Edge Function: manda al comprador un correo con el detalle de su compra (HU14).
//
// Sale por Gmail (SMTP) si están GMAIL_USUARIO y GMAIL_CLAVE; si no, por Resend.
//   supabase functions deploy enviar-correo-compra
//   supabase secrets set GMAIL_USUARIO=tu-cuenta@gmail.com GMAIL_CLAVE="abcd efgh ijkl mnop"
// GMAIL_CLAVE es una "contraseña de aplicación" de Google (no la contraseña de la cuenta):
// https://myaccount.google.com/apppasswords (pide tener la verificación en dos pasos activa).
// Gmail llega a cualquier destinatario. Resend sin dominio verificado (onboarding@resend.dev)
// sólo entrega a la dirección con la que se creó la cuenta de Resend.
//
// La app la llama después de confirmar_compra con { compraid }. Respeta el ajuste
// "Notificaciones por correo" del perfil y no manda dos veces la misma compra.
import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ItemCompra {
  nombre?: string;
  precio?: number;
  cantidad?: number;
  talle?: string;
  color?: string;
}

const pesos = (valor: number) => `$${Number(valor ?? 0).toLocaleString('es-AR')}`;
const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

function respuesta(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const gmailUsuario = Deno.env.get('GMAIL_USUARIO');
  const gmailClave = Deno.env.get('GMAIL_CLAVE');
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!(gmailUsuario && gmailClave) && !apiKey) {
    return respuesta({ enviado: false, motivo: 'Faltan GMAIL_USUARIO y GMAIL_CLAVE (o RESEND_API_KEY)' }, 200);
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const servicio = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Quién llama: el usuario de la sesión (su JWT viene en Authorization).
  const usuario = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: auth } = await usuario.auth.getUser();
  if (!auth?.user) return respuesta({ enviado: false, motivo: 'Sesión requerida' }, 401);

  const { compraid } = await req.json().catch(() => ({ compraid: null }));
  if (!compraid) return respuesta({ enviado: false, motivo: 'Falta compraid' }, 400);

  const admin = createClient(url, servicio);
  const { data: compra, error: errorCompra } = await admin
    .from('compras')
    .select('compraid, numero_orden, usuario_id, entrega, metodo_pago, direccion_entrega, subtotal_original, descuentos, envio, comision, interes_cuotas, cuotas, total, items, correo_enviado_at, estado_pago')
    .eq('compraid', compraid)
    .eq('usuario_id', auth.user.id)
    .maybeSingle();
  // Un error acá suele ser una columna que falta: correr 19-pagos-mercadopago.sql.
  if (errorCompra) return respuesta({ enviado: false, motivo: `Error al leer la compra: ${errorCompra.message}` }, 500);
  if (!compra) return respuesta({ enviado: false, motivo: 'Compra no encontrada' }, 404);
  if (compra.correo_enviado_at) return respuesta({ enviado: false, motivo: 'Ya enviado' });
  // Con Mercado Pago el correo sale recién cuando el pago está aprobado.
  if (compra.estado_pago && !['aprobado', 'no_aplica'].includes(compra.estado_pago)) {
    return respuesta({ enviado: false, motivo: 'Pago no acreditado' });
  }

  const { data: perfil } = await admin
    .from('profiles')
    .select('username, email, notif_correo')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (perfil?.notif_correo === false) return respuesta({ enviado: false, motivo: 'Desactivado por el usuario' });

  const destino = perfil?.email ?? auth.user.email;
  if (!destino) return respuesta({ enviado: false, motivo: 'Sin correo' }, 400);

  const items = (compra.items ?? []) as ItemCompra[];
  const filas = items
    .map(
      (item) => `<tr>
        <td style="padding:6px 0">${escapar(item.nombre ?? 'Prenda')}<br>
          <small style="color:#64748B">${[item.talle && `Talle ${escapar(item.talle)}`, item.color && escapar(item.color)].filter(Boolean).join(' · ')}</small></td>
        <td style="padding:6px 0;text-align:center">x${item.cantidad ?? 1}</td>
        <td style="padding:6px 0;text-align:right">${pesos((item.precio ?? 0) * (item.cantidad ?? 1))}</td>
      </tr>`,
    )
    .join('');
  const esDomicilio = compra.entrega === 'domicilio';
  const html = `<div style="font-family:Arial,sans-serif;color:#152238;max-width:520px;margin:auto">
    <h2 style="color:#493628">¡Gracias por tu compra${perfil?.username ? `, ${escapar(perfil.username)}` : ''}!</h2>
    <p>Tu pedido <b>Orden #${compra.numero_orden}</b> quedó registrado.</p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #E5E5E5">${filas}</table>
    <p style="border-top:1px solid #E5E5E5;padding-top:8px">
      Descuentos: -${pesos(compra.descuentos)}<br>
      Envío: ${Number(compra.envio) === 0 ? 'GRATIS' : pesos(compra.envio)}<br>
      ${Number(compra.comision) > 0 ? `Comisión tarjeta de crédito: ${pesos(compra.comision)}<br>` : ''}
      ${Number(compra.interes_cuotas) > 0 ? `Interés por ${compra.cuotas} cuotas (total): ${pesos(compra.interes_cuotas)}<br>Pagás ${compra.cuotas} cuotas de ${pesos(Math.round(Number(compra.total) / Number(compra.cuotas)))}<br>` : ''}
      <b>Total: ${pesos(compra.total)}</b>
    </p>
    <p><b>${esDomicilio ? 'Envío a domicilio' : 'Retiro en el local'}</b><br>
      ${esDomicilio ? 'Entregar en' : 'Retirar en'}: ${escapar(compra.direccion_entrega ?? 'a confirmar con el vendedor')}<br>
      Medio de pago: ${escapar(compra.metodo_pago ?? '')} (${compra.estado_pago !== 'aprobado' ? 'se paga al recibir' : compra.metodo_pago === 'Mercado Pago' ? 'pagado con Mercado Pago' : 'pagado con tarjeta'})</p>
    <p style="color:#64748B;font-size:12px">Podés seguir el pedido en la app, en Perfil &gt; Mis compras.</p>
  </div>`;

  const asunto = `New You · Compra confirmada · Orden #${compra.numero_orden}`;

  if (gmailUsuario && gmailClave) {
    // Puerto 465 (SSL): Supabase bloquea las conexiones salientes a 25 y 587.
    const transporte = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: gmailUsuario, pass: gmailClave.replace(/\s/g, '') },
    });
    try {
      await transporte.sendMail({ from: `New You <${gmailUsuario}>`, to: destino, subject: asunto, html });
    } catch (error) {
      return respuesta({ enviado: false, motivo: `Gmail respondió: ${error instanceof Error ? error.message : error}` }, 502);
    }
  } else {
    const envio = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('CORREO_REMITENTE') ?? 'New You <onboarding@resend.dev>',
        to: [destino],
        subject: asunto,
        html,
      }),
    });

    if (!envio.ok) {
      return respuesta({ enviado: false, motivo: `Resend respondió ${envio.status}: ${await envio.text()}` }, 502);
    }
  }

  await admin.from('compras').update({ correo_enviado_at: new Date().toISOString() }).eq('compraid', compra.compraid);
  return respuesta({ enviado: true });
});
