import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function SheetDrawer({
  isOpen,
  onClose,
  title,
  children,
  className = ''
}) {
  // Lock body scroll when open
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

  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 flex max-w-full sm:pl-10 pointer-events-none">
        <div
          className={`w-screen max-w-full sm:max-w-lg transform transition-transform duration-300 pointer-events-auto bg-obsidian-950 border-l border-obsidian-800 shadow-premium flex flex-col`}
          style={{ animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-obsidian-800 flex items-center justify-between">
            <h2 className="text-lg font-bold font-display text-obsidian-50 tracking-tight">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-obsidian-200 hover:text-obsidian-50 hover:bg-obsidian-900 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
            {children}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
