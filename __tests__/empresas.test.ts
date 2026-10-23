jest.mock('../services/supabase', () => ({ supabase: {} }));

const mockObtenerMisEmpresas = jest.fn();
jest.mock('../services/empresasService', () => ({
  ...jest.requireActual('../services/empresasService'),
  obtenerMisEmpresas: () => mockObtenerMisEmpresas(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { cuitValido, formatearCuit, Membresia, mensajeInvitacion } from '../services/empresasService';
import { puede, selectEmpresaActiva, useEmpresaStore } from '../stores/useEmpresaStore';

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

  it('vuelve a "como yo" si ya no es miembro de la empresa guardada', async () => {
    await AsyncStorage.setItem('ny_empresa_activa', '99');
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
});

describe('mensajeInvitacion', () => {
  it('incluye el enlace y el código', () => {
    const texto = mensajeInvitacion('Moda Sur', { codigo: 'AB12CD34', rol: 'vendedor' });
    expect(texto).toContain('newyou://invitacion?codigo=AB12CD34');
    expect(texto).toContain('como Vendedor');
  });
});

describe('formatearCuit', () => {
  it('agrega los guiones a un CUIT de 11 dígitos', () => {
    expect(formatearCuit('30712345671')).toBe('30-71234567-1');
    expect(formatearCuit('123')).toBe('123');
  });
});
