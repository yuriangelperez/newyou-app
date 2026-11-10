import { errorTraducido } from './erroresSupabase';
import { supabase } from './supabase';

// ===== Datos bancarios =====
export interface DatosBancarios {
  titular: string;
  cuit: string;
  cbu: string;
  alias: string | null;
  banco: string | null;
  /** Si cambió el CBU hace menos de 48 h, hasta cuándo se frenan los pagos. */
  retenerHasta: string | null;
}

interface DatosBancariosRow {
  titular: string;
  cuit: string;
  cbu: string;
  alias: string | null;
  banco: string | null;
  retener_hasta: string | null;
}

const mapDatos = (row: DatosBancariosRow): DatosBancarios => ({
  titular: row.titular,
  cuit: row.cuit,
  cbu: row.cbu,
  alias: row.alias,
  banco: row.banco,
  retenerHasta: row.retener_hasta,
});

/** Quién cobra: la empresa activa o, si no hay, el particular. */
export interface Cobrador {
  empresaId: number | null;
  usuarioId: string;
}

/** Filtra por dueño (el admin ve todas las filas por RLS, así que siempre se filtra). */
function porCobrador<T extends { eq: (columna: string, valor: unknown) => T; is: (columna: string, valor: null) => T }>(
  consulta: T,
  cobrador: Cobrador & { columnaUsuario: 'usuario_id' | 'vendedor_id' },
) {
  return cobrador.empresaId
    ? consulta.eq('empresa_id', cobrador.empresaId)
    : consulta.eq(cobrador.columnaUsuario, cobrador.usuarioId).is('empresa_id', null);
}

/** Cuenta del particular o de la empresa. */
export async function obtenerDatosBancarios(cobrador: Cobrador) {
  const consulta = supabase.from('datos_bancarios').select('titular, cuit, cbu, alias, banco, retener_hasta');
  const { data, error } = await porCobrador(consulta, { ...cobrador, columnaUsuario: 'usuario_id' }).maybeSingle();
  if (error) {
    throw errorTraducido(error);
  }
  return data ? mapDatos(data as DatosBancariosRow) : null;
}

export async function guardarDatosBancarios(empresaId: number | null, datos: Omit<DatosBancarios, 'retenerHasta'>) {
  const { data, error } = await supabase.rpc('guardar_datos_bancarios', {
    p_empresa: empresaId,
    p_titular: datos.titular.trim(),
    p_cuit: datos.cuit,
    p_cbu: datos.cbu,
    p_alias: datos.alias?.trim() || null,
    p_banco: datos.banco?.trim() || null,
  });
  if (error) {
    throw errorTraducido(error);
  }
  return mapDatos(data as DatosBancariosRow);
}

// ===== Liquidaciones =====
export type EstadoLiquidacion = 'pendiente' | 'pagada' | 'retenida' | 'saldo_negativo';

export interface Liquidacion {
  id: number;
  semanaInicio: string;
  beneficiario?: string;
  esEmpresa?: boolean;
  ventasOnline: number;
  comision: number;
  comisionEfectivo: number;
  cargos: number;
  saldoAnterior: number;
  neto: number;
  pedidos: number;
  estado: EstadoLiquidacion;
  motivoRetencion: string | null;
  titular: string | null;
  cuit: string | null;
  cbu: string | null;
  alias: string | null;
  comprobante: string | null;
  pagadaAt: string | null;
}

type LiquidacionRow = {
  id: number;
  semana_inicio?: string;
  beneficiario?: string;
  es_empresa?: boolean;
  ventas_online: number;
  comision: number;
  comision_efectivo: number;
  cargos: number;
  saldo_anterior: number;
  neto: number;
  pedidos: number;
  estado: EstadoLiquidacion;
  motivo_retencion: string | null;
  titular: string | null;
  cuit: string | null;
  cbu: string | null;
  alias: string | null;
  comprobante: string | null;
  pagada_at: string | null;
};

export const mapLiquidacion = (row: LiquidacionRow): Liquidacion => ({
  id: row.id,
  semanaInicio: row.semana_inicio ?? '',
  beneficiario: row.beneficiario,
  esEmpresa: row.es_empresa,
  ventasOnline: Number(row.ventas_online),
  comision: Number(row.comision),
  comisionEfectivo: Number(row.comision_efectivo),
  cargos: Number(row.cargos),
  saldoAnterior: Number(row.saldo_anterior),
  neto: Number(row.neto),
  pedidos: Number(row.pedidos),
  estado: row.estado,
  motivoRetencion: row.motivo_retencion,
  titular: row.titular,
  cuit: row.cuit,
  cbu: row.cbu,
  alias: row.alias,
  comprobante: row.comprobante,
  pagadaAt: row.pagada_at,
});

export async function misLiquidaciones(cobrador: Cobrador) {
  const consulta = supabase.from('liquidaciones').select('*');
  const { data, error } = await porCobrador(consulta, { ...cobrador, columnaUsuario: 'vendedor_id' })
    .order('semana_inicio', { ascending: false })
    .limit(52);
  if (error) {
    throw errorTraducido(error);
  }
  return (data as LiquidacionRow[]).map(mapLiquidacion);
}

export interface Cargo {
  id: number;
  tipo: 'cargo_reclamo' | 'reintegro' | 'ajuste';
  monto: number;
  motivo: string;
  createdAt: string;
}

/** Cargos que todavía no se descontaron (se descuentan en la próxima liquidación). */
export async function misCargosPendientes(cobrador: Cobrador): Promise<Cargo[]> {
  const consulta = supabase.from('cargos_vendedor').select('id, tipo, monto, motivo, created_at').is('liquidacion_id', null);
  const { data, error } = await porCobrador(consulta, { ...cobrador, columnaUsuario: 'vendedor_id' }).order('created_at', {
    ascending: false,
  });
  if (error) {
    throw errorTraducido(error);
  }
  return ((data ?? []) as { id: number; tipo: Cargo['tipo']; monto: number; motivo: string; created_at: string }[]).map(
    (fila) => ({ id: fila.id, tipo: fila.tipo, monto: Number(fila.monto), motivo: fila.motivo, createdAt: fila.created_at }),
  );
}

async function rpc<T>(funcion: string, parametros: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(funcion, parametros);
  if (error) {
    throw errorTraducido(error);
  }
  return data as T;
}

export const generarLiquidaciones = (semana: string) => rpc<number>('generar_liquidaciones', { p_semana: semana });

export async function liquidacionesDeLaSemana(semana: string) {
  const filas = await rpc<LiquidacionRow[]>('admin_liquidaciones', { p_semana: semana });
  return (filas ?? []).map((fila) => mapLiquidacion({ ...fila, semana_inicio: semana }));
}

export const marcarLiquidacionPagada = (id: number, comprobante: string) =>
  rpc<void>('marcar_liquidacion_pagada', { p_liquidacion: id, p_comprobante: comprobante.trim() });

/** CSV de las liquidaciones a pagar (para el home banking). */
export function liquidacionesACsv(liquidaciones: Liquidacion[]) {
  const celda = (valor: string | number | null | undefined) => `"${String(valor ?? '').replace(/"/g, '""')}"`;
  const filas = liquidaciones
    .filter((l) => l.estado === 'pendiente')
    .map((l) => [l.beneficiario, l.titular, l.cuit, l.cbu, l.alias, l.neto.toFixed(2)].map(celda).join(','));
  return ['beneficiario,titular,cuit,cbu,alias,monto', ...filas].join('\n');
}

// ===== Reclamos =====
export type MotivoReclamo = 'no_llego' | 'distinto' | 'defectuoso' | 'otro';
export type EstadoReclamo = 'abierto' | 'a_favor_comprador' | 'a_favor_vendedor';

export const MOTIVOS_RECLAMO: { valor: MotivoReclamo; texto: string }[] = [
  { valor: 'no_llego', texto: 'No me llegó' },
  { valor: 'distinto', texto: 'Es distinto a lo publicado' },
  { valor: 'defectuoso', texto: 'Tiene defectos no informados' },
  { valor: 'otro', texto: 'Otro problema' },
];

export interface Reclamo {
  id: number;
  pedidoId: number;
  motivo: MotivoReclamo;
  descripcion: string;
  estado: EstadoReclamo;
  resolucion: string | null;
  createdAt: string;
  total?: number;
  metodoPago?: string;
  comprador?: string | null;
  vendedor?: string | null;
}

type ReclamoRow = {
  id?: number;
  reclamo_id?: number;
  pedido_id: number;
  motivo: MotivoReclamo;
  descripcion: string;
  estado: EstadoReclamo;
  resolucion: string | null;
  created_at: string;
  total?: number;
  metodo_pago?: string;
  comprador?: string | null;
  vendedor?: string | null;
};

const mapReclamo = (row: ReclamoRow): Reclamo => ({
  id: Number(row.id ?? row.reclamo_id),
  pedidoId: row.pedido_id,
  motivo: row.motivo,
  descripcion: row.descripcion,
  estado: row.estado,
  resolucion: row.resolucion,
  createdAt: row.created_at,
  total: row.total !== undefined ? Number(row.total) : undefined,
  metodoPago: row.metodo_pago,
  comprador: row.comprador,
  vendedor: row.vendedor,
});

export async function abrirReclamo(pedidoId: number, motivo: MotivoReclamo, descripcion: string) {
  return mapReclamo(
    await rpc<ReclamoRow>('abrir_reclamo', { p_pedido: pedidoId, p_motivo: motivo, p_descripcion: descripcion.trim() }),
  );
}

/** Último reclamo de cada pedido que veo: { pedidoId: reclamo }. */
export async function reclamosPorPedido(): Promise<Record<number, Reclamo>> {
  const { data, error } = await supabase
    .from('reclamos')
    .select('id, pedido_id, motivo, descripcion, estado, resolucion, created_at')
    .order('created_at', { ascending: true });
  if (error) {
    throw errorTraducido(error);
  }
  return Object.fromEntries(((data ?? []) as ReclamoRow[]).map((fila) => [fila.pedido_id, mapReclamo(fila)]));
}

export async function reclamosAdmin(estado: EstadoReclamo | null = 'abierto') {
  return ((await rpc<ReclamoRow[]>('admin_reclamos', { p_estado: estado })) ?? []).map(mapReclamo);
}

export const resolverReclamo = (id: number, aFavor: 'comprador' | 'vendedor', resolucion: string) =>
  rpc<void>('resolver_reclamo', { p_reclamo: id, p_a_favor: aFavor, p_resolucion: resolucion.trim() });
