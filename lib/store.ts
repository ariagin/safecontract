// lib/store.ts
// Store en memoria para el MVP — en producción reemplazar por una DB (PlanetScale, Supabase, etc.)

export interface Firmante {
  nombre: string
  email: string
  firmado: boolean
  timestamp?: string
  ip?: string
  modalidad?: string
  firma?: string // base64 de la firma
}

export interface Solicitud {
  id: string
  nombreArchivo: string
  pdfBase64: string
  mensaje: string
  firmantes: Firmante[]
  sigZone: { x: number; y: number; width: number; height: number; page: number }
  creadoEn: string
  hash: string
}

// Store global (persiste mientras el servidor esté activo)
const store = new Map<string, Solicitud>()

export function guardarSolicitud(solicitud: Solicitud) {
  store.set(solicitud.id, solicitud)
}

export function obtenerSolicitud(id: string): Solicitud | undefined {
  return store.get(id)
}

export function actualizarFirmante(
  solicitudId: string,
  email: string,
  datos: Partial<Firmante>
) {
  const sol = store.get(solicitudId)
  if (!sol) return false
  const idx = sol.firmantes.findIndex(f => f.email === email)
  if (idx === -1) return false
  sol.firmantes[idx] = { ...sol.firmantes[idx], ...datos }
  store.set(solicitudId, sol)
  return true
}
