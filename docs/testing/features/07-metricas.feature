# language: es
# HU21 Modo empresa: métricas de ventas
# Tipos: [F] camino feliz · [N] negativo/alternativo · [L] caso límite

Característica: Métricas de ventas de la empresa
  Como propietario o administrador de una empresa
  quiero ver las ventas por período
  para saber cuándo y qué se vende

  @HU21 @TC-MET-01 @F
  Esquema del escenario: El gráfico se agrupa según el período
    Dado que estoy en Perfil > Métricas
    Cuando elijo "<periodo>"
    Entonces la leyenda del gráfico dice "<leyenda>"

    Ejemplos:
      | periodo     | leyenda                                  |
      | Hoy         | Ingresos por hora                        |
      | Esta semana | Ingresos por día                         |
      | Este mes    | Ingresos por semana (de lunes a domingo) |
      | Este año    | Ingresos por mes                         |

  @HU21 @TC-MET-02 @F
  Escenario: Rango personalizado con el calendario
    Cuando elijo "Personalizado" y toco "Desde"
    Y elijo el 01/10 en el calendario
    Entonces el calendario pasa a elegir "Hasta"
    Y los días posteriores a hoy no se pueden tocar
    Cuando elijo el 15/10 y toco "Ver rango"
    Entonces veo las métricas del 01/10 al 15/10

  @HU21 @TC-MET-03 @N
  Escenario: Rango de más de un año
    Cuando elijo del 01/01/2025 al 01/11/2026 y toco "Ver rango"
    Entonces veo "El rango puede ser de hasta un año."
