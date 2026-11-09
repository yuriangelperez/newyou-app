# language: es
# HU32 Preguntas antes de comprar · migración 23
# Tipos: [F] camino feliz · [N] negativo/alternativo · [L] caso límite

Característica: Preguntas al vendedor antes de comprar
  Como comprador
  quiero preguntar sobre una prenda antes de comprarla
  para decidir con la información que falta en la publicación

  @HU32 @TC-HU32-01 @F
  Escenario: Preguntar y recibir respuesta
    Dado que estoy en el detalle de una prenda ajena
    Cuando escribo "¿Tiene alguna mancha?" y envío
    Entonces el vendedor recibe una notificación
    Y cuando responde, la respuesta aparece debajo de mi pregunta

  @HU32 @TC-HU32-02 @N
  Escenario: No se permiten datos de contacto
    Dado que estoy en el detalle de una prenda
    Cuando escribo "escribime al 11 5555-1234"
    Entonces veo "Por seguridad no se pueden compartir teléfonos, mails, redes ni links."
    Y la pregunta no se publica

  @HU32 @TC-HU32-03 @N
  Escenario: El vendedor no puede preguntarse a sí mismo
    Dado que estoy en el detalle de mi propia prenda
    Entonces no veo el campo para preguntar

  @HU32 @TC-HU32-04 @F
  Escenario: Aviso de preguntas sin responder
    Dado que tengo 2 preguntas sin responder
    Cuando abro "Mis publicaciones"
    Entonces la prenda muestra "2 preguntas sin responder"
