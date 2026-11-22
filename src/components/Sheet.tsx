import { useEffect, type ReactNode } from 'react';

/** A modal panel: a card in the middle on wide screens, a sheet from the bottom on narrow ones. */
export function Sheet({ onClose, label, children, className = '' }: { onClose: () => void; label: string; children: ReactNode; className?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`sheet ${className}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
