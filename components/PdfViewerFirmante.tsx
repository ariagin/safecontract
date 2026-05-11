// components/PdfViewerFirmante.tsx
import { useEffect, useState } from 'react'

interface Props { pdfBase64: string; nombreArchivo?: string }

export default function PdfViewerFirmante({ pdfBase64, nombreArchivo }: Props) {
  const [blobUrl, setBlobUrl] = useState<string>('')

  useEffect(() => {
    if (!pdfBase64) return
    try {
      const binary = atob(pdfBase64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setBlobUrl(url)
      return () => URL.revokeObjectURL(url)
    } catch (e) { console.error(e) }
  }, [pdfBase64])

  if (!blobUrl) return (
    <div style={{ background: '#071E3D', borderRadius: 10, padding: 24, marginBottom: 14, textAlign: 'center', color: '#90E0EF' }}>
      Preparando documento...
    </div>
  )

  return (
    <div style={{ marginBottom: 14, borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden', background: '#071E3D' }}>
      {/* Toolbar */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(144,224,239,0.15)' }}>
        <span style={{ fontSize: 13, color: '#90E0EF' }}>📄 {nombreArchivo || 'Documento'}</span>
        <a
          href={blobUrl}
          target="_blank"
          rel="noreferrer"
          style={{ background: '#00B4D8', color: '#071E3D', padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          Abrir PDF completo →
        </a>
      </div>
      {/* Embed */}
      <embed
        src={blobUrl}
        type="application/pdf"
        style={{ width: '100%', height: 620, display: 'block' }}
      />
    </div>
  )
}
