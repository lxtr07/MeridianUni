import React from 'react';
import { SchoolMonogram } from './CrestLogo';

interface ScholarFlowLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'transparent';
  showBorder?: boolean;
}

const sizeMap = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

export const ScholarFlowLogo: React.FC<ScholarFlowLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'transparent',
  showBorder = false,
}) => {
  const containerBg =
    variant === 'dark'
      ? 'bg-slate-900 border-slate-800'
      : variant === 'light'
      ? 'bg-white border-slate-200'
      : 'bg-transparent border-transparent';

  return (
    <div
      title="Meridian University"
      className={`relative inline-flex items-center justify-center shrink-0 rounded-xl overflow-hidden ${
        showBorder ? 'border shadow-2xs' : ''
      } ${containerBg} ${sizeMap[size]} ${className}`}
    >
      <SchoolMonogram size={size} />
    </div>
  );
};

export const MeridianUniversityLogo = ScholarFlowLogo;

