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
