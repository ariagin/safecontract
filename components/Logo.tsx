// components/Logo.tsx
export default function Logo() {
  return (
    <div className="logo">
      <svg viewBox="0 0 34 38" fill="none" className="shield" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 1L3 7v10c0 9 6.2 17.4 14 20 7.8-2.6 14-11 14-20V7L17 1z" fill="rgba(0,180,216,0.12)" stroke="#00B4D8" strokeWidth="1.5" />
        <ellipse cx="17" cy="17" rx="7" ry="9" stroke="#90E0EF" strokeWidth="1" />
        <path d="M11 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#00B4D8" strokeWidth="1" strokeLinecap="round" fill="none" />
        <path d="M13 19c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="#00B4D8" strokeWidth="1" strokeLinecap="round" fill="none" />
        <path d="M15 21c0-1.1.9-2 2-2s2 .9 2 2" stroke="#00B4D8" strokeWidth="1" strokeLinecap="round" fill="none" />
      </svg>
      <div>
        <div className="brand-name">Safe<span>Contract</span></div>
        <div className="brand-sub">SGS World · Firma Electrónica</div>
      </div>
    </div>
  );
}
