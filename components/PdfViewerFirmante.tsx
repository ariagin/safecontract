// components/PdfViewerFirmante.tsx
import { useEffect, useRef, useState } from 'react'

interface Props {
  pdfBase64: string
}

export default function PdfViewerFirmante({ pdfBase64 }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')

  useEffect(() => {
    if (!pdfBase64 || !mountRef.current) return

    const container = mountRef.current
    container.innerHTML = ''

    const loadScript = () => new Promise<void>((resolve, reject) => {
      if ((window as any).pdfjsLib) { resolve(); return }
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      s.onload = () => resolve()
      s.onerror = reject
      document.head.appendChild(s)
    })

    const render = async () => {
      try {
        await loadScript()
        const pdfjsLib = (window as any).pdfjsLib
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

        const raw = atob(pdfBase64)
        const arr = new Uint8Array(raw.length)
        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)

        const pdf = await pdfjsLib.getDocument({ data: arr }).promise

        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p)
          const vp = page.getViewport({ scale: 1.3 })
          const canvas = document.createElement('canvas')
          canvas.width = vp.width
          canvas.height = vp.height
          canvas.style.cssText = 'display:block;margin:0 auto 8px;background:white;max-width:100%;'
          container.appendChild(canvas)
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise
        }
        setStatus('done')
      } catch (e) {
        console.error(e)
        setStatus('error')
      }
    }

    render()
  }, [pdfBase64])

  return (
    <div style={{ marginBottom: 14 }}>
      {status === 'loading' && (
        <div style={{ background: '#071E3D', borderRadius: 10, padding: 40, textAlign: 'center', color: '#90E0EF', fontSize: 14 }}>
          Cargando documento...
        </div>
      )}
      {status === 'error' && (
        <div style={{ background: '#1a1a2e', borderRadius: 10, padding: 40, textAlign: 'center', color: '#f87171', fontSize: 14 }}>
          No se pudo cargar el documento.
        </div>
      )}
      <div
        ref={mountRef}
        style={{
          background: '#525659',
          borderRadius: 10,
          padding: 12,
          border: '1px solid #e5e7eb',
          height: 600,
          overflowY: 'scroll',
          overflowX: 'hidden',
          display: status === 'loading' ? 'none' : 'block',
          WebkitOverflowScrolling: 'touch',
        }}
      />
    </div>
  )
}
