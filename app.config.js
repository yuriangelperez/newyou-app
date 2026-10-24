// Configuración dinámica: toma app.json y agrega lo que depende de variables de entorno.
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...config.plugins,
    [
      'react-native-maps',
      {
        // Google Maps en Android (Clase 7, 7.5). La clave va en .env, nunca en el repo.
        androidGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
      },
    ],
  ],
});
