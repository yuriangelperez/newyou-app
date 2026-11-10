# language: es
# HU31 Términos y condiciones · migración 22
# Tipos: [F] camino feliz · [N] negativo/alternativo · [L] caso límite

Característica: Términos y condiciones explícitos
  Como New You
  quiero que compradores y vendedores acepten los términos vigentes
  para dejar claro que el envío y los reclamos son responsabilidad del vendedor

  @HU31 @TC-HU31-01 @N
  Escenario: No se puede registrar sin aceptar los términos
    Dado que estoy en la pantalla de registro con datos válidos
    Cuando no marco "Acepto los términos y condiciones"
    Entonces veo un error en esa casilla
    Y no se crea la cuenta

  @HU31 @TC-HU31-02 @F
  Escenario: Aceptar los términos de vendedor antes de publicar
    Dado que soy comprador y nunca acepté los términos de vendedor
    Cuando entro a "Publicar prenda"
    Entonces se abren los términos con la casilla de aceptación
    Y al aceptarlos puedo publicar

  @HU31 @TC-HU31-03 @F
  Escenario: Leer los términos desde Ajustes
    Dado que ya tengo cuenta e inicié sesión
    Entonces no se me muestran los términos al entrar
    Y cuando toco "Términos y condiciones" en Ajustes los puedo leer

  @HU31 @TC-HU31-04 @N
  Escenario: La base no deja publicar sin términos de vendedor
    Dado un usuario sin aceptación de términos de vendedor
    Cuando inserta un producto por la API
    Entonces la base responde con error
