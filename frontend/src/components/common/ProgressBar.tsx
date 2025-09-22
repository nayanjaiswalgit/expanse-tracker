import React from 'react';

interface ProgressBarProps {
  percentage: number;
  className?: string;
  style?: React.CSSProperties;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage, className, style }) => {
  const width = Math.min(percentage, 100);
  return (
    <div
      className={`h-2 rounded-full ${className}`}
      style={{ width: `${width}%`, ...style }}
    ></div>
  );
};
