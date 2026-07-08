import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  size = 'md'
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full ${sizes[size]} bg-obsidian-950 border border-obsidian-800 rounded-t-2xl sm:rounded-2xl shadow-premium overflow-hidden transition-all duration-300 transform scale-100 ${className}`}
        style={{ animation: 'zoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-obsidian-800 flex items-center justify-between">
          <h2 className="text-base font-bold font-display text-obsidian-50 tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-obsidian-200 hover:text-obsidian-50 hover:bg-obsidian-900 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 text-sm text-obsidian-200">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
