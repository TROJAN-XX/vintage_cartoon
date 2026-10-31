import React from 'react';

// P4-3: reusable brand loader — a neon spinning ring around a flickering CRT
// TV, matching the first-paint loader in index.html. Used for every async
// surface (lazy VideoModal chunk, hub episode database load) so the app never
// flashes an unstyled/blank state while something loads.
export default function Loader({ label = 'Loading…', size = 'md' }) {
  return (
    <div
      className={`brand-loader brand-loader-${size}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="brand-loader-stage" aria-hidden="true">
        <div className="brand-loader-ring" />
        <svg className="brand-loader-tv" viewBox="0 0 92 92" fill="none">
          {/* Antennas */}
          <path d="M32 34 L22 16" stroke="#00f0ff" strokeWidth="4" strokeLinecap="round" />
          <circle cx="22" cy="16" r="3.5" fill="#00f0ff" />
          <path d="M60 34 L70 16" stroke="#00f0ff" strokeWidth="4" strokeLinecap="round" />
          <circle cx="70" cy="16" r="3.5" fill="#00f0ff" />
          {/* TV body */}
          <rect x="10" y="34" width="72" height="48" rx="10" stroke="#ff007f" strokeWidth="4" />
          {/* Screen with glow (flickers like a warming CRT) */}
          <rect className="brand-loader-screen" x="18" y="42" width="40" height="32" rx="5" fill="#0c1a1e" />
          <path className="brand-loader-screen" d="M33 50 L47 58 L33 66 Z" fill="#00f0ff" />
          {/* Dials */}
          <circle cx="70" cy="50" r="4" stroke="#bd00ff" strokeWidth="3" />
          <circle cx="70" cy="66" r="4" stroke="#bd00ff" strokeWidth="3" />
        </svg>
      </div>
      <p className="brand-loader-label">{label}</p>
    </div>
  );
}
