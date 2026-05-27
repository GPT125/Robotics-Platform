import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function Dialog({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-start bg-black/60 p-3 pt-20 backdrop-blur-sm sm:place-items-center sm:pt-3">
      <div className="panel w-full max-w-xl overflow-hidden">
        <button
          className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-lg border border-line bg-panel text-slate-300"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={17} />
        </button>
        {children}
      </div>
    </div>
  );
}
