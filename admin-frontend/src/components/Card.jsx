import React from 'react';

export function Card({
  children,
  className = '',
  hoverEffect = false,
  ...props
}) {
  return (
    <div
      className={`glass-panel rounded-2xl p-5 shadow-premium transition-all duration-300
        ${hoverEffect ? 'hover:border-gold/50 hover:shadow-gold-glow cursor-pointer hover:-translate-y-0.5' : ''}
        ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className="text-sm font-semibold text-obsidian-200 uppercase tracking-wider font-display mb-1.5">
      {children}
    </h3>
  );
}

export function CardValue({ children, className = '' }) {
  return (
    <div className={`text-2xl font-bold font-display text-obsidian-50 tracking-tight ${className}`}>
      {children}
    </div>
  );
}

export function CardDesc({ children, className = '' }) {
  return (
    <p className={`text-xs text-obsidian-200 mt-1 ${className}`}>
      {children}
    </p>
  );
}
