import React from 'react';
import { motion } from 'motion/react';

interface AvatarProps {
  state?: 'healthy' | 'tired' | 'injured' | 'critical' | 'dormant';
  size?: number;
  className?: string;
}

export const Avatar = ({ state = 'healthy', size = 80, className = "" }: AvatarProps) => {
  const getTheme = () => {
    switch (state) {
      case 'healthy': return { bg: 'bg-emerald-500/20', color: 'text-emerald-500', emote: '😊' };
      case 'tired': return { bg: 'bg-amber-500/20', color: 'text-amber-500', emote: '🥱' };
      case 'injured': return { bg: 'bg-orange-500/20', color: 'text-orange-500', emote: '🤕' };
      case 'critical': return { bg: 'bg-red-500/20', color: 'text-red-500', emote: '🚑' };
      case 'dormant': return { bg: 'bg-slate-800', color: 'text-slate-500', emote: '💀' };
      default: return { bg: 'bg-emerald-500/20', color: 'text-emerald-500', emote: '😊' };
    }
  };

  const theme = getTheme();

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <motion.div 
        animate={{ 
          y: state === 'healthy' ? [0, -5, 0] : 0,
          scale: state === 'dormant' ? 0.95 : 1
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`w-full h-full rounded-[24px] ${theme.bg} border-2 border-current ${theme.color} flex flex-col items-center justify-center relative overflow-hidden`}
      >
        <div className="text-4xl">{theme.emote}</div>
        
        {state === 'healthy' && (
          <motion.div 
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 1.5] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute top-2 right-2 text-xs"
          >
            🔥
          </motion.div>
        )}
      </motion.div>
      
      {/* Level Tier Ring */}
      <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] pointer-events-none">
        <circle 
          cx="50%" cy="50%" r="48%" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeDasharray="4 4"
          className={`${theme.color} opacity-20`}
        />
      </svg>
    </div>
  );
};
