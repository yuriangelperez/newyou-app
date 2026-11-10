/**
 * Términos y condiciones de New You. Al cambiar el texto, subir VERSION_TERMINOS:
 * la app vuelve a pedir que se acepten (se guarda qué versión aceptó cada usuario).
 */
export const VERSION_TERMINOS = '2026-11-09';

export type TipoTerminos = 'comprador' | 'vendedor';

export interface SeccionTerminos {
  titulo: string;
  texto: string;
  /** Secciones que aplican sobre todo a quien vende (se resaltan al aceptar como vendedor). */
  vendedor?: boolean;
}

export const SECCIONES_TERMINOS: SeccionTerminos[] = [
  {
    titulo: '1. Qué es New You',
    texto:
      'New You es una plataforma que conecta a personas y empresas que venden ropa ("Vendedores") con personas que la compran ("Compradores"). New You no es dueña de las prendas publicadas, no las fabrica, no las almacena y no las envía.',
  },
  {
    titulo: '2. Cuentas',
    texto:
      'Para comprar o vender hay que registrarse con datos reales y ser mayor de 18 años. Cada usuario es responsable de lo que se haga con su cuenta. New You puede suspender cuentas que incumplan estos términos.',
  },
  {
    titulo: '3. Publicaciones',
    vendedor: true,
    texto:
      'El Vendedor garantiza que es dueño de la prenda o está autorizado a venderla, que la descripción, el talle, el estado y las fotos son reales y actuales, y que las fotos no fueron generadas ni alteradas con inteligencia artificial u otras herramientas para ocultar defectos. Está prohibido publicar falsificaciones, prendas robadas o productos que no sean indumentaria o accesorios.',
  },
  {
    titulo: '4. Prendas usadas y verificación',
    vendedor: true,
    texto:
      'Toda prenda usada pasa por una revisión de New You antes de poder venderse, en un plazo de hasta 72 horas hábiles. La revisión se hace sobre las fotos y datos que envía el Vendedor y no garantiza el estado físico de la prenda, que sigue siendo responsabilidad del Vendedor. New You puede rechazar una publicación indicando el motivo.',
  },
  {
    titulo: '5. Precios y pagos',
    texto:
      'El precio lo fija el Vendedor. Los pagos con tarjeta incluyen la comisión y el interés por cuotas que se muestran antes de confirmar. El pago en efectivo solo está disponible para retiro en el local; las compras con envío a domicilio se pagan con tarjeta o Mercado Pago.',
  },
  {
    titulo: '6. Envíos',
    vendedor: true,
    texto:
      'El envío corre 100% por cuenta y responsabilidad del Vendedor: el embalaje, la elección del correo o transporte, el despacho en el plazo indicado y la entrega en la dirección del Comprador. Si la prenda se pierde, llega dañada, llega tarde o no llega, el Vendedor debe resolverlo a su cargo, reenviando la prenda o devolviendo el dinero, incluido el costo de envío.',
  },
  {
    titulo: '7. Reclamos del Comprador',
    texto:
      'El Comprador puede iniciar un reclamo desde "Mis compras" dentro de los 10 días corridos desde que recibió la prenda, si no llegó, si es distinta a la publicada o si tiene defectos no informados. El Vendedor tiene 48 horas para responder. Si no hay acuerdo, New You revisa la conversación, las fotos y el historial del pedido y decide.',
  },
  {
    titulo: '8. Cargos al Vendedor y liquidaciones',
    vendedor: true,
    texto:
      'New You cobra los pagos con tarjeta y Mercado Pago y le paga al Vendedor una vez por semana lo cobrado por sus ventas, menos las comisiones y los cargos de esa semana, en la cuenta bancaria que el Vendedor haya cargado. Si un reclamo se resuelve a favor del Comprador, el Vendedor asume el reintegro y New You puede aplicarle un cargo administrativo del 10% del valor del pedido. Si los cargos superan lo cobrado, la diferencia se descuenta en las liquidaciones siguientes. Los reclamos aceptados se reflejan en la reputación del Vendedor y su repetición puede llevar a la suspensión.',
  },
  {
    titulo: '9. Indemnidad',
    vendedor: true,
    texto:
      'El Vendedor se obliga a mantener indemne a New You frente a cualquier reclamo, multa o gasto que surja de sus prendas, sus publicaciones o sus envíos, y a reintegrarle lo que New You tenga que pagar por esos motivos.',
  },
  {
    titulo: '10. Derecho de arrepentimiento',
    texto:
      'El Comprador puede arrepentirse de una compra dentro de los 10 días corridos desde que recibe la prenda, sin dar motivos (art. 34 de la Ley 24.240). La prenda debe devolverse en el estado en que se recibió. El costo de la devolución queda a cargo del Vendedor.',
  },
  {
    titulo: '11. De qué sí se hace responsable New You',
    texto:
      'New You responde por: el funcionamiento de la plataforma y la seguridad de las cuentas; la protección de los datos personales según la Ley 25.326; que los pagos con tarjeta o Mercado Pago se procesen por el monto mostrado; pagarle al Vendedor sus liquidaciones semanales; cumplir el plazo y el criterio de la verificación de prendas usadas; atender y resolver los reclamos en los plazos de estos términos; y suspender a los Vendedores que incumplan. New You no responde por el estado de las prendas ni por los envíos, sin perjuicio de los derechos que la ley le reconoce al Comprador.',
  },
  {
    titulo: '12. Comunicación entre usuarios',
    texto:
      'Las preguntas y el chat deben usarse solo para la compra. Está prohibido compartir datos de contacto para cerrar la venta fuera de New You, insultar o acosar. New You puede revisar conversaciones cuando hay un reclamo o una denuncia.',
  },
  {
    titulo: '13. Cambios',
    texto:
      'New You puede modificar estos términos avisando en la app con 15 días de anticipación. Para seguir usando la app habrá que aceptar la versión nueva.',
  },
  {
    titulo: '14. Ley y jurisdicción',
    texto:
      'Se aplican las leyes de la República Argentina. Para el Comprador, son competentes los tribunales de su domicilio.',
  },
];
