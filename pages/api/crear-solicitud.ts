// pages/api/crear-solicitud.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { guardar, type Solicitud } from '@/lib/store';
import { hashSha256 } from '@/lib/estampar';

export const config = { api: { bodyParser: { sizeLimit: '25mb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { pdfBase64, nombreArchivo, emisor, firmante, zona, mensaje } = req.body;

    if (!pdfBase64 || !firmante?.email || !zona) {
      return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }

    const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    const hashOriginal = hashSha256(pdfBase64);

    const solicitud: Solicitud = {
      id, pdfBase64, nombreArchivo: nombreArchivo || 'documento.pdf',
      emisor: emisor || 'SGS World Legaltech',
      firmante, zona, mensaje,
      hashOriginal, estado: 'pendiente', creado: new Date().toISOString(),
    };
    await guardar(solicitud);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;
    const linkFirma = `${baseUrl}/firmar/${id}`;

    // Enviar mail solo si hay API key configurada
    let mailEnviado = false;
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM || 'SafeContract <onboarding@resend.dev>',
          to: firmante.email,
          subject: `${firmante.nombre}, tenés un documento para firmar`,
          html: mailHtml(firmante.nombre, solicitud.nombreArchivo, linkFirma, id, hashOriginal, mensaje),
        });
        mailEnviado = true;
      } catch (e) {
        console.error('Error Resend:', e);
      }
    }

    return res.status(200).json({ id, hashOriginal, linkFirma, mailEnviado });
  } catch (error) {
    console.error('crear-solicitud:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

function mailHtml(nombre: string, archivo: string, link: string, id: string, hash: string, mensaje?: string) {
  return `
  <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#071E3D;border-radius:12px;overflow:hidden">
    <div style="background:#00B4D8;padding:20px 28px">
      <h1 style="color:#071E3D;margin:0;font-size:20px">SafeContract</h1>
      <p style="color:#071E3D;margin:4px 0 0;font-size:13px;opacity:.8">SGS World · Innovación Legal para un Mundo Digital</p>
    </div>
    <div style="padding:28px">
      <p style="color:#e0f0ff;font-size:16px;margin:0 0 16px">Hola <strong>${nombre}</strong>,</p>
      <p style="color:#90E0EF;font-size:14px;line-height:1.6;margin:0 0 8px">Te invitaron a firmar el documento <strong style="color:#fff">"${archivo}"</strong>.</p>
      ${mensaje ? `<p style="color:#90E0EF;font-size:13px;line-height:1.6;font-style:italic;margin:0 0 20px">"${mensaje}"</p>` : ''}
      <a href="${link}" style="display:inline-block;background:#00B4D8;color:#071E3D;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;margin-top:8px">Revisar y firmar →</a>
      <hr style="border:none;border-top:1px solid rgba(0,180,216,.2);margin:28px 0">
      <p style="color:#4a6080;font-size:11px;line-height:1.6">ID de solicitud: ${id}<br>SHA-256 (documento original): ${hash.substring(0, 40)}...<br>Firma electrónica válida según Art. 5 de la Ley 25.506 de la República Argentina.</p>
    </div>
  </div>`;
}
