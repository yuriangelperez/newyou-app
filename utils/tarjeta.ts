// Validación de tarjetas de la API de tarjetas propia (simulada).
// OJO: supabase/functions/_shared/tarjeta.ts es una copia exacta (Deno no importa
// archivos de la app); un test verifica que sean iguales.

export type MarcaTarjeta = 'Visa' | 'Mastercard' | 'American Express' | 'Cabal' | 'Naranja';
export type TipoTarjeta = 'credito' | 'debito';

/** Tarjetas de prueba: el número define marca y tipo. Cualquier otra se toma como crédito. */
export const TARJETAS_PRUEBA: { numero: string; marca: MarcaTarjeta; tipo: TipoTarjeta }[] = [
  { numero: '4509953566233704', marca: 'Visa', tipo: 'credito' },
  { numero: '5031755734530604', marca: 'Mastercard', tipo: 'credito' },
  { numero: '371180303257522', marca: 'American Express', tipo: 'credito' },
  { numero: '4002768694395619', marca: 'Visa', tipo: 'debito' },
  { numero: '5287338310253304', marca: 'Mastercard', tipo: 'debito' },
];

/** Prefijos (BIN) de débito conocidos además de las tarjetas de prueba. */
const BINES_DEBITO = ['400276', '528733', '451766', '517562', '589657'];

/**
 * Interés total por pagar en cuotas (sobre el total de la compra, con la comisión incluida).
 * Lo cobra la Edge Function pago-tarjeta; para cambiarlo basta con editar esta tabla
 * (y su copia en supabase/functions/_shared/tarjeta.ts).
 */
export const INTERES_CUOTAS: Record<number, number> = { 1: 0, 3: 0.1, 6: 0.2, 12: 0.4 };

/** Total con interés y valor de cada cuota (redondeados a pesos). */
export function calcularCuotas(base: number, cuotas: number) {
  const interes = Math.round(base * (INTERES_CUOTAS[cuotas] ?? 0));
  const total = base + interes;
  return { interes, total, valorCuota: Math.round(total / cuotas) };
}

export const soloDigitos = (valor: string) => valor.replace(/\D/g, '');

/** Algoritmo de Luhn: detecta números mal tipeados. */
export function luhnValido(numero: string) {
  const digitos = soloDigitos(numero);
  if (digitos.length < 13 || digitos.length > 19) return false;

  let suma = 0;
  for (let i = 0; i < digitos.length; i += 1) {
    let digito = Number(digitos[digitos.length - 1 - i]);
    if (i % 2 === 1) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    suma += digito;
  }
  return suma % 10 === 0;
}

export function detectarMarca(numero: string): MarcaTarjeta | null {
  const d = soloDigitos(numero);
  if (/^3[47]/.test(d)) return 'American Express';
  if (/^(589562|527571|527572)/.test(d)) return 'Naranja';
  if (/^(589657|6042|6043|6271)/.test(d)) return 'Cabal';
  if (/^4/.test(d)) return 'Visa';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(d) || /^50/.test(d)) return 'Mastercard';
  return null;
}

export function detectarTipo(numero: string): TipoTarjeta {
  const d = soloDigitos(numero);
  const prueba = TARJETAS_PRUEBA.find((tarjeta) => tarjeta.numero === d);
  if (prueba) return prueba.tipo;
  return BINES_DEBITO.some((bin) => d.startsWith(bin)) ? 'debito' : 'credito';
}

export const largoCvv = (marca: MarcaTarjeta | null) => (marca === 'American Express' ? 4 : 3);

/** "MM/AA" vigente (vence el último día del mes). */
export function vencimientoValido(vencimiento: string, hoy = new Date()) {
  const partes = /^(\d{2})\/(\d{2})$/.exec(vencimiento.trim());
  if (!partes) return false;
  const mes = Number(partes[1]);
  const anio = 2000 + Number(partes[2]);
  if (mes < 1 || mes > 12) return false;
  return new Date(anio, mes, 1) > hoy;
}

/** "4509953566233704" → "4509 9535 6623 3704" (Amex: 4-6-5). */
export function formatearNumero(valor: string) {
  const d = soloDigitos(valor).slice(0, 19);
  if (/^3[47]/.test(d)) {
    return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ');
  }
  return d.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** "1130" → "11/30" mientras se escribe. */
export function formatearVencimiento(valor: string) {
  const d = soloDigitos(valor).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export interface DatosTarjeta {
  numero: string;
  titular: string;
  vencimiento: string;
  cvv: string;
  dni: string;
  cuotas: number;
}

/**
 * Valida todos los campos; devuelve el primer error por campo (vacío = todo bien).
 * Con `tipoEsperado`, rechaza una tarjeta de débito en "crédito" y al revés.
 */
export function validarTarjeta(datos: DatosTarjeta, hoy = new Date(), tipoEsperado?: TipoTarjeta) {
  const errores: Partial<Record<keyof DatosTarjeta, string>> = {};
  const marca = detectarMarca(datos.numero);

  if (!luhnValido(datos.numero)) errores.numero = 'El número de tarjeta no es válido';
  else if (!marca) errores.numero = 'No aceptamos esa tarjeta';
  else if (tipoEsperado && detectarTipo(datos.numero) !== tipoEsperado) {
    errores.numero =
      tipoEsperado === 'credito'
        ? 'Esta tarjeta es de débito. Para pagar en cuotas usá una de crédito, o elegí "Tarjeta de débito".'
        : 'Esta tarjeta es de crédito. Usá una de débito, o elegí "Tarjeta de crédito".';
  }

  if (datos.titular.trim().length < 3) errores.titular = 'Escribí el nombre como figura en la tarjeta';
  if (!vencimientoValido(datos.vencimiento, hoy)) errores.vencimiento = 'Vencimiento inválido o tarjeta vencida';
  if (soloDigitos(datos.cvv).length !== largoCvv(marca) || datos.cvv.trim() !== soloDigitos(datos.cvv)) {
    errores.cvv = `El código tiene ${largoCvv(marca)} dígitos`;
  }
  if (!/^\d{7,8}$/.test(soloDigitos(datos.dni))) errores.dni = 'El DNI tiene 7 u 8 números';
  if (!(datos.cuotas in INTERES_CUOTAS)) errores.cuotas = 'Elegí 1, 3, 6 o 12 cuotas';

  return errores;
}
