import AsyncStorage from '@react-native-async-storage/async-storage';

import { cuitValido, formatearCuit, Membresia, mensajeInvitacion } from '../services/empresasService';
import { puede, selectEmpresaActiva, selectEsPropietario, useEmpresaStore } from '../stores/useEmpresaStore';

jest.mock('../services/supabase', () => ({ supabase: {} }));
jest.mock('expo-linking', () => ({
  createURL: (ruta: string, { queryParams }: { queryParams: Record<string, string> }) =>
    `newyou://${ruta}?codigo=${queryParams.codigo}`,
}));

const mockObtenerMisEmpresas = jest.fn();
jest.mock('../services/empresasService', () => ({
  ...jest.requireActual('../services/empresasService'),
  obtenerMisEmpresas: () => mockObtenerMisEmpresas(),
}));

const vendedora: Membresia = {
  empresaId: 7,
  nombre: 'Moda Sur',
  slug: 'moda-sur',
  estado: 'verificada',
  rol: 'vendedor',
  todasLasSedes: false,
  sedesPermitidas: [2],
  permisos: ['productos.publicar', 'stock.editar', 'pedidos.ver', 'pedidos.estado'],
};

describe('cuitValido', () => {
  it('acepta un CUIT con dígito verificador correcto, con o sin guiones', () => {
    expect(cuitValido('30-71234567-1')).toBe(true);
    expect(cuitValido('20123456786')).toBe(true);
  });

  it('rechaza dígito verificador incorrecto o largo inválido', () => {
    expect(cuitValido('30-71234567-0')).toBe(false);
    expect(cuitValido('3071234567')).toBe(false);
    expect(cuitValido('')).toBe(false);
  });
});

describe('puede', () => {
  it('respeta permisos del rol y alcance por sede', () => {
    expect(puede(vendedora, 'productos.publicar')).toBe(true);
    expect(puede(vendedora, 'productos.publicar', 2)).toBe(true);
    expect(puede(vendedora, 'productos.publicar', 1)).toBe(false);
    expect(puede(vendedora, 'equipo.gestionar')).toBe(false);
    expect(puede(null, 'pedidos.ver')).toBe(false);
  });

  it('con todas las sedes, cualquier sede vale', () => {
    expect(puede({ ...vendedora, todasLasSedes: true }, 'stock.editar', 99)).toBe(true);
  });
});

describe('useEmpresaStore', () => {
  beforeEach(async () => {
    useEmpresaStore.setState({ membresias: [], empresaActivaId: null });
    await AsyncStorage.clear();
  });

  it('recupera la empresa activa guardada si el usuario sigue siendo miembro', async () => {
    await AsyncStorage.setItem('ny_empresa_activa', '7');
    mockObtenerMisEmpresas.mockResolvedValue([vendedora]);

    await useEmpresaStore.getState().cargar();

    expect(selectEmpresaActiva(useEmpresaStore.getState())?.nombre).toBe('Moda Sur');
  });

  it('si ya no es miembro de la empresa guardada, arranca en la empresa donde trabaja', async () => {
    await AsyncStorage.setItem('ny_empresa_activa', '99');
    mockObtenerMisEmpresas.mockResolvedValue([vendedora]);

    await useEmpresaStore.getState().cargar();

    expect(useEmpresaStore.getState().empresaActivaId).toBe(7);
  });

  it('un empleado arranca en modo empresa por defecto', async () => {
    mockObtenerMisEmpresas.mockResolvedValue([vendedora]);

    await useEmpresaStore.getState().cargar();

    expect(selectEmpresaActiva(useEmpresaStore.getState())?.nombre).toBe('Moda Sur');
  });

  it('si el empleado eligió "como yo", lo recuerda al volver a abrir', async () => {
    useEmpresaStore.setState({ membresias: [vendedora], empresaActivaId: 7 });
    await useEmpresaStore.getState().setEmpresaActiva(null);
    mockObtenerMisEmpresas.mockResolvedValue([vendedora]);

    await useEmpresaStore.getState().cargar();

    expect(useEmpresaStore.getState().empresaActivaId).toBeNull();
  });

  it('si el servidor falla, sigue en modo personal', async () => {
    mockObtenerMisEmpresas.mockRejectedValue(new Error('sin red'));

    await useEmpresaStore.getState().cargar();

    expect(useEmpresaStore.getState().membresias).toEqual([]);
  });

  it('no permite activar una empresa de la que no es miembro', async () => {
    useEmpresaStore.setState({ membresias: [vendedora] });

    await useEmpresaStore.getState().setEmpresaActiva(123);
    expect(useEmpresaStore.getState().empresaActivaId).toBeNull();

    await useEmpresaStore.getState().setEmpresaActiva(7);
    expect(useEmpresaStore.getState().empresaActivaId).toBe(7);
  });

  it('el propietario arranca con su empresa y no puede volver a "como yo"', async () => {
    const duena: Membresia = { ...vendedora, empresaId: 3, nombre: 'Lana Norte', rol: 'propietario' };
    mockObtenerMisEmpresas.mockResolvedValue([vendedora, duena]);

    await useEmpresaStore.getState().cargar();
    expect(selectEsPropietario(useEmpresaStore.getState())).toBe(true);
    expect(useEmpresaStore.getState().empresaActivaId).toBe(3);

    await useEmpresaStore.getState().setEmpresaActiva(null);
    expect(useEmpresaStore.getState().empresaActivaId).toBe(3);

    // Puede pasar a otra empresa donde es empleado.
    await useEmpresaStore.getState().setEmpresaActiva(7);
    expect(useEmpresaStore.getState().empresaActivaId).toBe(7);
  });

  it('un empleado sí puede volver a "como yo"', async () => {
    useEmpresaStore.setState({ membresias: [vendedora], empresaActivaId: 7 });

    await useEmpresaStore.getState().setEmpresaActiva(null);

    expect(selectEsPropietario(useEmpresaStore.getState())).toBe(false);
    expect(useEmpresaStore.getState().empresaActivaId).toBeNull();
  });
});

describe('mensajeInvitacion', () => {
  it('incluye un enlace https (WhatsApp lo hace tocable) y el código solo en su línea', () => {
    const texto = mensajeInvitacion('Moda Sur', { codigo: 'AB12CD34', rol: 'vendedor' });
    expect(texto).toMatch(/https:\/\/\S+\?codigo=AB12CD34/);
    expect(texto.split('\n')).toContain('AB12CD34');
    expect(texto).toContain('como Vendedor');
  });
});

describe('formatearCuit', () => {
  it('agrega los guiones a un CUIT de 11 dígitos', () => {
    expect(formatearCuit('30712345671')).toBe('30-71234567-1');
    expect(formatearCuit('123')).toBe('123');
  });
});
