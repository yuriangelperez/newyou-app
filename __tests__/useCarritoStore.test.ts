import { selectSubtotal, selectTotalItems, useCarritoStore } from '../stores/useCarritoStore';
import { Producto } from '../types';

const remera: Producto = {
  id: '1',
  nombre: 'Remera',
  precio: 1000,
  imagen: '',
  categoria: 'Camisas',
  disponible: true,
  stock: 5,
  descripcion: 'Remera de algodón',
};

const jean: Producto = { ...remera, id: '2', nombre: 'Jean', precio: 2500, stock: 1 };

const agregar = (producto: Producto, talle = 'M', color = 'Negro', cantidad?: number) =>
  useCarritoStore.getState().agregarProducto({ producto, talle, color, cantidad });

beforeEach(() => {
  useCarritoStore.getState().vaciarCarrito();
});

describe('useCarritoStore', () => {
  it('agrega productos y calcula unidades y subtotal', () => {
    agregar(remera, 'M', 'Negro', 2);
    agregar(jean);

    const state = useCarritoStore.getState();
    expect(selectTotalItems(state)).toBe(3);
    expect(selectSubtotal(state)).toBe(2 * 1000 + 2500);
  });

  it('suma unidades si se agrega la misma variante', () => {
    agregar(remera);
    agregar(remera);

    const { items } = useCarritoStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].cantidad).toBe(2);
  });

  it('no supera el stock disponible', () => {
    agregar(jean, 'M', 'Azul', 10);
    const [item] = useCarritoStore.getState().items;
    expect(item.cantidad).toBe(1);

    useCarritoStore.getState().incrementarUnidad(item.key);
    expect(useCarritoStore.getState().items[0].cantidad).toBe(1);
  });

  it('resta unidades y elimina el ítem al llegar a cero', () => {
    agregar(remera, 'M', 'Negro', 2);
    const [item] = useCarritoStore.getState().items;

    useCarritoStore.getState().restarUnidad(item.key);
    expect(useCarritoStore.getState().items[0].cantidad).toBe(1);

    useCarritoStore.getState().restarUnidad(item.key);
    expect(useCarritoStore.getState().items).toHaveLength(0);
  });

  it('no agrega productos agotados', () => {
    agregar({ ...remera, disponible: false, stock: 0 });
    expect(useCarritoStore.getState().items).toHaveLength(0);
  });

  it('vacía el carrito', () => {
    agregar(remera);
    useCarritoStore.getState().vaciarCarrito();

    const state = useCarritoStore.getState();
    expect(state.items).toHaveLength(0);
    expect(selectSubtotal(state)).toBe(0);
  });
});
