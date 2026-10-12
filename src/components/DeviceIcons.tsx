import React from 'react';
import { DeviceType } from '../types/network';

interface DeviceIconProps {
  type: DeviceType;
  className?: string;
  size?: number;
}

export const DeviceIcon: React.FC<DeviceIconProps> = ({ type, className = '', size = 48 }) => {
  switch (type) {
    case 'router-2911':
    case 'router-2901':
      // Cisco Router classic cylindrical icon with cross arrows
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Router cylinder base */}
          <ellipse cx="32" cy="46" rx="26" ry="12" fill="#0369a1" stroke="#0284c7" strokeWidth="2" />
          <path
            d="M6 24V46C6 52.6 17.6 58 32 58C46.4 58 58 52.6 58 46V24"
            fill="#0284c7"
            stroke="#0369a1"
            strokeWidth="1.5"
          />
          {/* Cylinder top */}
          <ellipse cx="32" cy="24" rx="26" ry="12" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />
          
          {/* Cross 4 arrows */}
          {/* Left Arrow */}
          <path d="M22 24H12M12 24L16 20M12 24L16 28" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Right Arrow */}
          <path d="M42 24H52M52 24L48 20M52 24L48 28" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Top Arrow */}
          <path d="M32 18V14M32 14L28 17M32 14L36 17" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Bottom Arrow */}
          <path d="M32 30V34M32 34L28 31M32 34L36 31" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'switch-2960':
      // Cisco Catalyst Switch rectangular box with 4 parallel/opposing arrows
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Switch 3D Box */}
          <polygon points="6,34 18,18 58,18 46,34" fill="#0f766e" stroke="#14b8a6" strokeWidth="1.5" />
          <polygon points="46,34 58,18 58,34 46,50" fill="#0d9488" stroke="#0f766e" strokeWidth="1.5" />
          <rect x="6" y="34" width="40" height="16" rx="2" fill="#14b8a6" stroke="#0f766e" strokeWidth="1.5" />

          {/* Opposing arrows */}
          <path d="M14 40H30M30 40L26 37M30 40L26 43" stroke="#042f2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M38 45H22M22 45L26 42M22 45L26 48" stroke="#042f2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Port indicator dots */}
          <circle cx="10" cy="38" r="1.5" fill="#4ade80" />
          <circle cx="10" cy="45" r="1.5" fill="#4ade80" />
        </svg>
      );

    case 'switch-3560':
      // Multilayer L3 Switch
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <polygon points="6,34 18,18 58,18 46,34" fill="#4338ca" stroke="#6366f1" strokeWidth="1.5" />
          <polygon points="46,34 58,18 58,34 46,50" fill="#4f46e5" stroke="#4338ca" strokeWidth="1.5" />
          <rect x="6" y="34" width="40" height="16" rx="2" fill="#818cf8" stroke="#4338ca" strokeWidth="1.5" />
          {/* 4 Multi-directional arrows */}
          <path d="M16 42H36" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round" />
          <path d="M26 36V48" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'pc':
      // PC Monitor + Desktop Tower
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Monitor */}
          <rect x="8" y="14" width="34" height="25" rx="3" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
          <rect x="12" y="18" width="26" height="17" rx="1" fill="#0284c7" />
          {/* Stand */}
          <rect x="22" y="39" width="6" height="6" fill="#475569" />
          <path d="M16 45H34" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
          {/* Mini Tower */}
          <rect x="46" y="20" width="12" height="26" rx="2" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="52" cy="26" r="1.5" fill="#38bdf8" />
          <line x1="49" y1="32" x2="55" y2="32" stroke="#64748b" strokeWidth="1.5" />
        </svg>
      );

    case 'laptop':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Screen */}
          <rect x="14" y="16" width="36" height="24" rx="2" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
          <rect x="18" y="20" width="28" height="16" rx="1" fill="#0284c7" />
          {/* Base */}
          <polygon points="6,46 58,46 52,40 12,40" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
          <rect x="27" y="42" width="10" height="2" rx="1" fill="#94a3b8" />
        </svg>
      );

    case 'server':
    case 'web-server':
      // Server Rack Unit
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Rack Chassis */}
          <rect x="10" y="12" width="44" height="40" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          {/* Blade 1 */}
          <rect x="14" y="16" width="36" height="9" rx="1" fill="#334155" />
          <circle cx="19" cy="20.5" r="1.5" fill="#22c55e" />
          <circle cx="24" cy="20.5" r="1.5" fill="#38bdf8" />
          <line x1="32" y1="20.5" x2="45" y2="20.5" stroke="#64748b" strokeWidth="2" strokeDasharray="2 2" />

          {/* Blade 2 */}
          <rect x="14" y="27.5" width="36" height="9" rx="1" fill="#334155" />
          <circle cx="19" cy="32" r="1.5" fill="#22c55e" />
          <circle cx="24" cy="32" r="1.5" fill="#eab308" />
          <line x1="32" y1="32" x2="45" y2="32" stroke="#64748b" strokeWidth="2" strokeDasharray="2 2" />

          {/* Blade 3 */}
          <rect x="14" y="39" width="36" height="9" rx="1" fill="#334155" />
          <circle cx="19" cy="43.5" r="1.5" fill="#22c55e" />
          <circle cx="24" cy="43.5" r="1.5" fill="#38bdf8" />
          <line x1="32" y1="43.5" x2="45" y2="43.5" stroke="#64748b" strokeWidth="2" strokeDasharray="2 2" />
        </svg>
      );

    default:
      return null;
  }
};
