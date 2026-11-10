# language: es
# HU35 Reclamos con cargo al vendedor · HU36 Liquidaciones semanales y datos bancarios · migración 27
# Tipos: [F] camino feliz · [N] negativo/alternativo · [L] caso límite

Característica: Reclamos, liquidaciones semanales y datos bancarios
  Como New You
  quiero pagar cada lunes a los vendedores descontando comisiones y cargos por reclamos
  para que el vendedor responda por el envío y por lo que publica

  @HU36 @TC-HU36-01 @F
  Escenario: Cargar los datos bancarios
    Dado que soy vendedor
    Cuando cargo titular, CUIT y un CBU válido en "Datos bancarios"
    Entonces "Mis cobros" muestra la cuenta enmascarada

  @HU36 @TC-HU36-02 @N
  Esquema del escenario: Datos bancarios inválidos
    Cuando cargo el CBU "<cbu>" y el CUIT "<cuit>"
    Entonces veo "<error>"

    Ejemplos:
      | cbu                    | cuit        | error                                            |
      | 2850590940090418135209 | 20111111112 | El CBU/CVU no es válido. Revisá los 22 números.  |
      | 28505909               | 20111111112 | El CBU/CVU no es válido. Revisá los 22 números.  |
      | 2850590940090418135201 | 20111111113 | El CUIT/CUIL no es válido.                       |

  @HU36 @TC-HU36-03 @L
  Escenario: Cambiar el CBU retiene el pago 48 horas
    Dado que cambié mi CBU hoy
    Cuando el admin genera las liquidaciones
    Entonces mi liquidación queda "Retenida" con el motivo "Cambió el CBU hace menos de 48 horas."

  @HU36 @TC-HU36-04 @F
  Escenario: Generar la liquidación de la semana
    Dado que la semana pasada vendí 10.000 pesos con tarjeta y 5.000 en efectivo
    Cuando el admin toca "Generar liquidaciones"
    Entonces mi neto es 10.000 − 1.000 de comisión − 500 de comisión del efectivo = 8.500
    Y volver a generar no duplica los pedidos ya liquidados

  @HU36 @TC-HU36-05 @F
  Escenario: Registrar la transferencia
    Dado una liquidación "A pagar"
    Cuando el admin carga el comprobante y toca "Marcar pagada"
    Entonces el vendedor la ve "Pagada" con la fecha y el comprobante

  @HU35 @TC-HU35-01 @F
  Escenario: Abrir un reclamo sobre un pedido entregado
    Dado un pedido entregado hace 2 días
    Cuando toco "Tengo un problema", elijo "Es distinto a lo publicado" y describo el problema
    Entonces el reclamo queda "en revisión" y aparece en el chat del pedido

  @HU35 @TC-HU35-02 @N
  Escenario: Reclamo fuera de plazo
    Dado un pedido entregado hace 11 días
    Cuando intento abrir un reclamo
    Entonces veo que el plazo de 10 días ya venció

  @HU35 @TC-HU35-03 @F
  Escenario: Reclamo a favor del comprador genera cargos al vendedor
    Dado un reclamo abierto sobre un pedido de 20.000 pesos pagado con Mercado Pago
    Cuando el admin lo resuelve a favor del comprador
    Entonces se le cargan al vendedor 2.000 de penalidad y 20.000 de reintegro
    Y se descuentan en su próxima liquidación

  @HU35 @TC-HU35-04 @L
  Escenario: Saldo negativo
    Dado que los cargos superan mis ventas de la semana
    Cuando se genera la liquidación
    Entonces queda "Saldo negativo" y se descuenta de la semana siguiente
