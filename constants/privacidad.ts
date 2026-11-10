/**
 * Política de privacidad de New You (Ley 25.326 de Protección de Datos Personales, Argentina).
 * Describe sólo los datos que la app guarda de verdad; si se agrega uno nuevo, sumarlo acá
 * y subir VERSION_PRIVACIDAD.
 */
export const VERSION_PRIVACIDAD = '2026-11-09';

/** Correo para ejercer los derechos sobre los datos. Reemplazar por el definitivo. */
export const CONTACTO_PRIVACIDAD = 'privacidad@newyou.com.ar';

export interface SeccionPrivacidad {
  titulo: string;
  texto: string;
}

export const SECCIONES_PRIVACIDAD: SeccionPrivacidad[] = [
  {
    titulo: '1. Quién es responsable de tus datos',
    texto:
      'New You es responsable de la base de datos donde se guarda la información de los usuarios de la app. La base está alojada en Supabase, un proveedor de infraestructura que sólo la procesa por cuenta de New You.',
  },
  {
    titulo: '2. Qué datos guardamos',
    texto:
      '• Cuenta: correo, nombre de usuario, foto de perfil y la versión de los términos que aceptaste.\n' +
      '• Compras y ventas: pedidos, direcciones de entrega, estado de los envíos, calificaciones y reclamos.\n' +
      '• Mensajes: las preguntas públicas en las publicaciones y el chat de cada pedido.\n' +
      '• Publicaciones: fotos y datos de las prendas, y la foto con el código de verificación de las usadas.\n' +
      '• Vendedores: titular, CUIT/CUIL, CBU/CVU, alias y banco o billetera para pagarte las liquidaciones.\n' +
      '• Empresas: razón social, CUIT, sedes y los miembros con su rol.\n' +
      '• Dispositivo: el token para enviarte notificaciones.',
  },
  {
    titulo: '3. Pagos con tarjeta y Mercado Pago',
    texto:
      'New You nunca guarda el número completo de tu tarjeta ni el código de seguridad: sólo la marca y los últimos 4 dígitos para que identifiques el pago. Los pagos con Mercado Pago los procesa Mercado Pago con su propia política de privacidad.',
  },
  {
    titulo: '4. Ubicación',
    texto:
      'Si das permiso, la app usa tu ubicación para buscar direcciones en el mapa y para mostrarte prendas cerca tuyo. Tu ubicación en tiempo real no se guarda: sólo guardamos las coordenadas de las direcciones y sedes que vos cargás, para calcular distancias. Podés quitar el permiso en cualquier momento desde los ajustes del teléfono.',
  },
  {
    titulo: '5. Para qué usamos los datos',
    texto:
      'Para que puedas comprar y vender, coordinar la entrega, avisarte por notificación o correo de tus pedidos, verificar las prendas usadas, resolver reclamos y pagar a los vendedores. No vendemos tus datos ni los usamos para publicidad de terceros.',
  },
  {
    titulo: '6. Quién ve tus datos',
    texto:
      '• El vendedor ve el nombre y la dirección de entrega del comprador sólo de los pedidos que le hizo.\n' +
      '• El comprador ve los datos de retiro de la tienda.\n' +
      '• Las preguntas y respuestas de una publicación son públicas; el chat del pedido sólo lo ven comprador, vendedor y, si hay un reclamo, el personal de New You.\n' +
      '• Los datos bancarios sólo los ven su dueño y el personal de New You que hace las transferencias.\n' +
      '• Mercado Pago y el servicio de correo reciben sólo lo necesario para cobrar y enviarte el comprobante.',
  },
  {
    titulo: '7. Cuánto tiempo los guardamos',
    texto:
      'Mientras tengas la cuenta. Los pedidos, pagos, liquidaciones y reclamos se conservan el tiempo que exigen las normas contables e impositivas aunque cierres la cuenta.',
  },
  {
    titulo: '8. Seguridad',
    texto:
      'Las conexiones van cifradas, la sesión se guarda de forma segura en el teléfono y cada usuario sólo puede leer y modificar sus propios datos (reglas de acceso en la base). Si cambiás tu CBU frenamos los pagos 48 horas para evitar desvíos.',
  },
  {
    titulo: '9. Tus derechos',
    texto: `Podés pedir acceder a tus datos, corregirlos o eliminarlos escribiendo a ${CONTACTO_PRIVACIDAD}. Respondemos el pedido de acceso en 10 días corridos y el de corrección o eliminación en 5 días hábiles, como indica la Ley 25.326. Si no quedás conforme podés reclamar ante la Agencia de Acceso a la Información Pública (AAIP), autoridad de control de la ley.`,
  },
  {
    titulo: '10. Menores',
    texto: 'La app es para mayores de 18 años. Si detectamos una cuenta de un menor, la damos de baja.',
  },
  {
    titulo: '11. Cambios en esta política',
    texto:
      'Si cambiamos algo importante te avisamos en la app. La fecha de la versión vigente figura arriba de todo.',
  },
];
