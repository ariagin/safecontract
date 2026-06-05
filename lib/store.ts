// lib/store.ts
// Almacen simple en memoria del servidor. Guarda las solicitudes de firma
// mientras el servidor esta activo. Para produccion real conviene una base
// de datos (Vercel KV), pero esto funciona para uso personal de pocos docs.

export interface Firmante {
  nombre: string;
  email: string;
}

export interface ZonaFirma {
  xPct: number;   // posicion X en porcentaje (0 a 1) desde la izquierda
  yPct: number;   // posicion Y en porcentaje (0 a 1) desde arriba
  wPct: number;   // ancho en porcentaje del ancho de pagina
  hPct: number;   // alto en porcentaje del alto de pagina
  pagina: number; // indice de pagina (0 = primera)
}

export interface Solicitud {
  id: string;
  pdfBase64: string;
  pdfFirmadoBase64?: string;
  nombreArchivo: string;
  emisor: string;
  firmante: Firmante;
  zona: ZonaFirma;
  mensaje?: string;
  hashOriginal: string;
  hashFirmado?: string;
  estado: 'pendiente' | 'firmado';
  creado: string;
  firmado?: string;
  tipoFirma?: string;
}

const KEY = '__safecontract_store__';

function db(): Map<string, Solicitud> {
  const g = global as any;
  if (!g[KEY]) g[KEY] = new Map<string, Solicitud>();
  return g[KEY];
}

export function guardar(s: Solicitud) {
  db().set(s.id, s);
}

export function obtener(id: string): Solicitud | undefined {
  return db().get(id);
}

export function actualizar(id: string, cambios: Partial<Solicitud>) {
  const s = db().get(id);
  if (!s) return;
  db().set(id, { ...s, ...cambios });
}
