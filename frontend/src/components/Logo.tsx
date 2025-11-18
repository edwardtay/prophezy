"use client";

import { useState } from "react";
import Link from "next/link";
import AboutModal from "./AboutModal";

export default function Logo({ className = "" }: { className?: string }) {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      <div className={`flex items-center ${className}`}>
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center border-2 border-orange-500 shadow-lg shadow-orange-600/60 bg-gradient-to-br from-orange-600 via-yellow-500 to-orange-700">
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Gradient Definition - High Contrast Cyberpunk Orange/Yellow */}
                <defs>
                  <linearGradient id="crystalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF4500" stopOpacity="1" />
                    <stop offset="50%" stopColor="#FFD700" stopOpacity="1" />
                    <stop offset="100%" stopColor="#FF6600" stopOpacity="1" />
                  </linearGradient>
                  {/* Inner glow for cyberpunk effect - higher contrast */}
                  <radialGradient id="cyberpunkGlow" cx="50%" cy="50%">
                    <stop offset="0%" stopColor="#FFEB3B" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#FF4500" stopOpacity="0.2" />
                  </radialGradient>
                  {/* Dark shadow gradient for depth */}
                  <radialGradient id="darkShadow" cx="50%" cy="80%">
                    <stop offset="0%" stopColor="#000000" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
                  </radialGradient>
                </defs>
                
                {/* Crystal Ball Base/Shadow - darker for contrast */}
                <ellipse cx="14" cy="24" rx="8" ry="3" fill="rgba(0,0,0,0.4)" />
                
                {/* Main Crystal Ball Circle */}
                <circle cx="14" cy="14" r="10" fill="url(#crystalGradient)" />
                
                {/* Dark shadow on bottom for depth */}
                <ellipse cx="14" cy="18" rx="8" ry="6" fill="url(#darkShadow)" />
                
                {/* Highlight/Reflection - brighter white for contrast */}
                <ellipse cx="11" cy="10" rx="4" ry="5" fill="rgba(255,255,255,0.8)" />
                <ellipse cx="10.5" cy="9.5" rx="2" ry="3" fill="rgba(255,255,255,0.95)" />
                
                {/* Inner Glow - Cyberpunk effect */}
                <circle cx="14" cy="14" r="8" fill="url(#cyberpunkGlow)" />
                
                {/* Cyberpunk Sparkles - Brighter, higher contrast */}
                <circle cx="16" cy="8" r="1.2" fill="#FFD700" opacity="1" />
                <circle cx="19" cy="12" r="1" fill="#FFEB3B" opacity="1" />
                <circle cx="8" cy="11" r="0.9" fill="#FF4500" opacity="0.9" />
                {/* Additional cyberpunk sparkles */}
                <circle cx="20" cy="16" r="0.8" fill="#FFD700" opacity="0.9" />
                <circle cx="6" cy="15" r="0.7" fill="#FF6600" opacity="0.9" />
                {/* More sparkles for cyberpunk effect */}
                <circle cx="12" cy="7" r="0.6" fill="#FFEB3B" opacity="0.8" />
                <circle cx="22" cy="14" r="0.5" fill="#FFD700" opacity="0.7" />
              </svg>
            </div>
          </div>
          <span className="ml-3 text-2xl font-bold text-gray-900 font-caveat">Prophezy</span>
        </Link>
        
        {/* Info Icon */}
        <button
          onClick={() => setShowAbout(true)}
          className="ml-3 p-1.5 text-gray-400 hover:text-gray-600 transition rounded-full hover:bg-gray-100"
          aria-label="About Prophezy"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
}
