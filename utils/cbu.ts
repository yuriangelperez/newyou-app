/** Valida un CBU o CVU (22 números) con sus dos dígitos verificadores. El servidor repite el control. */
export function cbuValido(cbu: string) {
  const d = cbu.replace(/\D/g, '');
  if (d.length !== 22) {
    return false;
  }
  const verificador = (digitos: string, pesos: number[]) =>
    (10 - (digitos.split('').reduce((suma, c, i) => suma + Number(c) * pesos[i], 0) % 10)) % 10;
  return (
    verificador(d.slice(0, 7), [7, 1, 3, 9, 7, 1, 3]) === Number(d[7]) &&
    verificador(d.slice(8, 21), [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]) === Number(d[21])
  );
}

/** Alias de CBU: 6 a 20 caracteres, letras, números, punto y guion. */
export function aliasValido(alias: string) {
  return /^[A-Za-z0-9.-]{6,20}$/.test(alias.trim());
}

/** "•••• 1234" para mostrar la cuenta sin exponerla. */
export function enmascararCbu(cbu: string | null | undefined) {
  const d = (cbu ?? '').replace(/\D/g, '');
  return d.length >= 4 ? `•••• ${d.slice(-4)}` : '';
}

/** Lunes de la semana de una fecha, como "2026-11-02". */
export function lunesDeLaSemana(fecha: Date) {
  const copia = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dia = copia.getUTCDay() || 7;
  copia.setUTCDate(copia.getUTCDate() - (dia - 1));
  return copia.toISOString().slice(0, 10);
}

/** Lunes de la semana anterior (la que se liquida). */
export function semanaALiquidar(hoy = new Date()) {
  const haceUnaSemana = new Date(hoy);
  haceUnaSemana.setDate(hoy.getDate() - 7);
  return lunesDeLaSemana(haceUnaSemana);
}

/** "2026-11-02" → "02/11 al 08/11". */
export function textoSemana(lunes: string) {
  const inicio = new Date(`${lunes}T12:00:00Z`);
  const fin = new Date(inicio);
  fin.setUTCDate(inicio.getUTCDate() + 6);
  const f = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${f(inicio)} al ${f(fin)}`;
}
