import { useState } from 'react';
import { X, Search } from 'lucide-react';
import type { Task } from '../../types/task.types';

interface Props {
  title: string;
  tasks: Task[];
  excludeIds?: string[];
  onConfirm: (taskId: string) => void;
  onClose: () => void;
}

export function ParentTaskPickerModal({ title, tasks, excludeIds = [], onConfirm, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = tasks.filter(
    (t) =>
      !excludeIds.includes(t._id) &&
      t.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface border border-line rounded-xl shadow-2xl w-[420px] max-h-[520px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="p-1 text-ink-muted hover:text-ink transition-colors rounded">
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-line-dim shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-lift rounded-lg">
            <Search size={13} className="text-ink-muted shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tarefa…"
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
            />
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-ink-muted text-center py-8">Nenhuma tarefa encontrada</p>
          ) : (
            filtered.map((t) => (
              <button
                key={t._id}
                onClick={() => setSelectedId(t._id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  selectedId === t._id
                    ? 'bg-brand/15 text-brand'
                    : 'text-ink hover:bg-lift'
                }`}
              >
                <span className="truncate block">{t.name}</span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-line shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => selectedId && onConfirm(selectedId)}
            disabled={!selectedId}
            className="px-4 py-1.5 bg-brand hover:bg-brand-hi text-white text-xs font-medium rounded-lg disabled:opacity-40 transition-all"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
