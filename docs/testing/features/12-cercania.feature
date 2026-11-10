# language: es
# HU33 Filtrar por cercanía · migración 25
# Tipos: [F] camino feliz · [N] negativo/alternativo · [L] caso límite

Característica: Prendas y tiendas cerca mío
  Como comprador
  quiero filtrar por distancia a mi ubicación
  para retirar en persona sin viajar lejos

  @HU33 @TC-HU33-01 @F
  Escenario: Filtrar a 5 km
    Dado que di permiso de ubicación
    Cuando elijo la cercanía "5 km" en los filtros
    Entonces sólo veo prendas con punto de retiro a 5 km o menos
    Y cada tarjeta muestra la distancia, ordenadas de la más cercana

  @HU33 @TC-HU33-02 @N
  Escenario: Sin permiso de ubicación
    Dado que rechacé el permiso de ubicación y no tengo direcciones guardadas
    Cuando elijo una cercanía
    Entonces veo que hace falta la ubicación o una dirección
    Y el filtro no se aplica

  @HU33 @TC-HU33-03 @L
  Esquema del escenario: Formato de la distancia
    Dada una prenda a <km> km
    Entonces la tarjeta muestra "<texto>"

    Ejemplos:
      | km   | texto      |
      | 0.03 | a 100 m    |
      | 0.37 | a 350 m    |
      | 2.04 | a 2 km     |
      | 12.6 | a 12,6 km  |
