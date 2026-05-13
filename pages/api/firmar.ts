import type { NextApiRequest, NextApiResponse } from 'next'
import { Resend } from 'resend'
import { PDFDocument } from 'pdf-lib'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { id, emailFirmante, nombreFirmante, firmaDataUrl, tipoFirma } = req.body
  const solicitud = (global as any)[`sc_${id}`]

  if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' })
  if (!firmaDataUrl) return res.status(400).json({ error: 'Falta la firma' })

  const timestamp = new Date().toISOString()

  // Embeber firma en el PDF
  try {
    const pdfBytes = Buffer.from(solicitud.pdfBase64, 'base64')
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const paginas = pdfDoc.getPages()
    const pagina = paginas[0]
    const { width, height } = pagina.getSize()

    // Zona de firma (default si no se definió)
    const zona = solicitud.zonaFirma || { x: 0.1, y: 0.05, w: 0.35, h: 0.08 }

    // Convertir firma PNG a bytes
    const firmaBase64 = firmaDataUrl.replace(/^data:image\/\w+;base64,/, '')
    const firmaBytes = Buffer.from(firmaBase64, 'base64')
    const firmaImg = await pdfDoc.embedPng(firmaBytes)

    // Posición en la página
    const x = zona.x * width
    const y = zona.y * height
    const w = zona.w * width
    const h = zona.h * height

    pagina.drawImage(firmaImg, { x, y: height - y - h, width: w, height: h })

    // Agregar texto del certificado al pie
    const { rgb } = await import('pdf-lib')
    pagina.drawText(
      `Firmado electrónicamente por ${nombreFirmante} <${emailFirmante}> | ${timestamp} | Art. 5 Ley 25.506`,
      { x: 30, y: 18, size: 7, color: rgb(0.3, 0.3, 0.3) }
    )

    const pdfFirmadoBytes = await pdfDoc.save()
    const pdfFirmadoB64 = Buffer.from(pdfFirmadoBytes).toString('base64')
    const hashFirmado = crypto.createHash('sha256').update(pdfFirmadoB64).digest('hex')

    // Guardar firma
    solicitud.firmasRecibidas[emailFirmante] = {
      nombre: nombreFirmante,
      email: emailFirmante,
      timestamp,
      tipoFirma,
      hashFirmado
    }
    solicitud.pdfFirmadoB64 = pdfFirmadoB64

    // Enviar PDF firmado al creador (si hay RESEND_NOTIFY_EMAIL)
    const notifyEmail = process.env.RESEND_NOTIFY_EMAIL
    if (notifyEmail) {
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'SafeContract <noreply@safecontract.com>',
        to: notifyEmail,
        subject: `✅ ${nombreFirmante} firmó "${solicitud.nombreArchivo}"`,
        attachments: [{
          filename: `firmado_${solicitud.nombreArchivo || 'documento.pdf'}`,
          content: pdfFirmadoB64
        }],
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
            <h2 style="color:#071E3D;">✅ Documento firmado</h2>
            <p><strong>${nombreFirmante}</strong> (${emailFirmante}) firmó el documento.</p>
            <p style="font-size:12px;color:#666;">
              Timestamp: ${timestamp}<br/>
              SHA-256: ${hashFirmado.substring(0,32)}...<br/>
              ID solicitud: ${id}
            </p>
          </div>
        `
      })
    }

    res.status(200).json({ ok: true, hashFirmado, timestamp })
  } catch (err: any) {
    console.error('Error procesando firma:', err)
    res.status(500).json({ error: 'Error al procesar la firma', detail: err.message })
  }
}
