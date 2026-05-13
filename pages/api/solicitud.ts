import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const { id } = req.query
  const solicitud = (global as any)[`sc_${id}`]
  if (!solicitud) return res.status(404).json({ error: 'No encontrado' })
  res.status(200).json(solicitud)
}
