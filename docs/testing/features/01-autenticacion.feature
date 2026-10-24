# language: es
# HU01 Registro · HU02 Login · Clase 8 (sesión segura)
# Tipos: [F] camino feliz · [N] negativo/alternativo · [L] caso límite

Característica: Registro e inicio de sesión
  Como comprador o vendedor
  quiero crear una cuenta e ingresar con mi correo
  para comprar y publicar prendas con mis datos protegidos

  @HU01 @TC-HU01-01 @F
  Escenario: Registro con datos válidos
    Dado que estoy en la pantalla de registro
    Cuando completo correo "ana@prueba.com", usuario "ana" y contraseña "Clave123" dos veces
    Y elijo "Sí, quiero vender"
    Entonces la cuenta se crea con el rol "particular"
    Y vuelvo a la pantalla de login

  @HU01 @TC-HU01-02 @N
  Escenario: Las contraseñas no coinciden
    Dado que estoy en la pantalla de registro
    Cuando escribo "Clave123" como contraseña y "Clave124" al repetirla
    Entonces veo "Las contraseñas no coinciden"
    Y no se envía nada al servidor

  @HU01 @TC-HU01-03 @L
  Esquema del escenario: Contraseña en el límite de las reglas
    Dado que estoy en la pantalla de registro
    Cuando escribo la contraseña "<contrasena>" en ambos campos
    Entonces veo "<resultado>"

    Ejemplos:
      | contrasena | resultado                                       |
      | Cla1       | La contraseña debe tener al menos 6 caracteres  |
      | Clave1     | la cuenta se crea                               |
      | clave123   | La contraseña necesita una mayúscula            |
      | Claveabc   | La contraseña necesita un número                |

  @HU02 @TC-HU02-01 @F
  Escenario: Login correcto
    Dado una cuenta registrada "ana@prueba.com" con contraseña "Clave123"
    Cuando ingreso esas credenciales y toco "LOGIN"
    Entonces veo el catálogo
    Y no puedo volver al login con el botón atrás

  @HU02 @TC-HU02-02 @N
  Escenario: Credenciales inválidas
    Cuando ingreso "noexiste@prueba.com" y "ClaveIncorrecta1"
    Entonces veo el error que devuelve Supabase
    Y sigo en la pantalla de login

  @HU02 @TC-HU02-03 @N
  Escenario: Correo con formato inválido
    Cuando ingreso "ana" como correo
    Entonces veo "Ingresá un correo válido" sin llamar al servidor

  @HU02 @TC-SES-01 @F
  Escenario: La sesión queda cifrada en el dispositivo
    Dado que inicié sesión en un celular
    Cuando cierro la app y la vuelvo a abrir
    Entonces sigo con la sesión iniciada
    Y el JWT está en SecureStore y no en AsyncStorage

  @HU02 @TC-SES-02 @L
  Escenario: Token vencido
    Dado que mi access token venció
    Cuando la app hace un pedido y Supabase responde 401
    Entonces la app renueva el token una vez y repite el pedido
    Pero si no puede renovarlo, cierra la sesión y me lleva al login

  @HU02 @TC-SES-03 @N
  Escenario: Ruta protegida sin sesión
    Dado que no inicié sesión
    Cuando abro un enlace a "/carrito"
    Entonces la app me redirige al login
