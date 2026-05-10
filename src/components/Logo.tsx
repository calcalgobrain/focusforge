import React from 'react';

export const Logo = ({ size = 48, className = "" }: { size?: number, className?: string }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <div className="relative" style={{ width: size, height: size }}>
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]"
      >
        <circle cx="50" cy="50" r="48" fill="url(#logoGradient)" />
        <path 
          d="M35 45c0-10 8-15 15-15s15 5 15 15-8 15-15 15-15-5-15-15z" 
          stroke="white" 
          strokeWidth="4" 
          strokeLinecap="round" 
        />
        <path 
          d="M50 30c0-5-5-10-10-10M50 30c0-5 5-10 10-10M50 60c0 10-5 15-10 20M50 60c0 10 5 15 10 20" 
          stroke="white" 
          strokeWidth="3" 
          strokeLinecap="round" 
          opacity="0.6"
        />
        <circle cx="50" cy="45" r="8" fill="white" className="animate-pulse" />
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
    <span className="text-2xl font-black text-white tracking-tighter">
      Focus<span className="text-brand-primary">Forge</span>
    </span>
  </div>
);
