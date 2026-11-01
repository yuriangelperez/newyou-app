import { fireEvent, render, screen } from '@testing-library/react-native';

import { PanelFiltros } from '../components/ui/PanelFiltros';

describe('PanelFiltros', () => {
  it('cambia el orden y limpia los filtros', async () => {
    const setOrden = jest.fn();
    const onLimpiar = jest.fn();
    const onCerrar = jest.fn();
    await render(
      <PanelFiltros
        visible
        onCerrar={onCerrar}
        onLimpiar={onLimpiar}
        secciones={[
          { id: 'orden', titulo: 'Ordenar por', opciones: ['Destacados', 'Menor precio', 'Mayor precio'], valor: 'Destacados', onCambiar: setOrden },
        ]}
      />,
    );

    await fireEvent.press(screen.getByTestId('filtro-orden-Mayor precio'));
    expect(setOrden).toHaveBeenCalledWith('Mayor precio');

    await fireEvent.press(screen.getByTestId('filtros-limpiar'));
    expect(onLimpiar).toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('filtros-listo'));
    expect(onCerrar).toHaveBeenCalled();
  });
});

describe('PanelFiltros con chips', () => {
  it('muestra los talles como chips y devuelve el elegido', async () => {
    const setTalle = jest.fn();
    await render(
      <PanelFiltros
        visible
        onCerrar={jest.fn()}
        onLimpiar={jest.fn()}
        secciones={[{ id: 'talle', titulo: 'Talle', opciones: ['Todos', 'S', 'M'], valor: 'Todos', onCambiar: setTalle, estilo: 'chips' }]}
      />,
    );
    await fireEvent.press(screen.getByTestId('filtro-talle-M'));
    expect(setTalle).toHaveBeenCalledWith('M');
  });
});
