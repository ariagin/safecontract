// components/VisorPdf.tsx
// Visor de PDF basado en react-pdf. Dibuja el PDF en un <canvas> dentro
// de la pagina, asi NO depende del visor nativo del navegador (que es lo
// que bloqueaba Chrome/Edge con los embed). Funciona en cualquier dominio.
//
// Modo interactivo (emisor): clic + arrastre dibuja la zona de firma en
// CUALQUIER pagina. Un tirador en la esquina permite redimensionarla.
// Modo lectura (firmante): solo muestra la zona ya definida.
import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export interface Zona {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  pagina: number;
}

interface Props {
  pdfBase64: string;
  zona?: Zona;
  onZonaCambio?: (z: Zona) => void;
  anchoMax?: number;
}

type Accion = null | 'dibujando' | 'moviendo' | 'redimensionando';

export default function VisorPdf({ pdfBase64, zona, onZonaCambio, anchoMax = 720 }: Props) {
  const [numPaginas, setNumPaginas] = useState(0);
  const [ancho, setAncho] = useState(anchoMax);
  const contRef = useRef<HTMLDivElement>(null);

  const accion = useRef<Accion>(null);
  const paginaActiva = useRef(0);
  const inicio = useRef({ x: 0, y: 0 });
  const zonaInicial = useRef<Zona | null>(null);

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
  const interactivo = !!onZonaCambio;

  const posPct = (e: React.MouseEvent, holder: HTMLElement) => {
    const r = holder.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min((e.clientX - r.left) / r.width, 1)),
      y: Math.max(0, Math.min((e.clientY - r.top) / r.height, 1)),
    };
  };

  const onDownPagina = (e: React.MouseEvent, pag: number) => {
    if (!interactivo) return;
    const target = e.target as HTMLElement;
    if (target.dataset.rol === 'tirador' || target.dataset.rol === 'zona') return;
    const holder = e.currentTarget as HTMLElement;
    const p = posPct(e, holder);
    accion.current = 'dibujando';
    paginaActiva.current = pag;
    inicio.current = p;
    onZonaCambio!({ xPct: p.x, yPct: p.y, wPct: 0, hPct: 0, pagina: pag });
  };

  const onMove = (e: React.MouseEvent, pag: number) => {
    if (!interactivo || !accion.current || !zona) return;
    const holder = e.currentTarget as HTMLElement;
    const p = posPct(e, holder);
    if (accion.current === 'dibujando' && pag === paginaActiva.current) {
      const x = Math.min(inicio.current.x, p.x);
      const y = Math.min(inicio.current.y, p.y);
      const w = Math.abs(p.x - inicio.current.x);
      const h = Math.abs(p.y - inicio.current.y);
      onZonaCambio!({ xPct: x, yPct: y, wPct: w, hPct: h, pagina: pag });
    } else if (accion.current === 'moviendo' && zonaInicial.current) {
      const dx = p.x - inicio.current.x;
      const dy = p.y - inicio.current.y;
      const zi = zonaInicial.current;
      onZonaCambio!({
        ...zi,
        xPct: Math.max(0, Math.min(zi.xPct + dx, 1 - zi.wPct)),
        yPct: Math.max(0, Math.min(zi.yPct + dy, 1 - zi.hPct)),
      });
    } else if (accion.current === 'redimensionando' && zonaInicial.current) {
      const zi = zonaInicial.current;
      const w = Math.max(0.04, Math.min(p.x - zi.xPct, 1 - zi.xPct));
      const h = Math.max(0.02, Math.min(p.y - zi.yPct, 1 - zi.yPct));
      onZonaCambio!({ ...zi, wPct: w, hPct: h });
    }
  };

  const onUp = () => {
    if (accion.current === 'dibujando' && zona && (zona.wPct < 0.03 || zona.hPct < 0.02)) {
      onZonaCambio!({ ...zona, wPct: 0.28, hPct: 0.09 });
    }
    accion.current = null;
    zonaInicial.current = null;
  };

  const onDownZona = (e: React.MouseEvent) => {
    if (!interactivo || !zona) return;
    e.stopPropagation();
    const holder = (e.currentTarget as HTMLElement).parentElement as HTMLElement;
    accion.current = 'moviendo';
    inicio.current = posPct(e, holder);
    zonaInicial.current = { ...zona };
  };

  const onDownTirador = (e: React.MouseEvent) => {
    if (!interactivo || !zona) return;
    e.stopPropagation();
    accion.current = 'redimensionando';
    zonaInicial.current = { ...zona };
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
            style={{ cursor: interactivo ? 'crosshair' : 'default', marginBottom: 8 }}
            onMouseDown={(e) => onDownPagina(e, i)}
            onMouseMove={(e) => onMove(e, i)}
            onMouseUp={onUp}
            onMouseLeave={() => { if (accion.current) onUp(); }}
          >
            <Page pageNumber={i + 1} width={ancho} renderTextLayer={false} renderAnnotationLayer={false} />

            {interactivo && (
              <div className="pdf-page-badge">Página {i + 1} de {numPaginas}</div>
            )}

            {zona && zona.pagina === i && (zona.wPct > 0 || zona.hPct > 0) && (
              <div
                className="zona"
                data-rol="zona"
                style={{
                  left: `${zona.xPct * 100}%`,
                  top: `${zona.yPct * 100}%`,
                  width: `${zona.wPct * 100}%`,
                  height: `${zona.hPct * 100}%`,
                  cursor: interactivo ? 'move' : 'default',
                }}
                onMouseDown={interactivo ? onDownZona : undefined}
              >
                <span style={{ pointerEvents: 'none' }}>{interactivo ? 'Firma' : 'Zona de firma'}</span>
                {interactivo && (
                  <span className="zona-tirador" data-rol="tirador" onMouseDown={onDownTirador} />
                )}
              </div>
            )}
          </div>
        ))}
      </Document>
    </div>
  );
}
