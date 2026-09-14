export const ROUTES = {
  login: '/login',
  register: '/register',

  home: '/(tabs)',

  productDetail: '/producto/[id]',
  newProduct: '/producto/nuevo',
  editProduct: '/editar/[id]',
  myProducts: '/mis-publicaciones',
  myPurchases: '/mis-compras',
  settings: '/ajustes',

  categories: '/categorias',
  cart: '/carrito',
  checkout: '/checkout',
  profile: '/perfil',
  favorites: '/favoritos',
} as const;