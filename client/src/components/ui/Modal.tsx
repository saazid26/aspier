import type { ReactNode } from 'react';
export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="modal"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h2>{title}</h2><button type="button" className="button button-secondary" onClick={onClose}>Close</button></div>{children}</div></div>;
}
