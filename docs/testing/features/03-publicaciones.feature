# language: es
# HU06 Publicación particular · HU07 Tienda y stock · HU08 Gestión · Clase 7 (hardware)

Característica: Publicar y gestionar prendas
  Como vendedor particular o de una tienda
  quiero publicar prendas con fotos y administrarlas
  para venderlas en la app

  @HU06 @TC-HU06-01 @F
  Escenario: Publicar con foto de la cámara
    Dado que soy vendedor
    Cuando completo nombre, precio, stock y categoría
    Y saco una foto con la cámara
    Entonces la foto se sube a Storage antes de crear la prenda
    Y veo el detalle de la prenda publicada

  @HU06 @TC-HU06-02 @N
  Esquema del escenario: Datos inválidos
    Cuando cargo "<campo>" con "<valor>"
    Entonces veo "<mensaje>" y no se publica

    Ejemplos:
      | campo  | valor | mensaje                          |
      | precio | 0     | El precio debe ser mayor a 0.    |
      | stock  | -1    | El stock no puede ser negativo.  |
      | nombre | ab    | El nombre debe tener al menos 3 caracteres. |

  @HU06 @TC-HU06-03 @L
  Escenario: Límite de imágenes
    Cuando intento agregar una sexta imagen
    Entonces la app no lo permite

  @HU06 @TC-HW-01 @N
  Escenario: Permiso de cámara denegado para siempre
    Dado que denegué la cámara y el sistema ya no vuelve a preguntar
    Cuando toco "Sacar foto"
    Entonces la app ofrece "Ir a Ajustes"

  @HU06 @TC-HW-02 @F
  Escenario: Recordatorio local al publicar
    Cuando publico una prenda y acepto las notificaciones
    Entonces se programa un recordatorio para el día siguiente
    Y si borro la prenda antes, el recordatorio se cancela

  @HU08 @TC-HU08-01 @F
  Escenario: Borrar deslizando
    Dado que estoy en "Mis publicaciones"
    Cuando deslizo una prenda hacia la izquierda y confirmo
    Entonces la prenda se borra

  @HU08 @TC-HU08-02 @N
  Escenario: Otro vendedor no puede editar mi prenda
    Dado que soy otro vendedor
    Cuando intento actualizar la prenda por la API
    Entonces RLS rechaza el cambio
