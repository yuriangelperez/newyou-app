import { contieneDatosContacto } from '../utils/contacto';

describe('contieneDatosContacto', () => {
  it.each([
    'escribime a ana@mail.com',
    'mi cel 11 2345-6789',
    '1123456789',
    'mirá www.mitienda.com',
    'https://instagram.com/ana',
    'pasame tu whatsapp',
    'por wsp te mando fotos',
    'buscame en mitienda.com.ar',
  ])('detecta datos de contacto en "%s"', (texto) => {
    expect(contieneDatosContacto(texto)).toBe(true);
  });

  it.each([
    '¿Tenés talle M?',
    '¿Cuánto mide de largo? 70 cm',
    'Lo usé 2 veces, está impecable',
    '¿Hacés envíos a Pilar?',
  ])('deja pasar "%s"', (texto) => {
    expect(contieneDatosContacto(texto)).toBe(false);
  });
});
