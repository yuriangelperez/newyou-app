import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CATEGORY_ID_BY_NAME = {
  Camisas: 1,
  Jeans: 2,
  Vestidos: 3,
  Botas: 4,
  Short: 5,
  Camperas: 6,
  Interior: 1,
  Accesorios: 10,
  Calzado: 9,
  Equipamiento: 11,
};

const MAX_DESCRIPCION = 200;

function buildDescripcion(descripcion, imagen) {
  const marker = `\n[IMG]${imagen}`;
  const allowedLength = Math.max(0, MAX_DESCRIPCION - marker.length);
  return `${descripcion.slice(0, allowedLength)}${marker}`;
}

const productosMock = [
  {
    nombre: 'Camisa Lino Premium',
    precio: 25000,
    imagen: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500',
    categoria: 'Camisas',
    disponible: true,
    talle: ['S', 'M', 'L'],
    descripcion: 'Camisa de lino 100% ideal para el verano, fresca y con botones de madera.',
  },
  {
    nombre: 'Jean Classic Slim',
    precio: 38000,
    imagen: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500',
    categoria: 'Jeans',
    disponible: true,
    talle: ['30', '32', '34'],
    descripcion: 'Jeans de denim rigido, corte slim fit con un prelavado clasico.',
  },
  {
    nombre: 'Vestido Floreado Ibiza',
    precio: 45000,
    imagen: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500',
    categoria: 'Vestidos',
    disponible: false,
    talle: ['S', 'M'],
    descripcion: 'Vestido corto floreado con tirantes regulables y espalda abierta.',
  },
  {
    nombre: 'Bota Cuero Terra',
    precio: 85000,
    imagen: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=500',
    categoria: 'Botas',
    disponible: true,
    talle: ['37', '38', '39', '40'],
    descripcion: 'Botas de cuero vacuno legitimo en tono terra, hechas a mano.',
  },
  {
    nombre: 'Short Denim Vintage',
    precio: 18000,
    imagen: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=500',
    categoria: 'Short',
    disponible: true,
    talle: ['36', '38', '40'],
    descripcion: 'Short de jean tiro alto con terminacion desflecada.',
  },
  {
    nombre: 'Campera Bomber Oversize',
    precio: 62000,
    imagen: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500',
    categoria: 'Camperas',
    disponible: true,
    talle: ['M', 'L', 'XL'],
    descripcion: 'Campera estilo bomber con abrigo interno y punos elastizados.',
  },
  {
    nombre: 'Brasier Encaje Negro',
    precio: 22000,
    imagen: 'https://images.unsplash.com/photo-1610241519159-8a62634bac9a?w=500',
    categoria: 'Interior',
    tipo_prenda: 'Brasieres',
    disponible: true,
    talle: ['S', 'M', 'L'],
    descripcion: 'Brasier de encaje negro con soporte comodo para uso diario.',
  },
  {
    nombre: 'Boxer Algodon Azul',
    precio: 12000,
    imagen: 'https://images.unsplash.com/photo-1640765937555-6f413ed1d936?w=500',
    categoria: 'Interior',
    tipo_prenda: 'Boxers',
    disponible: true,
    talle: ['S', 'M', 'L', 'XL'],
    descripcion: 'Boxer de algodon suave con cintura elastica y calce confortable.',
  },
  {
    nombre: 'Cinturon Cuero Marron',
    precio: 18000,
    imagen: 'https://images.unsplash.com/photo-1664286074176-5206ee5dc878?w=500',
    categoria: 'Accesorios',
    tipo_prenda: 'Cinturones',
    disponible: true,
    talle: ['S', 'M', 'L'],
    descripcion: 'Cinturon de cuero marron con hebilla metalica clasica.',
  },
  {
    nombre: 'Cartera Mini Negra',
    precio: 32000,
    imagen: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500',
    categoria: 'Accesorios',
    tipo_prenda: 'Carteras',
    disponible: true,
    talle: ['Unico'],
    descripcion: 'Cartera mini negra con correa regulable y cierre seguro.',
  },
  {
    nombre: 'Gorra Algodon Beige',
    precio: 14000,
    imagen: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=500',
    categoria: 'Accesorios',
    tipo_prenda: 'Gorras',
    disponible: true,
    talle: ['Unico'],
    descripcion: 'Gorra de algodon beige con visera curva y ajuste posterior.',
  },
  {
    nombre: 'Lentes Sol Carey',
    precio: 20000,
    imagen: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500',
    categoria: 'Accesorios',
    tipo_prenda: 'Lentes',
    disponible: true,
    talle: ['Unico'],
    descripcion: 'Lentes de sol con marco carey y proteccion UV.',
  },
  {
    nombre: 'Botas Urbanas Negras',
    precio: 68000,
    imagen: 'https://plus.unsplash.com/premium_photo-1729788891863-0d9b6f2b453b?w=500',
    categoria: 'Calzado',
    tipo_prenda: 'Botas',
    disponible: true,
    talle: ['37', '38', '39', '40'],
    descripcion: 'Botas urbanas negras con suela comoda para todos los dias.',
  },
  {
    nombre: 'Zapatillas Urbanas Blancas',
    precio: 52000,
    imagen: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
    categoria: 'Calzado',
    tipo_prenda: 'Zapatillas',
    disponible: true,
    talle: ['37', '38', '39', '40'],
    descripcion: 'Zapatillas urbanas blancas de perfil bajo y suela liviana.',
  },
  {
    nombre: 'Sandalias Tiras Negras',
    precio: 28000,
    imagen: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=500',
    categoria: 'Calzado',
    tipo_prenda: 'Sandalias',
    disponible: true,
    talle: ['36', '37', '38', '39'],
    descripcion: 'Sandalias de tiras negras con diseño liviano y versatil.',
  },
  {
    nombre: 'Mocasines Cuero Suela',
    precio: 46000,
    imagen: 'https://images.unsplash.com/photo-1616406432452-07bc5938759d?w=500',
    categoria: 'Calzado',
    tipo_prenda: 'Mocasines',
    disponible: true,
    talle: ['37', '38', '39', '40'],
    descripcion: 'Mocasines de cuero color suela con terminacion elegante.',
  },
];

const { data: existentes, error: selectError } = await supabase
  .from('productos')
  .select('nombre');

if (selectError) {
  console.error('Error leyendo productos existentes:', selectError.message);
  process.exit(1);
}

const nombresExistentes = new Set((existentes || []).map((item) => item.nombre));
const nuevos = productosMock
  .filter((p) => !nombresExistentes.has(p.nombre))
  .map((p) => ({
    nombre: p.nombre,
    descripcion: buildDescripcion(p.descripcion, p.imagen),
    precio: p.precio,
    stock: p.disponible ? 1 : 0,
    categoriaid: CATEGORY_ID_BY_NAME[p.categoria] || 1,
    tipo_prenda: p.tipo_prenda,
    temporada: 'Todo el año',
    publico: 'Adulto',
    talles: p.talle,
    colores: ['Negro'],
    imagen_url: p.imagen,
    imagenes: [p.imagen],
  }));

if (!nuevos.length) {
  console.log('No hay productos nuevos para insertar.');
  process.exit(0);
}

const { data, error } = await supabase
  .from('productos')
  .insert(nuevos)
  .select('productoid, nombre');

if (error) {
  console.error('Error insertando productos:', error.message);
  process.exit(1);
}

console.log('Productos insertados:');
for (const item of data || []) {
  console.log(`- ${item.productoid} :: ${item.nombre}`);
}
