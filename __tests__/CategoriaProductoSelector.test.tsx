import { render, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

jest.mock('../hooks/useCategorias', () => ({
  useCategorias: () => [
    { nombre: 'Camisas', grupo: 'TORSO' },
    { nombre: 'Camperas', grupo: 'TORSO' },
    { nombre: 'Pantalones', grupo: 'PIERNAS' },
    { nombre: 'Jeans', grupo: 'PIERNAS' },
    { nombre: 'Brasieres', grupo: 'INTERIOR' },
    { nombre: 'Cinturones', grupo: 'ACCESORIOS' },
    { nombre: 'Botas', grupo: 'CALZADO' },
  ],
}));

import { CategoriaProductoSelector } from '../components/ui/CategoriaProductoSelector';
import { ProductoFormValues } from '../schemas/productoSchema';

function TestForm() {
  const form = useForm<ProductoFormValues>({
    defaultValues: {
      nombre: '',
      precio: '',
      descuentoActivo: false,
      descuentoPorcentaje: '0',
      stock: '1',
      imagen: '',
      imagenes: [],
      categoria: 'Camisas',
      tipoPrenda: 'Torso',
      temporada: 'Todo el año',
      publico: ['Adulto'],
      disponible: true,
      talle: '',
      colores: '',
      direccion: '',
      descripcion: '',
    },
  });

  return <CategoriaProductoSelector control={form.control} />;
}

describe('CategoriaProductoSelector', () => {
  it('muestra filtros por grupo para facilitar la búsqueda de categorías', async () => {
    await render(<TestForm />);

    expect(screen.getByText('Buscar por grupo')).toBeTruthy();
    expect(screen.getByText('TODO')).toBeTruthy();
    expect(screen.getByText('TORSO')).toBeTruthy();
    expect(screen.getByText('PIERNAS')).toBeTruthy();
    expect(screen.getByText('Categoría')).toBeTruthy();
  });
});
