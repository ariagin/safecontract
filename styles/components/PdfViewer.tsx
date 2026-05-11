// components/PdfViewer.tsx
import { useState, useRef, useEffect } from 'react'

interface SigZone {
  xPct: number
  yPct: number
  width: number
  height: number
}

interface Props {
  pdfBase64: string
  firmanteName: string
  sigZone: SigZone
  onSigZoneChange: (z: SigZone) => void
}

export default function PdfViewer({ pdfBase64, firmanteName, sigZone, onSigZoneChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const pdfUrl = `data:application/pdf;base64,${pdfBase64}`

  const getRect = () => containerRef.current?.getBoundingClientRect()

  const handleSigMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDragging(true)
    const rect = getRect()
    if (!rect) return
    const sigX = (sigZone.xPct / 100) * rect.width
    const sigY = (sigZone.yPct / 100) * rect.height
    setOffset({ x: e.clientX - rect.left - sigX, y: e.clientY - rect.top - sigY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    const rect = getRect()
    if (!rect) return
    const x = e.clientX - rect.left - offset.x
    const y = e.clientY - rect.top - offset.y
    onSigZoneChange({
      ...sigZone,
      xPct: Math.max(0, Math.min((x / rect.width) * 100, 100 - (sigZone.width / rect.width) * 100)),
      yPct: Math.max(0, Math.min((y / rect.height) * 100, 100 - (sigZone.height / rect.height) * 100)),
    })
  }

  const handleAreaClick = (e: React.MouseEvent) => {
    if (dragging) return
    const rect = getRect()
    if (!rect) return
    const x = e.clientX - rect.left - sigZone.width / 2
    const y = e.clientY - rect.top - sigZone.height / 2
    onSigZoneChange({
      ...sigZone,
      xPct: Math.max(0, Math.min((x / rect.width) * 100, 100 - (sigZone.width / rect.width) * 100)),
      yPct: Math.max(0, Math.min((y / rect.height) * 100, 100 - (sigZone.height / rect.height) * 100)),
    })
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Toolbar */}
      <div style={{
        background: '#071E3D', padding: '10px 16px',
        borderRadius: '10px 10px 0 0',
        display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
      }}>
        <span style={{ color: '#90E0EF' }}>📄 Documento cargado</span>
        <span style={{
          background: 'rgba(0,180,216,0.2)', color: '#00B4D8',
          borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
        }}>Pág. 1</span>
        <span style={{ marginLeft: 'auto', color: 'rgba(144,224,239,0.6)', fontSize: 11 }}>
          Arrastrá la zona azul para posicionar la firma
        </span>
      </div>

      {/* Contenedor con el PDF real + zona de firma superpuesta */}
      <div
        ref={containerRef}
        style={{ position: 'relative', width: '100%', height: 520, cursor: 'crosshair', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden', background: '#525659' }}
        onClick={handleAreaClick}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        {/* PDF renderizado en iframe */}
        <iframe
          ref={iframeRef}
          src={pdfUrl + '#toolbar=0&navpanes=0&scrollbar=0'}
          style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
          title="Vista previa del documento"
        />

        {/* Zona de firma superpuesta */}
        <div
          style={{
            position: 'absolute',
            left: `${sigZone.xPct}%`,
            top: `${sigZone.yPct}%`,
            width: sigZone.width,
            height: sigZone.height,
            border: '2px solid #00B4D8',
            background: 'rgba(0,180,216,0.12)',
            borderRadius: 6,
            cursor: 'move',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            userSelect: 'none',
            zIndex: 10,
          }}
          onMouseDown={handleSigMouseDown}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#00B4D8' }}>✍ Zona de firma</div>
          <div style={{ fontSize: 10, color: '#0077A8' }}>{firmanteName}</div>
        </div>
      </div>

      <div style={{ padding: '10px 14px', background: '#f9fafb', borderRadius: '0 0 10px 10px', border: '1px solid #e5e7eb', borderTop: 'none' }}>
        <span style={{ fontSize: 11, background: 'rgba(0,180,216,0.1)', color: '#00B4D8', borderRadius: 20, padding: '2px 10px', fontWeight: 500 }}>
          Hacé clic en el documento para mover la zona de firma
        </span>
      </div>
    </div>
  )
}
