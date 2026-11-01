import { render, screen } from '@testing-library/react-native';

import { RequisitosContrasena } from '../components/ui/RequisitosContrasena';

const estado = (id: string) => screen.getByTestId(`requisito-${id}`).props.accessibilityLabel as string;

describe('RequisitosContrasena', () => {
  it('marca en vivo lo que cumple y lo que falta', async () => {
    const { rerender } = await render(<RequisitosContrasena contrasena="clave" repetir="" />);
    expect(estado('largo')).toMatch(/pendiente/);
    expect(estado('minuscula')).toMatch(/cumplido/);
    expect(estado('mayuscula')).toMatch(/pendiente/);
    expect(estado('numero')).toMatch(/pendiente/);

    await rerender(<RequisitosContrasena contrasena="Clave123" repetir="Clave123" />);
    ['largo', 'mayuscula', 'minuscula', 'numero', 'coinciden'].forEach((id) =>
      expect(estado(id)).toMatch(/cumplido/),
    );
  });

  it('sin repetir no muestra la fila de coincidencia', async () => {
    await render(<RequisitosContrasena contrasena="" />);
    expect(screen.queryByTestId('requisito-coinciden')).toBeNull();
  });
});
