export const ROUTES = {
  login: '/login',
  register: '/register',
  forgotPassword: '/recuperar',
  newPassword: '/nueva-contrasena',

  home: '/(tabs)',

  productDetail: '/producto/[id]',
  newProduct: '/producto/nuevo',
  editProduct: '/editar/[id]',
  myProducts: '/mis-publicaciones',
  myPurchases: '/mis-compras',
  mySales: '/mis-ventas',
  addresses: '/direcciones',

  companyPanel: '/empresa',
  newCompany: '/empresa/nueva',
  companyBranches: '/empresa/sedes',
  companyTeam: '/empresa/equipo',
  invitation: '/invitacion',
  store: '/tienda/[slug]',
  admin: '/admin',
  metrics: '/metricas',

  categories: '/categorias',
  cart: '/carrito',
  checkout: '/checkout',
  profile: '/perfil',
  favorites: '/favoritos',
} as const;