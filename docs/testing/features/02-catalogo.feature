# language: es
# HU03 Catálogo · HU04 Búsqueda, orden y filtros · HU05 Detalle · HU20 Agotado · HU28 Vistos y búsquedas recientes

Característica: Catálogo de prendas
  Como comprador
  quiero ver, buscar y filtrar las prendas publicadas
  para encontrar rápido lo que quiero comprar

  @HU03 @TC-HU03-01 @F
  Escenario: El catálogo carga desde Supabase
    Dado que hay prendas publicadas
    Cuando abro la app con sesión iniciada
    Entonces veo las prendas en una grilla con nombre, foto y precio

  @HU03 @TC-HU03-02 @N
  Escenario: Error de red al cargar
    Dado que el servidor no responde
    Cuando abro el catálogo
    Entonces veo un mensaje de error con el botón "Reintentar"

  @HU03 @TC-HU03-03 @L
  Esquema del escenario: Catálogo vacío según quién mira
    Dado que no hay prendas publicadas
    Y entré con una cuenta "<cuenta>"
    Entonces veo "No hay prendas disponibles"
    Y veo "<mensaje>"

    Ejemplos:
      | cuenta     | mensaje                                                       |
      | comprador  | Todavía no hay prendas publicadas. Volvé a mirar más tarde.   |
      | particular | Publicá una nueva prenda con el botón +.                      |

  @HU04 @TC-HU04-01 @F
  Escenario: Búsqueda por nombre
    Cuando escribo "campera" en el buscador
    Entonces sólo veo prendas cuyo nombre, descripción o categoría contienen "campera"

  @HU04 @TC-HU04-02 @L
  Escenario: Búsqueda sin resultados
    Cuando escribo "zzzz" en el buscador
    Entonces veo "No encontramos prendas"

  @HU04 @TC-HU04-03 @F
  Escenario: Filtro de promociones
    Cuando elijo la etiqueta "Promociones"
    Entonces sólo veo prendas con descuento

  @HU05 @TC-HU05-01 @F
  Escenario: Ver el detalle y marcar favorito
    Cuando toco una prenda
    Entonces veo sus fotos, talles, colores, precio y reputación
    Y al tocar el corazón queda en favoritos con una animación

  @HU20 @TC-HU20-01 @F
  Escenario: Prenda agotada
    Dada una prenda con stock 0
    Entonces la tarjeta se ve atenuada con el cartel "AGOTADO"
    Y el botón "Agregar" está deshabilitado

  @HU04 @TC-HU04-05 @F
  Escenario: Temporada y público en una sola fila deslizable
    Dado que estoy en el inicio
    Cuando toco "Invierno" y después "Femenino"
    Entonces sólo veo prendas de invierno para público femenino
    Cuando toco "Invierno" otra vez
    Entonces se desmarca y sigue el filtro "Femenino"
    Cuando toco "Todo"
    Entonces se limpian la temporada, el público y los demás filtros

  @HU04 @TC-HU04-06 @F
  Esquema del escenario: Ordenar por precio final
    Dado que hay prendas de $10.000, $30.000 y una de $50.000 con 50% de descuento
    Cuando abro "Ordenar y filtrar" y elijo "<orden>"
    Entonces veo las prendas en el orden "<resultado>"
    Y arriba de la grilla dice "3 prendas · <orden en minúscula>"

    Ejemplos:
      | orden        | resultado                 | orden en minúscula |
      | Menor precio | $10.000, $25.000, $30.000 | menor precio       |
      | Mayor precio | $30.000, $25.000, $10.000 | mayor precio       |

  @HU04 @TC-HU04-07 @F
  Escenario: Atajo de rango de precio
    Dado que hay prendas de $19.999, $20.000, $50.000 y $50.001
    Cuando elijo el atajo "$20.000 a $50.000"
    Entonces sólo veo las de $20.000 y $50.000
    Y los campos Mínimo y Máximo muestran "20.000" y "50.000"

  @HU04 @TC-HU04-08 @L
  Esquema del escenario: Rango de precio escrito a mano
    Cuando escribo "<minimo>" en Mínimo y "<maximo>" en Máximo
    Entonces <resultado>

    Ejemplos:
      | minimo | maximo | resultado                                                                       |
      | 30000  | 30000  | sólo veo prendas de $30.000                                                     |
      | 3a5.0  |        | el mínimo queda en 350 y no hay tope                                            |
      | 80000  | 20000  | veo "El mínimo es mayor que el máximo: se busca entre los dos igual."           |

  @HU04 @TC-HU04-09 @F
  Escenario: Filtrar por estado
    Cuando elijo el estado "Usado"
    Entonces sólo veo prendas usadas

  @HU04 @TC-HU04-10 @F
  Escenario: Talles en chips separados en prendas y calzado
    Cuando elijo el talle "M" en "Talle de prendas"
    Entonces sólo veo prendas con talle M
    Cuando elijo el talle "40" en "Talle de calzado"
    Entonces se desmarca "M" y sólo veo prendas con talle 40
    Cuando toco "40" otra vez
    Entonces el talle vuelve a "Todos"

  @HU04 @TC-HU04-11 @F
  Escenario: Cantidad de resultados y aviso de filtros activos
    Dado que apliqué un filtro que deja una sola prenda
    Entonces veo "1 prenda" y el enlace "Limpiar filtros"
    Y el botón de filtros muestra un punto

  @HU04 @TC-HU04-12 @F
  Escenario: Limpiar el panel de filtros
    Dado que tengo orden, precio, estado y talle elegidos
    Cuando toco "Limpiar" y después "Ver resultados"
    Entonces veo todo el catálogo en el orden "Destacados"

  @HU04 @TC-HU04-13 @N
  Escenario: Filtros sin coincidencias
    Cuando elijo filtros que no coinciden con ninguna prenda
    Entonces veo "No encontramos prendas" y "Probá con otra búsqueda o sacá algunos filtros."
    Cuando toco "Limpiar búsqueda y filtros"
    Entonces vuelvo a ver todas las prendas

  @HU04 @TC-HU04-14 @F
  Escenario: Ordenar y filtrar dentro de una categoría
    Dado que estoy en la categoría "Camperas"
    Cuando abro el panel y elijo "Mayor precio" y el atajo "$50.000 a $100.000"
    Entonces sólo veo camperas de ese rango, de la más cara a la más barata
    Cuando vuelvo a la lista de categorías
    Entonces los filtros se limpian

  @HU04 @TC-HU04-15 @L
  Escenario: Los accesorios no tienen filtro de talle
    Cuando abro una categoría del grupo "ACCESORIOS"
    Entonces no veo la fila "Talle"

  @HU28 @TC-HU28-01 @F
  Escenario: Vistos recientemente
    Cuando abro el detalle de las prendas A, B y C y vuelvo al inicio
    Entonces en "Vistos recientemente" veo C, B y A
    Cuando abro A otra vez
    Entonces la fila queda A, C y B sin repetidos
    Y mientras escribo en el buscador la sección no se ve

  @HU28 @TC-HU28-02 @L
  Escenario: Se guardan las 10 últimas prendas vistas
    Cuando abro 11 prendas distintas
    Entonces veo las 10 últimas
    Y después de cerrar y abrir la app siguen ahí

  @HU28 @TC-HU28-03 @F
  Escenario: Repetir una búsqueda reciente
    Dado que busqué "campera"
    Cuando toco el buscador vacío
    Entonces veo "Búsquedas recientes" con el chip "campera"
    Cuando lo toco
    Entonces se busca "campera" otra vez

  @HU28 @TC-HU28-04 @L
  Escenario: Límites del historial de búsqueda
    Cuando busco "a", "Campera", "campera", "jean", "buzo", "gorra", "remera" y "vestido"
    Entonces "a" no se guarda y "Campera" aparece una sola vez
    Y se ven las 6 búsquedas más nuevas
    Cuando toco "Borrar"
    Entonces la sección desaparece
