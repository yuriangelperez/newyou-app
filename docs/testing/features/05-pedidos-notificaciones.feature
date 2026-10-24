# language: es
# Pedidos y notificaciones push (Clase 10)

Característica: Avisos de pedidos
  Como vendedor o comprador
  quiero recibir una notificación cuando entra o cambia un pedido
  para responder a tiempo

  @PUSH @TC-PUSH-01 @F
  Escenario: Activar notificaciones push
    Dado que estoy en un build de EAS en un celular real
    Cuando activo "Notificaciones push" en Ajustes y acepto el permiso
    Entonces el token de Expo queda guardado en push_tokens

  @PUSH @TC-PUSH-02 @F
  Escenario: Venta nueva
    Dado que soy un particular con notificaciones activas
    Cuando alguien compra una de mis prendas
    Entonces recibo "Nueva venta" y al tocarla se abre "Mis ventas"

  @PUSH @TC-PUSH-03 @F
  Escenario: Cambio de estado
    Dado que compré una prenda
    Cuando el vendedor marca el pedido como "enviado"
    Entonces recibo "Tu pedido cambió de estado"

  @PUSH @TC-PUSH-04 @N
  Escenario: Cerrar sesión
    Cuando cierro sesión
    Entonces el token se borra y el celular deja de recibir avisos de esa cuenta

  @PUSH @TC-PUSH-05 @L
  Escenario: Simulador o Expo Go
    Cuando activo las notificaciones en un simulador
    Entonces veo "Las notificaciones push sólo funcionan en un celular real."
    Y en Expo Go veo un aviso de error, porque no hay token push sin un build de EAS
