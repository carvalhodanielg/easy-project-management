import { AlertTriangle } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

interface Props {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as a destructive action (red). Defaults to true. */
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Accessible confirmation dialog, replacing native `window.confirm`. Follows
 * the modal markup convention used across the app (see ParentTaskPickerModal)
 * and wires focus trap / Escape / focus return through {@link useModalA11y}.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = true,
  onConfirm,
  onClose,
}: Props) {
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);

  return (
    <div
      data-testid="confirm-dialog-backdrop"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-line rounded-xl shadow-2xl w-full max-w-[400px] p-5 focus:outline-none"
      >
        <div className="flex items-start gap-3">
          {destructive && (
            <span className="w-9 h-9 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
              <AlertTriangle size={17} className="text-danger" />
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            {message && <p className="mt-1.5 text-xs text-ink-dim leading-relaxed">{message}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-ink-muted hover:text-ink transition-colors rounded-lg"
          >
            {cancelLabel}
          </button>
          <button
            autoFocus
            onClick={onConfirm}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg text-white transition-all ${
              destructive ? 'bg-danger hover:bg-danger/90' : 'bg-brand hover:bg-brand-hi'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
