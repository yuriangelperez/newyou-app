# language: es
# HU15 Chat del pedido · migración 24
# Tipos: [F] camino feliz · [N] negativo/alternativo · [L] caso límite

Característica: Chat entre comprador y vendedor del pedido
  Como comprador o vendedor de un pedido
  quiero escribirle a la otra parte desde el pedido
  para coordinar la entrega y dejar constancia si hay un reclamo

  @HU15 @TC-HU15-01 @F
  Escenario: Enviar y recibir mensajes en tiempo real
    Dado que compré una prenda
    Cuando toco "Escribir al vendedor" y envío "¿Cuándo despachás?"
    Entonces el vendedor ve el mensaje sin recargar y recibe una notificación

  @HU15 @TC-HU15-02 @F
  Escenario: Los cambios de estado aparecen en el chat
    Dado un pedido con chat abierto
    Cuando el vendedor lo marca como "enviado"
    Entonces el chat muestra un mensaje del sistema con el cambio

  @HU15 @TC-HU15-03 @F
  Escenario: Contador de no leídos
    Dado que tengo 3 mensajes nuevos de un pedido
    Cuando abro mis compras
    Entonces veo "Escribir al vendedor (3 sin leer)"
    Y al abrir el chat el contador vuelve a cero

  @HU15 @TC-HU15-04 @L
  Escenario: El chat se cierra 30 días después de terminado el pedido
    Dado un pedido entregado hace 31 días
    Cuando abro el chat
    Entonces puedo leer los mensajes pero no enviar nuevos

  @HU15 @TC-HU15-05 @N
  Escenario: Un tercero no puede leer el chat
    Dado un usuario que no es comprador ni vendedor del pedido
    Cuando consulta los mensajes por la API
    Entonces no recibe ningún mensaje
