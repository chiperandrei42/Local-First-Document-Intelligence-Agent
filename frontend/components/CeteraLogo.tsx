'use client';

import React from 'react';

interface CeteraLogoProps {
  size?: number;
  isStreaming?: boolean;
  className?: string;
}

export const CeteraLogo: React.FC<CeteraLogoProps> = ({
  size = 24,
  isStreaming = false,
  className = '',
}) => {
  return (
    <div 
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Planet Metallic Gradient */}
          <radialGradient
            id="planetGrad"
            cx="38%"
            cy="32%"
            r="60%"
            fx="38%"
            fy="32%"
          >
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#D2CEFF" />
            <stop offset="55%" stopColor="#3B2EB0" />
            <stop offset="85%" stopColor="#14103A" />
            <stop offset="100%" stopColor="#080718" />
          </radialGradient>

          {/* Planet Crescent Rim Glow */}
          <radialGradient
            id="planetRim"
            cx="75%"
            cy="75%"
            r="45%"
          >
            <stop offset="0%" stopColor="#8C7DFF" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#614DFF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#614DFF" stopOpacity="0" />
          </radialGradient>

          {/* Ring Chrome / Violet Gradient */}
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="30%" stopColor="#9B8DFF" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#614DFF" stopOpacity="0.4" />
            <stop offset="85%" stopColor="#C4BCFF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
          </linearGradient>

          {/* Orbit Glow Filter */}
          <filter id="violetGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient Back Glow */}
        <circle 
          cx="50" 
          cy="50" 
          r={isStreaming ? "32" : "26"} 
          fill="#614DFF" 
          opacity={isStreaming ? "0.45" : "0.2"} 
          filter="url(#violetGlow)"
          className={`transition-all duration-500 ${isStreaming ? 'animate-pulse' : ''}`}
        />

        {/* Ring Back Arc (behind planet) */}
        <g transform="rotate(-26 50 50)">
          <ellipse
            cx="50"
            cy="50"
            rx="42"
            ry="12"
            stroke="url(#ringGrad)"
            strokeWidth="3.2"
            strokeDasharray="140 140"
            strokeDashoffset="140"
            fill="none"
            opacity="0.75"
          />
        </g>

        {/* Central Planet Sphere (with Crescent 'C' contour) */}
        <circle
          cx="50"
          cy="50"
          r="21"
          fill="url(#planetGrad)"
          stroke="#796BFF"
          strokeWidth="0.75"
        />
        <circle
          cx="50"
          cy="50"
          r="21"
          fill="url(#planetRim)"
        />

        {/* Dynamic Spinning Rings on Stream Generation */}
        <g transform="rotate(-26 50 50)">
          {/* Main Front Ring Arc (over the planet) */}
          <ellipse
            cx="50"
            cy="50"
            rx="42"
            ry="12"
            stroke="url(#ringGrad)"
            strokeWidth="3.4"
            strokeDasharray="140 140"
            strokeDashoffset="0"
            fill="none"
            filter="drop-shadow(0 0 4px rgba(97, 77, 255, 0.7))"
          />

          {/* Active Orbit Particles & Plasma Beams when generating */}
          {isStreaming && (
            <>
              {/* Spinning Orbital Plasma Stream */}
              <ellipse
                cx="50"
                cy="50"
                rx="42"
                ry="12"
                stroke="#FFFFFF"
                strokeWidth="4"
                strokeDasharray="30 230"
                fill="none"
                filter="url(#violetGlow)"
                className="animate-[spin_1.4s_linear_infinite] origin-center"
              />

              {/* Secondary Fast Photon Bead */}
              <ellipse
                cx="50"
                cy="50"
                rx="42"
                ry="12"
                stroke="#B5ABFF"
                strokeWidth="3.5"
                strokeDasharray="15 245"
                fill="none"
                className="animate-[spin_0.85s_linear_infinite_reverse] origin-center"
              />
            </>
          )}
        </g>
      </svg>
    </div>
  );
};
