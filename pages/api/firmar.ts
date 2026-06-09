// pages/api/firmar.ts
// 1) Estampa la grafia de la firma en el PDF.
// 2) Captura la evidencia del firmante (IP, fecha, dispositivo).
// 3) Firma el PDF criptograficamente con PAdES (certificado de la plataforma).
// 4) Guarda el PDF firmado y los datos.
import type { NextApiRequest, NextApiResponse } from 'next';
import { obtener, actualizar } from '@/lib/store';
import { estamparFirma } from '@/lib/estampar';
import { firmarPades, type Evidencia } from '@/lib/pades';
import crypto from 'crypto';

export const config = { api: { bodyParser: { sizeLimit: '25mb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { id, firmaDataUrl, tipoFirma } = req.body;
    if (!id || !firmaDataUrl) return res.status(400).json({ error: 'Faltan datos.' });

    const s = await obtener(id);
    if (!s) return res.status(404).json({ error: 'Solicitud no encontrada.' });
    if (s.estado === 'firmado') return res.status(409).json({ error: 'Este documento ya fue firmado.' });

    // 1) Estampar la grafia
    const { pdfEstampadoBuffer } = await estamparFirma(s.pdfBase64, firmaDataUrl, s.zona);

    // 2) Capturar evidencia real del firmante
    const ipRaw = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'desconocida';
    const ip = ipRaw.split(',')[0].trim();
    const dispositivo = (req.headers['user-agent'] as string) || 'desconocido';
    const fecha = new Date().toISOString();

    const evidencia: Evidencia = {
      nombre: s.firmante.nombre,
      email: s.firmante.email,
      ip,
      fecha,
      dispositivo: dispositivo.substring(0, 180),
      hashOriginal: s.hashOriginal,
    };

    // 3) Firmar con PAdES
    const pdfPades = await firmarPades(pdfEstampadoBuffer, evidencia);
    const pdfFirmadoBase64 = Buffer.from(pdfPades).toString('base64');
    const hashFirmado = crypto.createHash('sha256').update(pdfPades).digest('hex');

    // 4) Guardar
    await actualizar(id, {
      pdfFirmadoBase64, hashFirmado, estado: 'firmado',
      firmado: fecha, tipoFirma: tipoFirma || 'manuscrita',
      evidencia,
    } as any);

    return res.status(200).json({ ok: true, hashFirmado, firmado: fecha, evidencia });
  } catch (error: any) {
    console.error('firmar:', error?.message || error);
    return res.status(500).json({ error: 'Error al procesar la firma.' });
  }
}
