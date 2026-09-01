import React from 'react';

interface CeteraLogoProps {
  className?: string;
  glow?: boolean;
}

export function CeteraLogo({ className = "w-6 h-6", glow = true }: CeteraLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${glow ? 'drop-shadow-[0_0_12px_rgba(97,77,255,0.7)]' : ''}`}
    >
      <defs>
        <linearGradient id="saturnGrad" x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#614DFF" />
        </linearGradient>
        <linearGradient id="ringGrad" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#614DFF" stopOpacity="0.8" />
          <stop offset="40%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#614DFF" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Back Ring Segment (behind planet) */}
      <path
        d="M 18 58 C 22 42, 60 30, 84 40"
        stroke="url(#ringGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Central 'C' Planet Crescent */}
      <path
        d="M 64 22 C 38 18, 20 32, 20 50 C 20 68, 38 82, 64 78 C 44 74, 34 64, 34 50 C 34 36, 44 26, 64 22 Z"
        fill="url(#saturnGrad)"
      />

      {/* Front Outer Ring (crossing in front) */}
      <path
        d="M 10 58 C 14 74, 52 86, 88 56"
        stroke="url(#ringGrad)"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Front Inner Accent Ring */}
      <path
        d="M 22 62 C 30 72, 54 80, 80 60"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}
