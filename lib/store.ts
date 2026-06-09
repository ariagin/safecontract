// lib/store.ts
// Almacenamiento permanente en Vercel Blob (store PRIVADO). Cada solicitud
// se guarda como un archivo JSON (solicitudes/<id>.json). Privado = nadie
// accede a un escrito sin el token del servidor. Asi no se pierde cuando el
// servidor de Vercel reinicia (que era el problema "Solicitud no encontrada").
import { put, get } from '@vercel/blob';

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
const token = process.env.BLOB_READ_WRITE_TOKEN;

// Guarda (o sobrescribe) una solicitud como JSON en el Blob privado.
export async function guardar(s: Solicitud): Promise<void> {
  await put(ruta(s.id), JSON.stringify(s), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    token,
  });
}

// Lee una solicitud por id desde el Blob privado. undefined si no existe.
export async function obtener(id: string): Promise<Solicitud | undefined> {
  try {
    const res = await get(ruta(id), { access: 'private', token });
    if (!res) return undefined;
    const texto = await new Response(res.stream).text();
    return JSON.parse(texto) as Solicitud;
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
