import { CarritoItem } from "../stores/useCarritoStore";
import { supabase } from "./supabase";

export interface Compra {
  id: string;
  numeroOrden: number;
  creadaEn: string;
  entrega: "domicilio" | "local";
  metodoPago: string;
  subtotalOriginal: number;
  descuentos: number;
  envio: number;
  impuestos: number;
  total: number;
  items: CarritoItem[];
}

interface CrearCompraInput {
  entrega: "domicilio" | "local";
  metodoPago: string;
  subtotalOriginal: number;
  descuentos: number;
  envio: number;
  impuestos: number;
  total: number;
  items: CarritoItem[];
}

function mapCompra(row: {
  compraid: number;
  numero_orden: number;
  created_at: string;
  entrega: "domicilio" | "local";
  metodo_pago: string;
  subtotal_original: number;
  descuentos: number;
  envio: number;
  impuestos: number;
  total: number;
  items: CarritoItem[];
}): Compra {
  return {
    id: row.compraid.toString(),
    numeroOrden: Number(row.numero_orden),
    creadaEn: row.created_at,
    entrega: row.entrega,
    metodoPago: row.metodo_pago,
    subtotalOriginal: Number(row.subtotal_original),
    descuentos: Number(row.descuentos),
    envio: Number(row.envio),
    impuestos: Number(row.impuestos),
    total: Number(row.total),
    items: row.items ?? [],
  };
}

const COMPRA_COLUMNS = `
  compraid,
  numero_orden,
  created_at,
  entrega,
  metodo_pago,
  subtotal_original,
  descuentos,
  envio,
  impuestos,
  total,
  items
`;

export async function crearCompra(input: CrearCompraInput) {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Debes iniciar sesión para guardar tu compra.");
  }

  const { data, error } = await supabase
    .from("compras")
    .insert({
      usuario_id: authData.user.id,
      entrega: input.entrega,
      metodo_pago: input.metodoPago,
      subtotal_original: input.subtotalOriginal,
      descuentos: input.descuentos,
      envio: input.envio,
      impuestos: input.impuestos,
      total: input.total,
      items: input.items,
    })
    .select(COMPRA_COLUMNS)
    .single();

  if (error) {
    throw new Error(`No se pudo guardar la compra: ${error.message}`);
  }

  return mapCompra(data);
}

export async function getMisCompras() {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Debes iniciar sesión para ver tus compras.");
  }

  const { data, error } = await supabase
    .from("compras")
    .select(COMPRA_COLUMNS)
    .eq("usuario_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`No se pudieron cargar tus compras: ${error.message}`);
  }

  return (data ?? []).map(mapCompra);
}