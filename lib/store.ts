// lib/store.ts
// Almacenamiento permanente en Vercel Blob. Cada solicitud se guarda como
// un archivo JSON (solicitudes/<id>.json). Asi no se pierde cuando el
// servidor de Vercel reinicia (que era el problema "Solicitud no encontrada").
import { put, head } from '@vercel/blob';

export interface Firmante {
  nombre: string;
  email: string;
}

export interface ZonaFirma {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  pagina: number;
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

const carpeta = 'solicitudes';
const ruta = (id: string) => `${carpeta}/${id}.json`;

// Token del Blob, leido explicitamente del entorno. Lo pasamos en cada
// llamada para no depender de que la libreria lo encuentre sola.
const token = process.env.BLOB_READ_WRITE_TOKEN;

// Guarda (o sobrescribe) una solicitud como JSON en el Blob.
export async function guardar(s: Solicitud): Promise<void> {
  // Diagnostico: avisa en los logs si el token no esta o tiene formato raro
  // (no muestra el secreto, solo si existe y como empieza).
  console.log('[Blob] token presente:', !!token, '| empieza con vercel_blob_rw:', (token || '').startsWith('vercel_blob_rw_'));
  await put(ruta(s.id), JSON.stringify(s), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,   // el nombre del archivo es fijo (el id)
    token,
  });
}

// Lee una solicitud por id. Devuelve undefined si no existe.
export async function obtener(id: string): Promise<Solicitud | undefined> {
  try {
    const info = await head(ruta(id), { token });
    if (!info?.url) return undefined;
    const resp = await fetch(info.url, { cache: 'no-store' });
    if (!resp.ok) return undefined;
    return (await resp.json()) as Solicitud;
  } catch {
    return undefined;
  }
}

// Actualiza una solicitud existente (lee, fusiona, vuelve a guardar).
export async function actualizar(id: string, cambios: Partial<Solicitud>): Promise<void> {
  const s = await obtener(id);
  if (!s) return;
  await guardar({ ...s, ...cambios });
}
