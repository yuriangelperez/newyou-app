import { productoSchema } from '../schemas/productoSchema';

const valido = {
  nombre: 'Campera denim',
  precio: '35000',
  stock: '3',
  imagen: '',
  tipoPrenda: 'Torso',
  categoria: 'Camperas',
  temporada: 'Invierno',
  condicion: 'nuevo',
  publico: ['Adulto'],
  disponible: true,
  talle: 'S, M',
  colores: 'Azul',
  descripcion: 'Campera de jean impecable',
};

const campos = (resultado: ReturnType<typeof productoSchema.safeParse>) =>
  resultado.success ? [] : resultado.error.issues.map((issue) => issue.path[0]);

describe('productoSchema', () => {
  it('acepta un producto válido', () => {
    expect(productoSchema.safeParse(valido).success).toBe(true);
  });

  it('rechaza precios negativos o cero', () => {
    expect(campos(productoSchema.safeParse({ ...valido, precio: '-10' }))).toContain('precio');
    expect(campos(productoSchema.safeParse({ ...valido, precio: '0' }))).toContain('precio');
  });

  it('rechaza stock negativo o decimal', () => {
    expect(campos(productoSchema.safeParse({ ...valido, stock: '-1' }))).toContain('stock');
    expect(campos(productoSchema.safeParse({ ...valido, stock: '1.5' }))).toContain('stock');
  });

  it('rechaza campos obligatorios vacíos', () => {
    const resultado = productoSchema.safeParse({
      ...valido,
      nombre: '',
      talle: '',
      colores: '',
      descripcion: '',
    });

    expect(campos(resultado)).toEqual(
      expect.arrayContaining(['nombre', 'talle', 'colores', 'descripcion']),
    );
  });

  it('acepta público con una o varias opciones y rechaza valores inválidos', () => {
    expect(productoSchema.safeParse({ ...valido, publico: ['Masculino'] }).success).toBe(true);
    expect(productoSchema.safeParse({ ...valido, publico: ['Femenino', 'Unisex'] }).success).toBe(true);
    expect(campos(productoSchema.safeParse({ ...valido, publico: ['Otro'] }))).toContain('publico');
  });

  it('acepta condicion nuevo o usado y rechaza valores inválidos', () => {
    expect(productoSchema.safeParse({ ...valido, condicion: 'nuevo' }).success).toBe(true);
    expect(productoSchema.safeParse({ ...valido, condicion: 'usado' }).success).toBe(true);
    expect(campos(productoSchema.safeParse({ ...valido, condicion: 'seminuevo' }))).toContain('condicion');
  });

  it('rechaza una URL de imagen inválida pero acepta imagen vacía', () => {
    expect(campos(productoSchema.safeParse({ ...valido, imagen: 'no-es-url' }))).toContain('imagen');
    expect(productoSchema.safeParse({ ...valido, imagen: '' }).success).toBe(true);
  });
});

describe('productoSchema: imágenes', () => {
  const url = (n: number) => `https://ejemplo.com/foto-${n}.jpg`;

  it('acepta hasta 5 imágenes', () => {
    const resultado = productoSchema.safeParse({ ...valido, imagenes: [1, 2, 3, 4, 5].map(url) });
    expect(resultado.success).toBe(true);
  });

  it('rechaza una sexta imagen', () => {
    const resultado = productoSchema.safeParse({ ...valido, imagenes: [1, 2, 3, 4, 5, 6].map(url) });
    expect(campos(resultado)).toContain('imagenes');
  });

  it('sin imágenes queda una lista vacía', () => {
    const resultado = productoSchema.safeParse(valido);
    expect(resultado.success && resultado.data.imagenes).toEqual([]);
  });
});

describe('productoSchema: descuentos', () => {
  it('sin descuento queda en 0%', () => {
    const resultado = productoSchema.safeParse(valido);
    expect(resultado.success && resultado.data.descuentoPorcentaje).toBe(0);
  });

  it('con el descuento activo exige un porcentaje mayor a 0', () => {
    const resultado = productoSchema.safeParse({ ...valido, descuentoActivo: true, descuentoPorcentaje: '0' });
    expect(campos(resultado)).toContain('descuentoPorcentaje');
  });

  it('rechaza descuentos fuera de 0–100%', () => {
    expect(campos(productoSchema.safeParse({ ...valido, descuentoActivo: true, descuentoPorcentaje: '150' }))).toContain(
      'descuentoPorcentaje',
    );
    expect(productoSchema.safeParse({ ...valido, descuentoActivo: true, descuentoPorcentaje: '20' }).success).toBe(true);
  });
});

describe('productoSchema: Etapa 1 (precio, talles, largos)', () => {
  const precio = (valor: string) => productoSchema.safeParse({ ...valido, precio: valor });

  it('toma el punto como separador de miles y la coma como decimal', () => {
    expect(precio('35.000').data?.precio).toBe(35000);
    expect(precio('1.500,50').data?.precio).toBe(1500.5);
    expect(precio('35000').data?.precio).toBe(35000);
  });

  it('rechaza el punto como decimal y las letras, con mensajes en español', () => {
    expect(precio('1500.50').error?.issues[0].message).toMatch(/punto sólo para separar miles/);
    expect(precio('abc').error?.issues[0].message).toBe('Ingresá sólo números (sin $ ni letras).');
  });

  it('sólo acepta talles de la lista (ropa o calzado según la prenda)', () => {
    expect(campos(productoSchema.safeParse({ ...valido, talle: '38/40' }))).toContain('talle');
    expect(productoSchema.safeParse({ ...valido, talle: 'S, Único' }).success).toBe(true);
    expect(campos(productoSchema.safeParse({ ...valido, talle: '40' }))).toContain('talle');
    expect(productoSchema.safeParse({ ...valido, tipoPrenda: 'Calzado', categoria: 'Botas', talle: '40, 41' }).success).toBe(true);
  });

  it('limita el nombre a 30 caracteres y la descripción a 500', () => {
    const nombreLargo = 'x'.repeat(31);
    const descripcionLarga = 'x'.repeat(501);
    expect(campos(productoSchema.safeParse({ ...valido, nombre: nombreLargo }))).toContain('nombre');
    expect(campos(productoSchema.safeParse({ ...valido, descripcion: descripcionLarga }))).toContain('descripcion');
  });
});
