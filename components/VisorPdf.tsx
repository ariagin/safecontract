// components/VisorPdf.tsx
// Visor de PDF basado en react-pdf. Dibuja el PDF en un <canvas> dentro
// de la pagina, asi NO depende del visor nativo del navegador (que es lo
// que bloqueaba Chrome/Edge con los embed). Funciona en cualquier dominio.
import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// El "worker" de pdf.js se carga desde un CDN. Version atada a la libreria.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface Props {
  pdfBase64: string;
  // si se pasa, muestra la zona de firma encima de la pagina 1
  zona?: { xPct: number; yPct: number; wPct: number; hPct: number };
  // si se pasa, el visor es interactivo: arrastrar mueve la zona
  onZonaCambio?: (z: { xPct: number; yPct: number; wPct: number; hPct: number }) => void;
  anchoMax?: number;
}

export default function VisorPdf({ pdfBase64, zona, onZonaCambio, anchoMax = 720 }: Props) {
  const [numPaginas, setNumPaginas] = useState(0);
  const [ancho, setAncho] = useState(anchoMax);
  const contRef = useRef<HTMLDivElement>(null);
  const arrastrando = useRef(false);

  useEffect(() => {
    const ajustar = () => {
      if (contRef.current) {
        const w = contRef.current.clientWidth;
        setAncho(Math.min(w - 4, anchoMax));
      }
    };
    ajustar();
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, [anchoMax]);

  const fileData = `data:application/pdf;base64,${pdfBase64}`;

  const moverZona = (e: React.MouseEvent) => {
    if (!arrastrando.current || !onZonaCambio || !zona) return;
    const holder = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const xPct = (e.clientX - holder.left) / holder.width - zona.wPct / 2;
    const yPct = (e.clientY - holder.top) / holder.height - zona.hPct / 2;
    onZonaCambio({
      ...zona,
      xPct: Math.max(0, Math.min(xPct, 1 - zona.wPct)),
      yPct: Math.max(0, Math.min(yPct, 1 - zona.hPct)),
    });
  };

  return (
    <div ref={contRef} className="pdf-wrap">
      <Document
        file={fileData}
        onLoadSuccess={({ numPages }) => setNumPaginas(numPages)}
        loading={<div style={{ padding: 40, color: '#888' }}>Cargando documento...</div>}
        error={<div style={{ padding: 40, color: '#c00' }}>No se pudo cargar el PDF.</div>}
      >
        {Array.from({ length: numPaginas }, (_, i) => (
          <div
            key={i}
            className="pdf-page-holder"
            onMouseMove={i === 0 ? moverZona : undefined}
            onMouseUp={() => (arrastrando.current = false)}
            onMouseLeave={() => (arrastrando.current = false)}
          >
            <Page pageNumber={i + 1} width={ancho} renderTextLayer={false} renderAnnotationLayer={false} />
            {i === 0 && zona && (
              <div
                className="zona"
                style={{
                  left: `${zona.xPct * 100}%`,
                  top: `${zona.yPct * 100}%`,
                  width: `${zona.wPct * 100}%`,
                  height: `${zona.hPct * 100}%`,
                }}
                onMouseDown={() => onZonaCambio && (arrastrando.current = true)}
              >
                {onZonaCambio ? 'Arrastrar zona de firma' : 'Zona de firma'}
              </div>
            )}
          </div>
        ))}
      </Document>
    </div>
  );
}
