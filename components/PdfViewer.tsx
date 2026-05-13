import { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Worker local para evitar problemas de CORS con CDN
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

interface Props {
  pdfBase64: string
  nombreArchivo?: string
}

export default function PdfViewer({ pdfBase64, nombreArchivo }: Props) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageActual, setPageActual] = useState<number>(1)
  const [error, setError] = useState<string>('')

  const pdfData = useCallback(() => {
    if (!pdfBase64) return null
    const binary = atob(pdfBase64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return { data: bytes }
  }, [pdfBase64])

  if (!pdfBase64) return null

  return (
    <div style={{
      background: '#0a2444',
      borderRadius: 12,
      border: '1px solid rgba(0,180,216,0.25)',
      overflow: 'hidden',
      marginBottom: 20
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(0,180,216,0.15)',
        background: 'rgba(0,180,216,0.05)'
      }}>
        <span style={{ fontSize: 13, color: '#90E0EF', display: 'flex', alignItems: 'center', gap: 6 }}>
          📄 {nombreArchivo || 'Documento'}
        </span>
        {numPages > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setPageActual(p => Math.max(1, p - 1))}
              disabled={pageActual <= 1}
              style={{
                background: 'transparent', border: '1px solid rgba(0,180,216,0.4)',
                color: pageActual <= 1 ? '#4a6080' : '#00B4D8',
                borderRadius: 6, padding: '4px 10px', cursor: pageActual <= 1 ? 'not-allowed' : 'pointer',
                fontSize: 14
              }}
            >‹</button>
            <span style={{ fontSize: 13, color: '#90E0EF' }}>
              {pageActual} / {numPages}
            </span>
            <button
              onClick={() => setPageActual(p => Math.min(numPages, p + 1))}
              disabled={pageActual >= numPages}
              style={{
                background: 'transparent', border: '1px solid rgba(0,180,216,0.4)',
                color: pageActual >= numPages ? '#4a6080' : '#00B4D8',
                borderRadius: 6, padding: '4px 10px', cursor: pageActual >= numPages ? 'not-allowed' : 'pointer',
                fontSize: 14
              }}
            >›</button>
          </div>
        )}
      </div>

      {/* Visor */}
      <div style={{
        maxHeight: 580,
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
        padding: '16px 8px',
        background: '#1a2a3a'
      }}>
        {error ? (
          <div style={{ color: '#ff6b6b', padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
            <div>{error}</div>
          </div>
        ) : (
          <Document
            file={pdfData()}
            onLoadSuccess={({ numPages }) => {
              setNumPages(numPages)
              setPageActual(1)
            }}
            onLoadError={(err) => setError('No se pudo cargar el PDF: ' + err.message)}
            loading={
              <div style={{ color: '#90E0EF', padding: 40, textAlign: 'center' }}>
                Cargando documento...
              </div>
            }
          >
            <Page
              pageNumber={pageActual}
              width={Math.min(600, typeof window !== 'undefined' ? window.innerWidth - 40 : 600)}
              renderTextLayer={true}
              renderAnnotationLayer={false}
            />
          </Document>
        )}
      </div>
    </div>
  )
}
