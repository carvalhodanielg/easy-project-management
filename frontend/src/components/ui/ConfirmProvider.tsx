import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from '../../hooks/useConfirm';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * Mount once near the app root. Exposes a promise-based {@link useConfirm} and
 * renders a single accessible {@link ConfirmDialog} on demand, resolving the
 * promise true/false with the user's decision.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <ConfirmDialog
          title={options.title}
          message={options.message}
          confirmLabel={options.confirmLabel}
          cancelLabel={options.cancelLabel}
          destructive={options.destructive}
          onConfirm={() => settle(true)}
          onClose={() => settle(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}
