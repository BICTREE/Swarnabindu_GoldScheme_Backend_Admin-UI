import React from 'react';

export const Input = React.forwardRef(({
  label,
  error,
  type = 'text',
  className = '',
  ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-semibold text-obsidian-200 uppercase tracking-wider font-display">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={`w-full bg-obsidian-950 border text-sm text-obsidian-50 rounded-lg px-3.5 py-2.5 outline-none transition-all duration-200
          ${error 
            ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500' 
            : 'border-obsidian-700 focus:border-gold focus:ring-1 focus:ring-gold focus:shadow-gold-glow'
          }
          placeholder-obsidian-700 ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-rose-500 font-medium">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
