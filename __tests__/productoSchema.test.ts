import { productoSchema } from '../schemas/productoSchema';

const valido = {
  nombre: 'Campera denim',
  precio: '35000',
  stock: '3',
  imagen: '',
  tipoPrenda: 'Torso',
  categoria: 'Camperas',
  temporada: 'Invierno',
  publico: 'Adulto',
  disponible: true,
  talle: 'S, M',
  colores: 'Azul',
  descripcion: 'Campera de jean en muy buen estado',
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
