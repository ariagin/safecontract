// lib/estampar.ts
// Motor de estampado de firma. Toma el PDF original + la firma (imagen)
// + la zona donde va, y devuelve el PDF firmado. Conversion de coordenadas
// navegador (mide desde arriba) -> PDF (mide desde abajo) ya resuelta.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import crypto from 'crypto';
import type { ZonaFirma } from './store';

export async function estamparFirma(
  pdfBase64: string,
  firmaDataUrl: string,
  zona: ZonaFirma,
  nombreFirmante?: string
): Promise<{ pdfEstampadoBuffer: Buffer; pdfFirmadoBase64: string; hashFirmado: string }> {
  const pdfBytes = Buffer.from(pdfBase64, 'base64');
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // La firma viene como data URL (data:image/png;base64,....)
  const coma = firmaDataUrl.indexOf(',');
  const meta = firmaDataUrl.substring(0, coma);
  const datos = firmaDataUrl.substring(coma + 1);
  const firmaBytes = Buffer.from(datos, 'base64');

  const esPng = meta.includes('png');
  const firmaImg = esPng
    ? await pdfDoc.embedPng(firmaBytes)
    : await pdfDoc.embedJpg(firmaBytes);

  const paginas = pdfDoc.getPages();
  const idx = Math.min(zona.pagina, paginas.length - 1);
  const pagina = paginas[idx];
  const { width: pw, height: ph } = pagina.getSize();

  // CONVERSION CRITICA: invertir eje Y
  const anchoZona = zona.wPct * pw;
  const altoZona = zona.hPct * ph;
  const x = zona.xPct * pw;
  const yDesdeArriba = zona.yPct * ph;
  const yZona = ph - yDesdeArriba - altoZona;

  // Ajustar la firma DENTRO del recuadro sin deformarla (mantener proporcion).
  // Se calcula la escala que hace entrar la imagen completa en la zona, y se
  // centra. Asi una firma vertical, horizontal o cuadrada se ve siempre bien.
  const dims = firmaImg.scale(1);
  const escala = Math.min(anchoZona / dims.width, altoZona / dims.height);
  const anchoFirma = dims.width * escala;
  const altoFirma = dims.height * escala;
  const x2 = x + (anchoZona - anchoFirma) / 2;   // centrado horizontal
  const y2 = yZona + (altoZona - altoFirma) / 2;  // centrado vertical

  pagina.drawImage(firmaImg, { x: x2, y: y2, width: anchoFirma, height: altoFirma });

  // Recuadro con nombre del firmante + leyenda legal, al costado derecho de la grafia.
  const fuente = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fuenteBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const nombre = (nombreFirmante || '').toUpperCase();
  const leyenda1 = 'Firmado Electronicamente con SAFECONTRACT';
  const leyenda2 = 'ART. 5 LEY 25.506';

  // El recuadro va a la derecha de la zona de firma, alineado verticalmente.
  const boxX = x + anchoZona + 8;
  const boxAncho = Math.min(180, pw - boxX - 12); // no pasar el borde de la pagina
  if (boxAncho > 60) {
    const boxAlto = Math.max(altoZona, 40);
    const boxY = yZona + (altoZona - boxAlto) / 2;
    pagina.drawRectangle({
      x: boxX, y: boxY, width: boxAncho, height: boxAlto,
      borderColor: rgb(0.0, 0.4, 0.6), borderWidth: 0.8,
      color: rgb(0.96, 0.99, 1), opacity: 0.6,
    });
    let ty = boxY + boxAlto - 13;
    if (nombre) {
      pagina.drawText(nombre.substring(0, 32), { x: boxX + 6, y: ty, size: 8, font: fuenteBold, color: rgb(0.03, 0.12, 0.24) });
      ty -= 12;
    }
    pagina.drawText(leyenda1, { x: boxX + 6, y: ty, size: 6, font: fuente, color: rgb(0.2, 0.3, 0.4) });
    ty -= 9;
    pagina.drawText(leyenda2, { x: boxX + 6, y: ty, size: 6, font: fuenteBold, color: rgb(0.0, 0.4, 0.6) });
  }

  const pdfFirmado = await pdfDoc.save({ useObjectStreams: false });
  const pdfEstampadoBuffer = Buffer.from(pdfFirmado);
  const hashFirmado = crypto
    .createHash('sha256')
    .update(pdfFirmado)
    .digest('hex');

  return {
    pdfEstampadoBuffer,
    pdfFirmadoBase64: Buffer.from(pdfFirmado).toString('base64'),
    hashFirmado,
  };
}

export function hashSha256(base64: string): string {
  return crypto
    .createHash('sha256')
    .update(Buffer.from(base64, 'base64'))
    .digest('hex');
}
