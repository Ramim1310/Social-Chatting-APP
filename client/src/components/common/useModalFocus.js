import { useEffect, useRef } from 'react';

export default function useModalFocus(open, onClose) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open || !ref.current) return;
    const previous = document.activeElement;
    const root = ref.current;
    const focusable = () => [...root.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter(node => node.getClientRects().length);
    const initial = root.querySelector('input:not(:disabled), textarea:not(:disabled)') || focusable()[0];
    initial?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const nodes = focusable();
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    root.addEventListener('keydown', keydown);
    return () => { root.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [open]);
  return ref;
}
