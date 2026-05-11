// components/PdfViewerFirmante.tsx
import { useEffect, useRef, useState } from 'react'

interface Props {
  pdfBase64: string
}

export default function PdfViewerFirmante({ pdfBase64 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [numPages, setNumPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const renderRef = useRef(false)

  useEffect(() => {
    if (!pdfBase64 || renderRef.current) return
    renderRef.current = true

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = async () => {
      try {
        const pdfjsLib = (window as any).pdfjsLib
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

        const raw = atob(pdfBase64)
        const arr = new Uint8Array(raw.length)
        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)

        const pdf = await pdfjsLib.getDocument({ data: arr }).promise
        setNumPages(pdf.numPages)

        if (!containerRef.current) return
        containerRef.current.innerHTML = ''

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum)
          const viewport = page.getViewport({ scale: 1.4 })

          const wrapper = document.createElement('div')
          wrapper.style.cssText = `
            margin: 0 auto 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            background: white;
            width: fit-content;
          `

          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.display = 'block'

          wrapper.appendChild(canvas)
          containerRef.current.appendChild(wrapper)

          const ctx = canvas.getContext('2d')!
          await page.render({ canvasContext: ctx, viewport }).promise
        }
        setLoading(false)
      } catch (e) {
        console.error(e)
        setError(true)
        setLoading(false)
      }
    }
    script.onerror = () => { setError(true); setLoading(false) }
    document.head.appendChild(script)
  }, [pdfBase64])

  return (
    <div style={{
      background: '#525659',
      borderRadius: 10,
      padding: '16px 8px',
      marginBottom: 14,
      border: '1px solid #e5e7eb',
      maxHeight: 600,
      overflowY: 'auto',
      overflowX: 'auto',
    }}>
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#90E0EF', fontSize: 14 }}>
          <div style={{ width: 28, height: 28, border: '2px solid rgba(0,180,216,0.3)', borderTopColor: '#00B4D8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Cargando documento...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {error && (
        <div style={{ textAlign: 'center', padding: 40, color: '#f87171', fontSize: 14 }}>
          No se pudo cargar el documento. Intentá recargar la página.
        </div>
      )}
      <div ref={containerRef} style={{ display: loading ? 'none' : 'block' }} />
      {!loading && numPages > 1 && (
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#90E0EF' }}>
          {numPages} páginas · Scrolleá para ver todo
        </div>
      )}
    </div>
  )
}
