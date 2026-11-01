# language: es
# HU29 Compartir · publicación web en GitHub Pages · versionado automático
# Tipos: [F] camino feliz · [N] negativo/alternativo · [L] caso límite

Característica: Compartir prendas y tiendas, y versión web publicada
  Como comprador o vendedor
  quiero compartir una prenda o una tienda con un enlace que abra la web
  para recomendarla a otras personas aunque no tengan la app

  @HU29 @TC-HU29-01 @F
  Escenario: Compartir una prenda
    Dado que estoy en el detalle de "Campera QA" de $40.000 con 25% de descuento
    Cuando toco el ícono de compartir
    Entonces se abre el menú de compartir del celular con "Mirá Campera QA a $30.000 en New You:"
    Y el enlace https://yuriangelperez.github.io/newyou-app/producto/<id>

  @HU29 @TC-HU29-02 @F
  Escenario: Abrir un enlace compartido
    Dado que recibí el enlace de una prenda
    Cuando lo abro en el navegador con sesión iniciada
    Entonces veo el detalle de esa prenda en la versión web

  @HU29 @TC-HU29-03 @F
  Escenario: Compartir una tienda
    Dado que estoy en la tienda de una empresa
    Cuando toco el ícono de compartir
    Entonces el mensaje dice "Mirá la tienda <nombre> en New You:" con el enlace /tienda/<enlace>

  @HU29 @TC-HU29-04 @L
  Escenario: Navegador sin menú de compartir
    Dado que uso la web en un navegador sin navigator.share
    Cuando toco compartir
    Entonces el texto se copia al portapapeles y veo "Link copiado"

  @TC-DEP-01 @F
  Escenario: Publicación de main en GitHub Pages
    Dado que se mergeó un cambio en main
    Cuando terminan los workflows "Versión" y el deploy web
    Entonces https://yuriangelperez.github.io/newyou-app/ muestra la versión nueva
    Y al recargar en /producto/<id> se vuelve a la misma prenda

  @TC-DEP-02 @F
  Escenario: Publicación de testing
    Dado que se mergeó un cambio en testing
    Entonces https://yuriangelperez.github.io/newyou-app/testing/ muestra la versión de testing
    Y la versión de main no cambia

  @TC-VER-01 @F
  Escenario: Versionado automático en main
    Dado que la versión es 1.0.1
    Cuando se mergea un PR a main
    Entonces github-actions hace el commit "Versión 1.0.2" con app.json, package.json y package-lock.json
    Y crea la etiqueta v1.0.2
