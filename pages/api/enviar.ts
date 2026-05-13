import type { NextApiRequest, NextApiResponse } from 'next'
import { Resend } from 'resend'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

// Storage en memoria (para MVP; en producción usar DB)
const solicitudes: Record<string, any> = global as any

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { pdfBase64, nombreArchivo, firmantes, zonaFirma } = req.body

  if (!pdfBase64 || !firmantes?.length) {
    return res.status(400).json({ error: 'Datos incompletos' })
  }

  const id = uuidv4()
  const timestamp = new Date().toISOString()
  const hash = crypto.createHash('sha256').update(pdfBase64).digest('hex')

  // Guardar en memoria global (persiste durante la sesión del servidor)
  ;(global as any)[`sc_${id}`] = {
    id, pdfBase64, nombreArchivo, firmantes, zonaFirma, hash, timestamp,
    firmasRecibidas: {}
  }

  // URL base
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`

  // Enviar mail a cada firmante
  const mailPromises = firmantes.map((f: { nombre: string; email: string }) =>
    resend.emails.send({
      from: process.env.RESEND_FROM || 'SafeContract <noreply@safecontract.com>',
      to: f.email,
      subject: `${f.nombre}, te invitaron a firmar: ${nombreArchivo || 'Documento'}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#071E3D;border-radius:12px;overflow:hidden;">
          <div style="background:#00B4D8;padding:20px 28px;">
            <h1 style="color:#071E3D;margin:0;font-size:20px;">SafeContract</h1>
            <p style="color:#071E3D;margin:4px 0 0;font-size:13px;opacity:0.8;">SGS World Legaltech</p>
          </div>
          <div style="padding:28px;">
            <p style="color:#e0f0ff;font-size:16px;margin-bottom:16px;">Hola <strong>${f.nombre}</strong>,</p>
            <p style="color:#90E0EF;font-size:14px;line-height:1.6;margin-bottom:24px;">
              Te invitaron a firmar el documento <strong style="color:#fff;">"${nombreArchivo || 'Documento'}"</strong>.<br/>
              Hacé clic en el botón para revisar y firmar.
            </p>
            <a href="${baseUrl}/firmar/${id}?firmante=${encodeURIComponent(f.email)}"
               style="display:inline-block;background:#00B4D8;color:#071E3D;font-weight:700;
                      padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;">
              Firmar documento →
            </a>
            <hr style="border:none;border-top:1px solid rgba(0,180,216,0.2);margin:28px 0;" />
            <p style="color:#4a6080;font-size:11px;line-height:1.5;">
              ID: ${id}<br/>
              SHA-256: ${hash.substring(0, 32)}...<br/>
              Firma electrónica válida según Art. 5, Ley 25.506 (Argentina)<br/>
              Timestamp: ${timestamp}
            </p>
          </div>
        </div>
      `
    })
  )

  try {
    await Promise.all(mailPromises)
    res.status(200).json({ id, hash, timestamp })
  } catch (err: any) {
    console.error('Error Resend:', err)
    res.status(500).json({ error: 'Error enviando mails', detail: err.message })
  }
}
