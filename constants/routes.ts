export const ROUTES = {
  login: '/login',
  register: '/register',

  home: '/(tabs)',

  productDetail: '/producto/[id]',
  newProduct: '/producto/nuevo',
  editProduct: '/editar/[id]',
  myProducts: '/mis-publicaciones',

  categories: '/categorias',
  cart: '/carrito',
  profile: '/perfil',
  favorites: '/favoritos',
} as const;