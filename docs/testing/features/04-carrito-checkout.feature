# language: es
# HU09 Agregar · HU10 Modificar · HU11–HU14 Checkout

Característica: Carrito y compra
  Como comprador
  quiero armar un carrito y confirmar la compra
  para recibir o retirar mis prendas

  @HU09 @TC-HU09-01 @F
  Escenario: Agregar una prenda
    Cuando toco "Agregar" en una prenda con stock
    Entonces el contador del carrito suma 1

  @HU09 @TC-HU09-02 @L
  Escenario: No superar el stock
    Dada una prenda con stock 1 en el carrito
    Cuando la agrego otra vez
    Entonces la cantidad sigue en 1

  @HU10 @TC-HU10-01 @F
  Escenario: Cambiar cantidades
    Cuando toco "+" y después "-"
    Entonces la cantidad y el total se actualizan
    Y al llegar a 0 la prenda sale del carrito

  @HU11 @TC-HU11-01 @F
  Escenario: Retiro en el local
    Cuando elijo "Retiro en el local"
    Entonces el envío es gratis

  @HU12 @TC-HU12-01 @F
  Escenario: Elegir medio de pago
    Cuando elijo "EFECTIVO"
    Entonces queda seleccionado

  @HU13 @TC-HU13-01 @F
  Escenario: Resumen con descuento
    Dada una prenda de $20.000 con 10 % de descuento
    Entonces el resumen muestra $18.000

  @HU14 @TC-HU14-01 @F
  Escenario: Confirmar la compra
    Cuando toco "Confirmar"
    Entonces veo "Compra confirmada" con el número de orden
    Y el stock se descuenta

  @HU14 @TC-HU14-02 @L
  Escenario: Doble toque o reintento (idempotencia)
    Cuando la misma confirmación llega dos veces con la misma operation_key
    Entonces se registra una sola compra

  @HU16 @TC-HU16-01 @N
  Escenario: Sin conexión
    Dado que no tengo red
    Cuando publico una prenda
    Entonces queda en borradores y se sube al volver la red
