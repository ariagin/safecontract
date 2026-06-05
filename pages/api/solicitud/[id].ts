// pages/api/solicitud/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { obtener } from '@/lib/store';

export const config = { api: { responseLimit: '25mb' } };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });
  const { id } = req.query;
  const s = obtener(id as string);
  if (!s) return res.status(404).json({ error: 'Solicitud no encontrada' });
  // Devuelve todo lo necesario para que el firmante vea y firme
  return res.status(200).json({
    id: s.id, nombreArchivo: s.nombreArchivo, emisor: s.emisor,
    firmante: s.firmante, zona: s.zona, mensaje: s.mensaje,
    estado: s.estado, pdfBase64: s.pdfBase64, hashOriginal: s.hashOriginal,
  });
}
