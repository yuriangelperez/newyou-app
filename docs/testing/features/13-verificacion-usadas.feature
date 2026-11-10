# language: es
# HU34 Verificación de prendas usadas · migración 26
# Tipos: [F] camino feliz · [N] negativo/alternativo · [L] caso límite

Característica: Verificación de prendas usadas
  Como New You
  quiero que el personal revise cada prenda usada antes de venderse
  para evitar fotos falsas o generadas con IA y prendas en mal estado

  @HU34 @TC-HU34-01 @F
  Escenario: Publicar una usada y subir la foto con el código
    Dado que publico una prenda en estado "usado"
    Entonces queda "En verificación" con un código de 4 números
    Cuando subo una foto de la prenda con el código escrito a mano
    Entonces aparece en el panel de admin, sección "Verificaciones"

  @HU34 @TC-HU34-02 @F
  Escenario: El admin aprueba la prenda
    Dado una prenda en verificación con su foto
    Cuando el admin la aprueba
    Entonces el vendedor recibe una notificación
    Y la prenda aparece en el catálogo con el sello "Verificada por New You"

  @HU34 @TC-HU34-03 @N
  Escenario: El admin la rechaza
    Cuando el admin la rechaza con el motivo "La foto parece editada"
    Entonces el vendedor ve el motivo en "Mis publicaciones"
    Y la prenda no aparece en el catálogo

  @HU34 @TC-HU34-04 @N
  Escenario: No se puede comprar una usada sin verificar
    Dado una prenda usada en verificación
    Cuando alguien abre su enlace
    Entonces los botones de compra están deshabilitados
    Y la base rechaza agregarla a un pedido por la API

  @HU34 @TC-HU34-05 @L
  Escenario: Vence el plazo de verificación
    Dado una prenda publicada hace más de 3 días hábiles sin la foto con el código
    Entonces el panel de admin marca su plazo como vencido
    Y la prenda sigue sin poder comprarse hasta que se apruebe

  @HU34 @TC-HU34-06 @L
  Escenario: Cambiar las fotos reinicia la verificación
    Dado una prenda usada ya verificada
    Cuando el vendedor cambia sus fotos
    Entonces vuelve a "En verificación" con un código nuevo
