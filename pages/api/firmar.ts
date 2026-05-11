// pages/api/firmar.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { PDFDocument, rgb } from 'pdf-lib'
import { Resend } from 'resend'
import { obtenerSolicitud, actualizarFirmante } from '@/lib/store'
import { sha256Base64 } from '@/lib/hash'

const resend = new Resend(process.env.RESEND_API_KEY)

export const config = {
  api: { bodyParser: { sizeLimit: '25mb' } },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  try {
    const { solicitudId, email, nombre, dni, firmaBase64, modalidad } = req.body

    if (!solicitudId || !email || !firmaBase64) {
      return res.status(400).json({ error: 'Faltan datos requeridos' })
    }

    const solicitud = obtenerSolicitud(solicitudId)
    if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' })

    const firmante = solicitud.firmantes.find(f => f.email === email)
    if (!firmante) return res.status(403).json({ error: 'Email no autorizado para esta solicitud' })
    if (firmante.firmado) return res.status(409).json({ error: 'Este documento ya fue firmado' })

    const timestamp = new Date().toISOString()
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'desconocida'

    // Cargar el PDF original
    const pdfBytes = Buffer.from(solicitud.pdfBase64, 'base64')
    const pdfDoc = await PDFDocument.load(pdfBytes)

    const pageIndex = solicitud.sigZone.page || 0
    const pages = pdfDoc.getPages()
    const page = pages[Math.min(pageIndex, pages.length - 1)]
    const { width: pageWidth, height: pageHeight } = page.getSize()

    // Calcular posición real en el PDF
    // sigZone viene en porcentaje relativo al contenedor visual
    const sigX = (solicitud.sigZone.x / 100) * pageWidth
    const sigY = pageHeight - (solicitud.sigZone.y / 100) * pageHeight - solicitud.sigZone.height
    const sigW = solicitud.sigZone.width
    const sigH = solicitud.sigZone.height

    // Embeber la firma según modalidad
    if (modalidad === 'draw' || modalidad === 'img') {
      // firmaBase64 es una imagen PNG o JPG
      let imgEmbed
      if (firmaBase64.includes('data:image/png') || modalidad === 'draw') {
        const imgData = firmaBase64.replace(/^data:image\/png;base64,/, '')
        imgEmbed = await pdfDoc.embedPng(Buffer.from(imgData, 'base64'))
      } else {
        const imgData = firmaBase64.replace(/^data:image\/jpeg;base64,/, '').replace(/^data:image\/jpg;base64,/, '')
        imgEmbed = await pdfDoc.embedJpg(Buffer.from(imgData, 'base64'))
      }
      page.drawImage(imgEmbed, { x: sigX, y: sigY, width: sigW, height: sigH })
    } else if (modalidad === 'type') {
      // Firma tipeada: texto en cursiva
      page.drawText(firmaBase64, {
        x: sigX + 4,
        y: sigY + sigH / 2 - 8,
        size: 20,
        color: rgb(0.027, 0.118, 0.239),
        opacity: 0.85,
      })
    }

    // Agregar línea de certificación al pie del documento
    const lastPage = pages[pages.length - 1]
    const certText = `Firmado electrónicamente por ${nombre || firmante.nombre} <${email}> | ${timestamp} | IP: ${ip} | Ley 25.506 Art.5`
    lastPage.drawText(certText, {
      x: 28,
      y: 20,
      size: 7,
      color: rgb(0.4, 0.4, 0.4),
      opacity: 0.7,
    })

    const pdfFirmadoBytes = await pdfDoc.save()
    const pdfFirmadoBase64 = Buffer.from(pdfFirmadoBytes).toString('base64')

    // Generar hash del PDF firmado
    const hashFirmado = sha256Base64(pdfFirmadoBase64)

    // Actualizar estado del firmante
    actualizarFirmante(solicitudId, email, {
      firmado: true,
      timestamp,
      ip,
      modalidad,
      firma: firmaBase64.substring(0, 100), // solo guardar primeros bytes como referencia
    })

    // Enviar PDF firmado por mail al firmante y al remitente
    const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`

    await resend.emails.send({
      from: process.env.FROM_EMAIL || 'SafeContract <onboarding@resend.dev>',
      to: email,
      subject: `✓ Documento firmado — ${solicitud.nombreArchivo}`,
      attachments: [
        {
          filename: `FIRMADO_${solicitud.nombreArchivo}`,
          content: pdfFirmadoBase64,
        },
      ],
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#071E3D;padding:28px 32px;text-align:center;">
          <p style="margin:0;font-size:22px;font-weight:700;color:white;">Safe<span style="color:#00B4D8;">Contract</span></p>
          <p style="margin:6px 0 0;font-size:11px;color:#90E0EF;letter-spacing:0.08em;text-transform:uppercase;">SGS World · Firma Electrónica</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="font-size:16px;color:#1D9E75;font-weight:600;margin:0 0 16px;">✓ Documento firmado correctamente</p>
          <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 20px;">Encontrás adjunto el PDF firmado. A continuación los datos del certificado:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:16px;">
            <tr><td style="padding:16px 20px;font-family:monospace;font-size:12px;color:#555;line-height:1.8;">
              <b>Documento:</b> ${solicitud.nombreArchivo}<br>
              <b>Firmante:</b> ${nombre || firmante.nombre}<br>
              <b>Email:</b> ${email}<br>
              <b>Timestamp:</b> ${timestamp}<br>
              <b>SHA-256:</b> ${hashFirmado}<br>
              <b>IP:</b> ${ip}<br>
              <b>Marco legal:</b> Ley 25.506 Art. 5 — República Argentina
            </td></tr>
          </table>
          <p style="font-size:11px;color:#999;margin:0;line-height:1.6;text-align:center;">Este certificado acredita la firma electrónica del documento.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })

    return res.status(200).json({
      ok: true,
      hashFirmado,
      timestamp,
      pdfFirmadoBase64,
      mensaje: 'Documento firmado. Se envió copia por mail.',
    })
  } catch (error) {
    console.error('Error firmar:', error)
    return res.status(500).json({ error: 'Error al procesar la firma' })
  }
}
