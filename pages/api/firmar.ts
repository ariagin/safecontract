// pages/api/firmar.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { obtener, actualizar } from '@/lib/store';
import { estamparFirma } from '@/lib/estampar';

export const config = { api: { bodyParser: { sizeLimit: '25mb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { id, firmaDataUrl, tipoFirma } = req.body;
    if (!id || !firmaDataUrl) return res.status(400).json({ error: 'Faltan datos.' });

    const s = obtener(id);
    if (!s) return res.status(404).json({ error: 'Solicitud no encontrada.' });
    if (s.estado === 'firmado') return res.status(409).json({ error: 'Este documento ya fue firmado.' });

    const { pdfFirmadoBase64, hashFirmado } = await estamparFirma(s.pdfBase64, firmaDataUrl, s.zona);

    actualizar(id, {
      pdfFirmadoBase64, hashFirmado, estado: 'firmado',
      firmado: new Date().toISOString(), tipoFirma: tipoFirma || 'manuscrita',
    });

    return res.status(200).json({
      ok: true, hashFirmado, firmado: new Date().toISOString(),
    });
  } catch (error) {
    console.error('firmar:', error);
    return res.status(500).json({ error: 'Error al procesar la firma.' });
  }
}
