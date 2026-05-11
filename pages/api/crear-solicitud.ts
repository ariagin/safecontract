// pages/api/crear-solicitud.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { v4 as uuidv4 } from 'uuid'
import { Resend } from 'resend'
import { guardarSolicitud, Solicitud } from '@/lib/store'
import { sha256Base64 } from '@/lib/hash'

const resend = new Resend(process.env.RESEND_API_KEY)

export const config = {
  api: { bodyParser: { sizeLimit: '25mb' } },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  try {
    const { pdfBase64, nombreArchivo, firmantes, sigZone, mensaje } = req.body

    if (!pdfBase64 || !firmantes?.length) {
      return res.status(400).json({ error: 'Faltan datos requeridos' })
    }

    const id = uuidv4()
    const hash = sha256Base64(pdfBase64 + id)
    const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`

    const solicitud: Solicitud = {
      id,
      nombreArchivo: nombreArchivo || 'documento.pdf',
      pdfBase64,
      mensaje: mensaje || '',
      firmantes: firmantes.map((f: { nombre: string; email: string }) => ({
        nombre: f.nombre,
        email: f.email,
        firmado: false,
      })),
      sigZone: sigZone || { x: 50, y: 700, width: 200, height: 60, page: 0 },
      creadoEn: new Date().toISOString(),
      hash,
    }

    guardarSolicitud(solicitud)

    // Enviar mail a cada firmante
    const mailPromises = solicitud.firmantes.map(async (firmante) => {
      const linkFirma = `${baseUrl}/firmar/${id}?email=${encodeURIComponent(firmante.email)}`

      await resend.emails.send({
        from: process.env.FROM_EMAIL || 'SafeContract <onboarding@resend.dev>',
        to: firmante.email,
        subject: `Tenés un documento para firmar — ${solicitud.nombreArchivo}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#071E3D;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:700;color:white;">Safe<span style="color:#00B4D8;">Contract</span></p>
            <p style="margin:6px 0 0;font-size:11px;color:#90E0EF;letter-spacing:0.08em;text-transform:uppercase;">SGS World · Firma Electrónica</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="font-size:16px;color:#071E3D;font-weight:600;margin:0 0 8px;">Hola ${firmante.nombre},</p>
            <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 20px;">Tenés un documento pendiente de firma:</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:24px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0;font-size:13px;color:#666;">Documento</p>
                <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#071E3D;">${solicitud.nombreArchivo}</p>
                ${mensaje ? `<p style="margin:12px 0 0;font-size:13px;color:#555;font-style:italic;">"${mensaje}"</p>` : ''}
              </td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${linkFirma}" style="display:inline-block;background:#00B4D8;color:#071E3D;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:8px;">
                  Firmar documento →
                </a>
              </td></tr>
            </table>

            <p style="font-size:11px;color:#999;margin:24px 0 0;line-height:1.6;text-align:center;">
              Este link es personal e intransferible. Al firmar confirmás tu identidad en los términos del Art. 5 de la Ley 25.506 de Firma Digital de la República Argentina.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#999;">SGS World Legaltech · Innovación Legal para un Mundo Digital</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      })
    })

    await Promise.all(mailPromises)

    return res.status(200).json({ id, hash, mensaje: 'Solicitud creada y mails enviados' })
  } catch (error) {
    console.error('Error crear-solicitud:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
