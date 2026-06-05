// pages/api/descargar/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { obtener } from '@/lib/store';

export const config = { api: { responseLimit: '25mb' } };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const s = obtener(id as string);
  if (!s) return res.status(404).json({ error: 'No encontrado' });

  const base64 = s.pdfFirmadoBase64 || s.pdfBase64;
  const buffer = Buffer.from(base64, 'base64');
  const nombre = (s.estado === 'firmado' ? 'firmado-' : '') + s.nombreArchivo;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
  res.send(buffer);
}
