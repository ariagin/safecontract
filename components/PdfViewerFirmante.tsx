// components/PdfViewerFirmante.tsx
// Usa blob URL local — sin scripts externos, compatible con CSP de Vercel
import { useEffect, useState } from 'react'

interface Props {
  pdfBase64: string
}

export default function PdfViewerFirmante({ pdfBase64 }: Props) {
  const [blobUrl, setBlobUrl] = useState<string>('')

  useEffect(() => {
    if (!pdfBase64) return
    const binary = atob(pdfBase64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    setBlobUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [pdfBase64])

  if (!blobUrl) return (
    <div style={{ background: '#071E3D', borderRadius: 10, padding: 40, textAlign: 'center', color: '#90E0EF', marginBottom: 14 }}>
      Cargando documento...
    </div>
  )

  return (
    <div style={{ marginBottom: 14, borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      <object
        data={blobUrl}
        type="application/pdf"
        style={{ width: '100%', height: 650, display: 'block' }}
      >
        <div style={{ padding: 20, background: '#071E3D', color: '#90E0EF', textAlign: 'center' }}>
          Tu navegador no puede mostrar el PDF aquí.{' '}
          <a href={blobUrl} target="_blank" rel="noreferrer" style={{ color: '#00B4D8' }}>
            Abrilo en una pestaña nueva →
          </a>
        </div>
      </object>
    </div>
  )
}
