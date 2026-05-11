// pages/api/solicitud/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { obtenerSolicitud } from '@/lib/store'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' })

  const { id } = req.query
  const solicitud = obtenerSolicitud(id as string)

  if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' })

  // No devolver el PDF completo en esta ruta para ahorrar ancho de banda
  const { pdfBase64, ...resto } = solicitud
  return res.status(200).json({ ...resto, tienePdf: !!pdfBase64 })
}
