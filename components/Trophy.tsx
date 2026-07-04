'use client';

import { useId } from 'react';

// Taça dourada estilizada (SVG próprio, sem imagens externas).
// IDs de gradiente únicos por instância — senão o url(#...) pode apontar
// para um SVG escondido (ex.: topbar mobile) e a taça some.
export default function Trophy({ size = 110 }: { size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const au = `au${uid}`;
  const globe = `globe${uid}`;
  const shine = `shine${uid}`;
  const h = Math.round(size * 1.45);
  return (
    <svg width={size} height={h} viewBox="0 0 100 145" aria-hidden="true" className="trophy-svg">
      <defs>
        <linearGradient id={au} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fdf0b8" />
          <stop offset="0.4" stopColor="#eec257" />
          <stop offset="0.75" stopColor="#c08f1c" />
          <stop offset="1" stopColor="#8a6410" />
        </linearGradient>
        <radialGradient id={globe} cx="0.35" cy="0.28" r="1">
          <stop offset="0" stopColor="#fff7d6" />
          <stop offset="0.45" stopColor="#f2cd65" />
          <stop offset="1" stopColor="#9c7410" />
        </radialGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* globo */}
      <circle cx="50" cy="27" r="19" fill={`url(#${globe})`} />
      <path d="M31.5 27a18.5 18.5 0 0 0 37 0" stroke="#8a6410" strokeWidth="1.1" fill="none" opacity="0.45" />
      <ellipse cx="50" cy="27" rx="8.5" ry="19" stroke="#8a6410" strokeWidth="1" fill="none" opacity="0.35" />
      <ellipse cx="50" cy="27" rx="19" ry="7" stroke="#8a6410" strokeWidth="1" fill="none" opacity="0.3" />
      <ellipse cx="43" cy="19" rx="6" ry="4" fill={`url(#${shine})`} transform="rotate(-25 43 19)" />

      {/* braços que seguram o globo */}
      <path
        d="M33 42 C26 54 28 68 40 78 L60 78 C72 68 74 54 67 42 C63 50 56 54 50 54 C44 54 37 50 33 42 Z"
        fill={`url(#${au})`}
      />
      {/* coluna */}
      <path d="M40 78 C38 92 36 100 31 108 L69 108 C64 100 62 92 60 78 Z" fill={`url(#${au})`} />
      <path d="M42 80 C41 92 39 99 36 105 L44 105 C46 97 46 88 46 80 Z" fill={`url(#${shine})`} opacity="0.5" />

      {/* base com faixa de malaquita */}
      <rect x="22" y="108" width="56" height="9" rx="4.5" fill={`url(#${au})`} />
      <rect x="18" y="117" width="64" height="12" rx="5" fill={`url(#${au})`} />
      <rect x="18" y="120.5" width="64" height="5" fill="#1c4a33" />
      <rect x="14" y="129" width="72" height="10" rx="5" fill="#a3770e" />
      <rect x="14" y="131.5" width="72" height="4" fill="#7a570c" />
    </svg>
  );
}
