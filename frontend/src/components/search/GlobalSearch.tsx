import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckSquare, FileText, BookOpen, ArrowRight, Command } from 'lucide-react';
import { globalSearch, type SearchResultItem } from '../../api/search.api';
import { useModalA11y } from '../../hooks/useModalA11y';

const TYPE_ICON = {
  task: CheckSquare,
  note: FileText,
  wiki: BookOpen,
} as const;

const TYPE_LABEL = {
  task: 'Tarefa',
  note: 'Nota',
  wiki: 'Wiki',
} as const;

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_progresso: 'Em progresso',
  em_review: 'Em revisão',
  feito: 'Feito',
  fechado: 'Fechado',
};

interface Props {
  spaceId: string;
  onClose: () => void;
}

export function GlobalSearch({ spaceId, onClose }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await globalSearch(spaceId, query.trim());
        const flat = [...data.tasks, ...data.notes, ...data.wiki];
        setResults(flat);
        setActiveIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, spaceId]);

  const go = useCallback(
    (item: SearchResultItem) => {
      navigate(item.url);
      onClose();
    },
    [navigate, onClose],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      go(results[activeIndex]);
    }
  };

  // Group for section headers
  const grouped: { label: string; items: SearchResultItem[] }[] = [];
  const tasks = results.filter((r) => r.type === 'task');
  const notes = results.filter((r) => r.type === 'note');
  const wiki  = results.filter((r) => r.type === 'wiki');
  if (tasks.length) grouped.push({ label: 'Tarefas', items: tasks });
  if (notes.length) grouped.push({ label: 'Notas', items: notes });
  if (wiki.length)  grouped.push({ label: 'Wiki', items: wiki });

  const isEmpty = query.trim().length >= 2 && !loading && results.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
        tabIndex={-1}
        className="w-full max-w-xl bg-surface border border-line rounded-2xl shadow-2xl shadow-black/50 overflow-hidden focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line">
          <Search size={16} className="text-ink-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar tarefas, notas, wiki…"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
          />
          {loading && (
            <span className="w-4 h-4 border-2 border-ink-muted/30 border-t-ink-muted rounded-full animate-spin shrink-0" />
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-ink-muted bg-lift border border-line rounded font-mono">
            Esc
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-[380px] overflow-y-auto py-1.5">
            {grouped.map(({ label, items }) => (
              <div key={label}>
                <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                  {label}
                </p>
                {items.map((item) => {
                  const globalIdx = results.indexOf(item);
                  const Icon = TYPE_ICON[item.type];
                  const isActive = globalIdx === activeIndex;
                  const subtitleLabel =
                    item.type === 'task' ? (STATUS_LABELS[item.subtitle] ?? item.subtitle) : item.subtitle;

                  return (
                    <button
                      key={item._id}
                      onClick={() => go(item)}
                      onMouseEnter={() => setActiveIndex(globalIdx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                        isActive ? 'bg-brand/10' : 'hover:bg-lift/60'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-brand/20' : 'bg-lift'
                      }`}>
                        <Icon size={13} className={isActive ? 'text-brand' : 'text-ink-muted'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${isActive ? 'text-ink font-medium' : 'text-ink-dim'}`}>
                          {item.title}
                        </p>
                        <p className="text-[11px] text-ink-muted truncate">
                          {TYPE_LABEL[item.type]} · {subtitleLabel}
                        </p>
                      </div>
                      {isActive && <ArrowRight size={13} className="text-brand shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {isEmpty && (
          <div className="py-10 text-center">
            <p className="text-sm text-ink-muted">Nenhum resultado para <span className="text-ink font-medium">&quot;{query}&quot;</span></p>
          </div>
        )}

        {query.trim().length < 2 && (
          <div className="px-4 py-4 flex items-center justify-between">
            <p className="text-xs text-ink-muted">Digite pelo menos 2 caracteres</p>
            <div className="flex items-center gap-1 text-[11px] text-ink-muted">
              <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 bg-lift border border-line rounded font-mono">
                <Command size={9} />K
              </kbd>
              <span>para abrir</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
