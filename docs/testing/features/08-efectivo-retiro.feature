# language: es
# HU30 Efectivo sólo para retiro en persona · migración 21
# Tipos: [F] camino feliz · [N] negativo/alternativo · [L] caso límite

Característica: Efectivo sólo con retiro en persona
  Como New You
  quiero que el efectivo se use sólo cuando el comprador retira la prenda
  para que ningún envío quede sin cobrar

  @HU30 @TC-HU30-01 @F
  Escenario: Pagar en efectivo al retirar
    Dado que tengo una prenda en el carrito
    Cuando elijo "Retiro en persona" y el medio "Efectivo"
    Y confirmo la compra
    Entonces el pedido se crea con medio "Efectivo"

  @HU30 @TC-HU30-02 @N
  Escenario: El efectivo se deshabilita con envío a domicilio
    Dado que elegí "Efectivo" con retiro en persona
    Cuando cambio la entrega a "Envío a domicilio"
    Entonces el medio pasa a "Mercado Pago"
    Y veo el aviso de que el efectivo es sólo para retiro
    Y la opción "Efectivo" queda deshabilitada

  @HU30 @TC-HU30-03 @N
  Escenario: La base rechaza efectivo con envío aunque se saltee la app
    Dado un cliente que llama directo a la API
    Cuando inserta una compra con medio "Efectivo" y entrega "domicilio"
    Entonces la base responde con error y no se crea el pedido
