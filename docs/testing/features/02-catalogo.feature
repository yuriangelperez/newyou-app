# language: es
# HU03 Catálogo · HU04 Búsqueda y filtros · HU05 Detalle · HU20 Agotado

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
  Escenario: Catálogo vacío
    Dado que no hay prendas publicadas
    Entonces veo "No hay prendas disponibles"

  @HU04 @TC-HU04-01 @F
  Escenario: Búsqueda por nombre
    Cuando escribo "campera" en el buscador
    Entonces sólo veo prendas cuyo nombre, descripción o categoría contienen "campera"

  @HU04 @TC-HU04-02 @L
  Escenario: Búsqueda sin resultados
    Cuando escribo "zzzz" en el buscador
    Entonces veo el estado vacío

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
