import { supabase } from './supabase';

export type EstadoEmpresa = 'pendiente' | 'verificada' | 'suspendida';
export type RolEmpresa = 'propietario' | 'administrador' | 'vendedor' | 'envios';
export type Permiso =
  | 'empresa.editar'
  | 'equipo.gestionar'
  | 'sedes.gestionar'
  | 'productos.publicar'
  | 'productos.precio'
  | 'stock.editar'
  | 'pedidos.ver'
  | 'pedidos.estado'
  | 'envios.gestionar'
  | 'metricas.ver';

export const ROLES_EMPRESA: { codigo: RolEmpresa; nombre: string }[] = [
  { codigo: 'propietario', nombre: 'Propietario' },
  { codigo: 'administrador', nombre: 'Administrador' },
  { codigo: 'vendedor', nombre: 'Vendedor' },
  { codigo: 'envios', nombre: 'Envíos' },
];

export const nombreRol = (rol: RolEmpresa) =>
  ROLES_EMPRESA.find((item) => item.codigo === rol)?.nombre ?? rol;

/** Empresa a la que pertenece el usuario, con su rol y permisos (de `mis_empresas()`). */
export interface Membresia {
  empresaId: number;
  nombre: string;
  slug: string;
  estado: EstadoEmpresa;
  rol: RolEmpresa;
  todasLasSedes: boolean;
  sedesPermitidas: number[];
  permisos: Permiso[];
}

export interface Empresa {
  id: number;
  razonSocial: string;
  nombre: string;
  cuit: string;
  slug: string;
  descripcion: string | null;
  estado: EstadoEmpresa;
}

export interface Sede {
  id: number;
  empresaId: number;
  nombre: string;
  direccion: string;
  horarios: string | null;
  haceRetiro: boolean;
  haceEnvio: boolean;
  costoEnvio: number;
  activa: boolean;
}

export interface MiembroEquipo {
  usuarioId: string;
  username: string;
  email: string;
  rol: RolEmpresa;
  todasLasSedes: boolean;
  sedesPermitidas: number[];
}

export interface Invitacion {
  id: number;
  email: string;
  rol: RolEmpresa;
  codigo: string;
  venceEn: string;
}

export interface NuevaEmpresa {
  razonSocial: string;
  nombre: string;
  cuit: string;
  descripcion?: string;
  sedeNombre: string;
  sedeDireccion: string;
  haceRetiro: boolean;
  haceEnvio: boolean;
}

export type DatosSede = Omit<Sede, 'id' | 'empresaId'>;

const COLUMNAS_EMPRESA = 'id, razon_social, nombre_fantasia, cuit, slug, descripcion, estado';
const COLUMNAS_SEDE =
  'id, empresa_id, nombre, direccion, horarios, hace_retiro, hace_envio, costo_envio, activa';

interface EmpresaRow {
  id: number;
  razon_social: string;
  nombre_fantasia: string;
  cuit: string;
  slug: string;
  descripcion: string | null;
  estado: EstadoEmpresa;
}

interface SedeRow {
  id: number;
  empresa_id: number;
  nombre: string;
  direccion: string;
  horarios: string | null;
  hace_retiro: boolean;
  hace_envio: boolean;
  costo_envio: number | string;
  activa: boolean;
}

const mapEmpresa = (row: EmpresaRow): Empresa => ({
  id: row.id,
  razonSocial: row.razon_social,
  nombre: row.nombre_fantasia,
  cuit: row.cuit,
  slug: row.slug,
  descripcion: row.descripcion,
  estado: row.estado,
});

const mapSede = (row: SedeRow): Sede => ({
  id: row.id,
  empresaId: row.empresa_id,
  nombre: row.nombre,
  direccion: row.direccion,
  horarios: row.horarios,
  haceRetiro: row.hace_retiro,
  haceEnvio: row.hace_envio,
  costoEnvio: Number(row.costo_envio),
  activa: row.activa,
});

const toSedeRow = (datos: DatosSede) => ({
  nombre: datos.nombre.trim(),
  direccion: datos.direccion.trim(),
  horarios: datos.horarios?.trim() || null,
  hace_retiro: datos.haceRetiro,
  hace_envio: datos.haceEnvio,
  costo_envio: datos.haceEnvio ? datos.costoEnvio : 0,
  activa: datos.activa,
});

function fallar(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

/** Valida el CUIT con su dígito verificador (el servidor repite el control). */
export function cuitValido(cuit: string) {
  const digitos = cuit.replace(/\D/g, '');

  if (!/^\d{11}$/.test(digitos)) {
    return false;
  }

  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((total, peso, i) => total + Number(digitos[i]) * peso, 0);
  const resto = 11 - (suma % 11);
  const verificador = resto === 11 ? 0 : resto === 10 ? 9 : resto;

  return verificador === Number(digitos[10]);
}

export async function obtenerMisEmpresas(): Promise<Membresia[]> {
  const { data, error } = await supabase.rpc('mis_empresas');
  fallar(error);

  return (data ?? []).map(
    (row: {
      empresa_id: number;
      nombre_fantasia: string;
      slug: string;
      estado: EstadoEmpresa;
      rol: RolEmpresa;
      todas_las_sedes: boolean;
      sedes_permitidas: number[];
      permisos: Permiso[];
    }) => ({
      empresaId: row.empresa_id,
      nombre: row.nombre_fantasia,
      slug: row.slug,
      estado: row.estado,
      rol: row.rol,
      todasLasSedes: row.todas_las_sedes,
      sedesPermitidas: row.sedes_permitidas ?? [],
      permisos: row.permisos ?? [],
    }),
  );
}

/** Crea la empresa (queda pendiente de verificación), su primera sede y al usuario como propietario. */
export async function crearEmpresa(datos: NuevaEmpresa): Promise<Empresa> {
  const { data, error } = await supabase.rpc('crear_empresa', {
    p_razon_social: datos.razonSocial.trim(),
    p_nombre_fantasia: datos.nombre.trim(),
    p_cuit: datos.cuit,
    p_descripcion: datos.descripcion?.trim() || null,
    p_sede_nombre: datos.sedeNombre.trim(),
    p_sede_direccion: datos.sedeDireccion.trim(),
    p_hace_retiro: datos.haceRetiro,
    p_hace_envio: datos.haceEnvio,
  });
  fallar(error);

  return mapEmpresa(data as EmpresaRow);
}

export async function obtenerEmpresa(id: number): Promise<Empresa> {
  const { data, error } = await supabase
    .from('empresas')
    .select(COLUMNAS_EMPRESA)
    .eq('id', id)
    .single();
  fallar(error);

  return mapEmpresa(data as EmpresaRow);
}

/** Tienda pública: sólo devuelve empresas verificadas o de las que el usuario es miembro. */
export async function obtenerEmpresaPorSlug(slug: string): Promise<Empresa | null> {
  const { data, error } = await supabase
    .from('empresas')
    .select(COLUMNAS_EMPRESA)
    .eq('slug', slug)
    .maybeSingle();
  fallar(error);

  return data ? mapEmpresa(data as EmpresaRow) : null;
}

export async function actualizarEmpresa(id: number, datos: { descripcion: string }) {
  const { error } = await supabase
    .from('empresas')
    .update({ descripcion: datos.descripcion.trim() || null })
    .eq('id', id);
  fallar(error);
}

export async function listarSedes(empresaId: number): Promise<Sede[]> {
  const { data, error } = await supabase
    .from('sedes')
    .select(COLUMNAS_SEDE)
    .eq('empresa_id', empresaId)
    .order('id', { ascending: true });
  fallar(error);

  return (data ?? []).map((row) => mapSede(row as SedeRow));
}

export async function crearSede(empresaId: number, datos: DatosSede) {
  const { error } = await supabase.from('sedes').insert({ empresa_id: empresaId, ...toSedeRow(datos) });
  fallar(error);
}

export async function actualizarSede(id: number, datos: DatosSede) {
  const { error } = await supabase.from('sedes').update(toSedeRow(datos)).eq('id', id);
  fallar(error);
}

export async function listarEquipo(empresaId: number): Promise<MiembroEquipo[]> {
  const { data, error } = await supabase.rpc('equipo_empresa', { p_empresa: empresaId });
  fallar(error);

  return (data ?? []).map(
    (row: {
      usuario_id: string;
      username: string;
      email: string;
      rol: RolEmpresa;
      todas_las_sedes: boolean;
      sedes_permitidas: number[];
    }) => ({
      usuarioId: row.usuario_id,
      username: row.username,
      email: row.email,
      rol: row.rol,
      todasLasSedes: row.todas_las_sedes,
      sedesPermitidas: row.sedes_permitidas ?? [],
    }),
  );
}

export async function cambiarRolMiembro(
  empresaId: number,
  usuarioId: string,
  rol: RolEmpresa,
  sedes: number[] | 'todas',
) {
  const { error } = await supabase.rpc('cambiar_rol_miembro', {
    p_empresa: empresaId,
    p_usuario: usuarioId,
    p_rol: rol,
    p_todas_las_sedes: sedes === 'todas',
    p_sedes: sedes === 'todas' ? [] : sedes,
  });
  fallar(error);
}

export async function quitarMiembro(empresaId: number, usuarioId: string) {
  const { error } = await supabase.rpc('quitar_miembro', { p_empresa: empresaId, p_usuario: usuarioId });
  fallar(error);
}

/** Invitaciones vigentes y sin aceptar. */
export async function listarInvitaciones(empresaId: number): Promise<Invitacion[]> {
  const { data, error } = await supabase
    .from('invitaciones')
    .select('id, email, rol, codigo, vence_en')
    .eq('empresa_id', empresaId)
    .is('aceptada_por', null)
    .gt('vence_en', new Date().toISOString())
    .order('created_at', { ascending: false });
  fallar(error);

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    rol: row.rol,
    codigo: row.codigo,
    venceEn: row.vence_en,
  }));
}

export async function invitarMiembro(
  empresaId: number,
  email: string,
  rol: RolEmpresa,
  sedes: number[] | 'todas',
): Promise<Invitacion> {
  const { data, error } = await supabase
    .from('invitaciones')
    .insert({
      empresa_id: empresaId,
      email: email.trim().toLowerCase(),
      rol,
      todas_las_sedes: sedes === 'todas',
      sedes_permitidas: sedes === 'todas' ? [] : sedes,
    })
    .select('id, email, rol, codigo, vence_en')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'No se pudo crear la invitación');
  }

  return { id: data.id, email: data.email, rol: data.rol, codigo: data.codigo, venceEn: data.vence_en };
}

export async function cancelarInvitacion(id: number) {
  const { error } = await supabase.from('invitaciones').delete().eq('id', id);
  fallar(error);
}

/** Acepta una invitación con la cuenta actual; devuelve el id de la empresa. */
export async function aceptarInvitacion(codigo: string): Promise<number> {
  const { data, error } = await supabase.rpc('aceptar_invitacion', { p_codigo: codigo.trim() });
  fallar(error);

  return data as number;
}

/** Texto para compartir una invitación por WhatsApp, correo, etc. */
export function mensajeInvitacion(empresa: string, invitacion: Pick<Invitacion, 'codigo' | 'rol'>) {
  return (
    `Te invitaron a sumarte a ${empresa} en NewYou como ${nombreRol(invitacion.rol)}.\n` +
    `Abrí newyou://invitacion?codigo=${invitacion.codigo} o ingresá el código ${invitacion.codigo} ` +
    'en Perfil > Tengo un código de invitación.'
  );
}
