import { useEffect, useRef } from 'react';

export default function Dialog({ title, children, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const node = dialogRef.current;
    const previous = document.activeElement;
    node.showModal();
    return () => { node.close(); previous?.focus(); };
  }, []);
  return (
    <dialog ref={dialogRef} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="m-auto w-[calc(100%_-_32px)] max-w-sm rounded-3xl p-6 bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm">
      <h2 id="dialog-title" className="text-lg font-display font-bold mb-3">{title}</h2>
      {children}
    </dialog>
  );
}
