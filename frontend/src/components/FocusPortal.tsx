import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export default function FocusPortal({ children }: { children: ReactNode }) {
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('.app-shell');
    const previousVisibility = shell?.style.visibility ?? '';
    shell?.setAttribute('inert', '');
    if (shell) shell.style.visibility = 'hidden';
    return () => {
      shell?.removeAttribute('inert');
      if (shell) shell.style.visibility = previousVisibility;
    };
  }, []);

  return createPortal(children, document.body);
}
