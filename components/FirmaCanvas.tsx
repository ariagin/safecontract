import { useRef, useEffect, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'

interface Props {
  onChange: (dataUrl: string | null) => void
}

export default function FirmaCanvas({ onChange }: Props) {
  const sigRef = useRef<SignatureCanvas>(null)
  const [vacia, setVacia] = useState(true)

  const handleEnd = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      setVacia(false)
      onChange(sigRef.current.toDataURL('image/png'))
    }
  }

  const limpiar = () => {
    sigRef.current?.clear()
    setVacia(true)
    onChange(null)
  }

  return (
    <div>
      <div style={{
        border: '2px solid rgba(0,180,216,0.4)',
        borderRadius: 10,
        background: '#fff',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <SignatureCanvas
          ref={sigRef}
          penColor='#071E3D'
          canvasProps={{
            width: 560,
            height: 160,
            style: { display: 'block', width: '100%', height: 160 }
          }}
          onEnd={handleEnd}
        />
        {vacia && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#aaa', fontSize: 14, pointerEvents: 'none'
          }}>
            Dibujá tu firma aquí con el mouse o dedo
          </div>
        )}
      </div>
      {!vacia && (
        <button
          onClick={limpiar}
          style={{
            marginTop: 8, background: 'transparent',
            border: '1px solid rgba(0,180,216,0.3)',
            color: '#90E0EF', borderRadius: 6, padding: '5px 14px',
            cursor: 'pointer', fontSize: 13
          }}
        >
          ✕ Borrar y volver a firmar
        </button>
      )}
    </div>
  )
}
