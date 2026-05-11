// pages/api/pdf/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { obtenerSolicitud } from '@/lib/store'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' })
  const { id } = req.query
  const solicitud = obtenerSolicitud(id as string)
  if (!solicitud) return res.status(404).json({ error: 'No encontrado' })
  return res.status(200).json({ pdfBase64: solicitud.pdfBase64 })
}
