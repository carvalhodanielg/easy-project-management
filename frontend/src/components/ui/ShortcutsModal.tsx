import { Keyboard, X } from 'lucide-react';

interface ShortcutRow {
  keys: string[];
  label: string;
}

const SHORTCUTS: ShortcutRow[] = [
  { keys: ['N'], label: 'Nova tarefa (em lista ou sprint)' },
  { keys: ['F'], label: 'Abrir filtros' },
  { keys: ['?'], label: 'Mostrar atalhos de teclado' },
  { keys: ['Esc'], label: 'Fechar modais e painéis' },
];

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      data-testid="shortcuts-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-modal border border-line rounded-2xl shadow-2xl w-full max-w-sm p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand/12 border border-brand/20 flex items-center justify-center">
              <Keyboard size={15} className="text-brand" />
            </div>
            <h3 className="text-base font-semibold text-ink">Atalhos de teclado</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-lift transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <ul className="flex flex-col gap-1">
          {SHORTCUTS.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between gap-4 px-1 py-2 rounded-lg"
            >
              <span className="text-sm text-ink-dim">{row.label}</span>
              <span className="flex items-center gap-1 shrink-0">
                {row.keys.map((k) => (
                  <kbd
                    key={k}
                    className="min-w-[1.75rem] px-2 py-1 text-center text-xs font-mono font-semibold text-ink bg-lift border border-line rounded-md shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
