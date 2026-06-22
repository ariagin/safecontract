// pages/api/firmar.ts
// 1) Estampa la grafia de la firma en el PDF.
// 2) Captura la evidencia del firmante (IP, fecha, dispositivo).
// 3) Firma el PDF criptograficamente con PAdES (certificado de la plataforma).
// 4) Guarda el PDF firmado y los datos.
import type { NextApiRequest, NextApiResponse } from 'next';
import { obtener, actualizar } from '@/lib/store';
import { estamparFirma } from '@/lib/estampar';
import { firmarPades, type Evidencia } from '@/lib/pades';
import { Resend } from 'resend';
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

    // 1) Estampar la grafia (con nombre y leyenda al costado)
    const { pdfEstampadoBuffer } = await estamparFirma(s.pdfBase64, firmaDataUrl, s.zona, s.firmante.nombre);

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

    // 5) Enviar copia del documento firmado al firmante y al estudio
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const estudio = process.env.MAIL_ESTUDIO || process.env.RESEND_FROM || '';
        const destinatarios = Array.from(new Set([s.firmante.email, estudio].filter(Boolean)));
        const nombreFinal = 'firmado-' + (s.nombreArchivo || 'documento.pdf');
        await resend.emails.send({
          from: process.env.RESEND_FROM || 'SafeContract <onboarding@resend.dev>',
          to: destinatarios,
          subject: `Documento firmado: ${s.nombreArchivo}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
              <div style="background:#00B4D8;padding:18px 24px;border-radius:10px 10px 0 0">
                <h2 style="color:#071E3D;margin:0">SafeContract</h2>
              </div>
              <div style="padding:22px;background:#071E3D;color:#e0f0ff;border-radius:0 0 10px 10px">
                <p>El documento <strong>"${s.nombreArchivo}"</strong> fue firmado electrónicamente.</p>
                <p style="font-size:13px;color:#90E0EF">Firmante: ${s.firmante.nombre} (${s.firmante.email})<br>
                Fecha: ${new Date(fecha).toLocaleString('es-AR')}<br>
                Hash SHA-256: ${hashFirmado.substring(0,40)}...</p>
                <p style="font-size:12px;color:#4a6080">Se adjunta el documento firmado. Firma electrónica válida según Art. 5 de la Ley 25.506.</p>
              </div>
            </div>`,
          attachments: [{ filename: nombreFinal, content: Buffer.from(pdfPades).toString('base64') }],
        });
      } catch (e: any) {
        console.error('mail documento firmado:', e?.message || e);
        // no rompemos la firma si el mail falla
      }
    }

    return res.status(200).json({ ok: true, hashFirmado, firmado: fecha, evidencia });
  } catch (error: any) {
    console.error('firmar:', error?.message || error);
    return res.status(500).json({ error: 'Error al procesar la firma.' });
  }
}
