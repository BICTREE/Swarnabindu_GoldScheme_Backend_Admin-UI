import React from 'react';

export function Badge({
  children,
  variant = 'info',
  className = '',
  ...props
}) {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider font-display border';

  const variants = {
    success: 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-950/40 text-amber-400 border-amber-500/30',
    danger: 'bg-rose-950/40 text-rose-400 border-rose-500/30',
    info: 'bg-blue-950/40 text-blue-400 border-blue-500/30',
    gold: 'bg-gold/10 text-gold border-gold/30',
    muted: 'bg-obsidian-900 text-obsidian-200 border-obsidian-800'
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
