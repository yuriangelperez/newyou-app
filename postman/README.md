# Pruebas de la API de mapas en Postman

La app usa [Nominatim de OpenStreetMap](https://nominatim.openstreetmap.org/) como fallback cuando `expo-location` no puede resolver una dirección:

- `GET /search`: geocodificación directa; convierte una dirección escrita en latitud y longitud.
- `GET /reverse`: geocodificación inversa; convierte las coordenadas del GPS en una dirección.

El enlace **Ver en el mapa** de la app abre Google Maps para que el usuario valide visualmente la dirección, pero no consume una API de Google.

## Importar y ejecutar

1. Importar `NewYou-OpenStreetMap.postman_collection.json` en Postman.
2. Importar `NewYou-OpenStreetMap.postman_environment.json` y seleccionarlo en el entorno activo.
3. Completar `contact_email` con un correo real del equipo. Nominatim solicita un `User-Agent` identificable y recomienda incluir un contacto.
4. Ajustar `address`, `latitude`, `longitude` y `language` según el caso de prueba.
5. Ejecutar las carpetas **Geocodificacion directa** y **Geocodificacion inversa**. La colección guarda automáticamente las coordenadas encontradas después de una búsqueda exitosa.

La política pública de Nominatim limita el uso intensivo y exige como máximo una solicitud por segundo. En el Runner de Postman usar un delay de al menos `1100 ms`, evitar ejecuciones concurrentes y no usar esta colección para pruebas de carga.

## Casos incluidos

- Dirección válida: espera `200`, una lista con al menos un resultado y campos `lat`/`lon`.
- Dirección inexistente: espera `200` con una lista vacía.
- Coordenadas válidas: espera `200` con `display_name` y `address`.
- Coordenadas fuera de rango: acepta `400` o `200` con un campo `error`, según la versión/configuración del servidor Nominatim.

Las variables y valores de prueba son públicos; no se incluyen tokens ni credenciales.
