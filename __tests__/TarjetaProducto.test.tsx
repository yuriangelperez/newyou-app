import { fireEvent, render, screen } from '@testing-library/react-native';

import TarjetaProducto from '../components/TarjetaProducto';
import type { Producto } from '../types';

const producto: Producto = {
  id: '7',
  nombre: 'Campera de jean',
  precio: 20000,
  descuentoPorcentaje: 10,
  imagen: 'https://example.com/campera.jpg',
  categoria: 'Camperas',
  disponible: true,
  stock: 2,
  descripcion: '',
};

async function renderTarjeta(cambios: Partial<Producto> = {}) {
  const onPressProducto = jest.fn();
  const onPressAgregar = jest.fn();
  await render(
    <TarjetaProducto
      producto={{ ...producto, ...cambios }}
      scale={1}
      onPressProducto={onPressProducto}
      onPressAgregar={onPressAgregar}
    />,
  );
  return { onPressProducto, onPressAgregar };
}

describe('TarjetaProducto', () => {
  it('muestra nombre y precio con descuento', async () => {
    await renderTarjeta();

    expect(screen.getByText('Campera de jean')).toBeTruthy();
    expect(screen.getByText('-10%')).toBeTruthy();
    expect(screen.getByText(`$${(18000).toLocaleString('es-AR')}`)).toBeTruthy();
  });

  it('abre el detalle y agrega al carrito', async () => {
    const { onPressProducto, onPressAgregar } = await renderTarjeta();

    await fireEvent.press(screen.getByLabelText('Ver Campera de jean'));
    await fireEvent.press(screen.getByLabelText('Agregar Campera de jean'));

    expect(onPressProducto).toHaveBeenCalledWith(expect.objectContaining({ id: '7' }));
    expect(onPressAgregar).toHaveBeenCalledWith(expect.objectContaining({ id: '7' }));
  });

  it('no deja agregar una prenda agotada', async () => {
    const { onPressAgregar } = await renderTarjeta({ disponible: false, stock: 0 });

    expect(screen.getByText('AGOTADO')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Agregar Campera de jean'));
    expect(onPressAgregar).not.toHaveBeenCalled();
  });
});
