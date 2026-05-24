import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Search, SlidersHorizontal, Bookmark, BookmarkCheck, Trash2 } from 'lucide-react';
import type { FilterState } from '../../hooks/useTaskFilter';
import { type TaskStatus, type TaskPriority, type SubtaskMode, STATUS_LABELS, PRIORITY_LABELS } from '../../types/task.types';
import type { SavedFilter } from '../../api/saved-filters.api';
import { T } from '../../theme';
import { cn } from '../../lib/utils';

interface SpaceMember { _id: string; displayName: string; }
interface TagOption    { _id: string; name: string; color: string; }

interface Props {
  filters: FilterState;
  members?: SpaceMember[];
  tags?: TagOption[];
  onToggleStatus: (s: TaskStatus) => void;
  onTogglePriority: (p: TaskPriority) => void;
  onToggleAssignee: (id: string) => void;
  onToggleTag: (id: string) => void;
  onSetGroupBy: (g: FilterState['groupBy']) => void;
  onSetSearch: (q: string) => void;
  onSetSubtaskMode: (m: SubtaskMode) => void;
  onReset: () => void;
  isActive: boolean;
  // Saved filters
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string) => void;
  onLoadFilter?: (filters: Partial<FilterState>) => void;
  onDeleteFilter?: (id: string) => void;
}

const STATUSES   = Object.keys(STATUS_LABELS)   as TaskStatus[];
const PRIORITIES = Object.keys(PRIORITY_LABELS) as TaskPriority[];

const GROUP_OPTIONS: { value: FilterState['groupBy']; label: string }[] = [
  { value: undefined,  label: 'Sem agrupamento' },
  { value: 'status',   label: 'Por status' },
  { value: 'assignee', label: 'Por responsável' },
];

const SUBTASK_MODES: { value: SubtaskMode; label: string }[] = [
  { value: 'collapsed',  label: 'Recolhidas' },
  { value: 'expanded',   label: 'Expandidas' },
  { value: 'separated',  label: 'Separar' },
];

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  return { open, setOpen, ref };
}

export function FilterBar({
  filters, members = [], tags = [],
  onToggleStatus, onTogglePriority, onToggleAssignee, onToggleTag,
  onSetGroupBy, onSetSearch, onSetSubtaskMode, onReset, isActive,
  savedFilters = [], onSaveFilter, onLoadFilter, onDeleteFilter,
}: Props) {
  const filterDropdown = useDropdown();
  const savedDropdown  = useDropdown();
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  function handleSave() {
    const trimmed = saveName.trim();
    if (!trimmed || !onSaveFilter) return;
    onSaveFilter(trimmed);
    setSaveName('');
    setShowSaveInput(false);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative flex items-center">
        <Search size={13} className="absolute left-2.5 text-ink-muted pointer-events-none" />
        <input
          type="text"
          value={filters.q}
          onChange={(e) => onSetSearch(e.target.value)}
          placeholder="Buscar tarefas…"
          className="pl-8 pr-3 py-1.5 bg-lift border border-line rounded-lg text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-colors w-44"
        />
      </div>

      {/* Filter dropdown */}
      <div ref={filterDropdown.ref} className="relative">
        <button
          onClick={() => filterDropdown.setOpen((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-sm font-medium transition-colors',
            filterDropdown.open || isActive
              ? 'bg-brand/12 border-brand/30 text-brand'
              : 'bg-lift border-line text-ink-dim hover:text-ink hover:border-brand/20',
          )}
        >
          <SlidersHorizontal size={13} />
          Filtros
          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />}
        </button>

        {filterDropdown.open && (
          <div className="absolute top-full left-0 mt-1.5 z-50 w-76 bg-modal border border-line rounded-xl shadow-2xl p-4 flex flex-col gap-4">
            {/* Status */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-2.5">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => {
                  const active = filters.status.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => onToggleStatus(s)}
                      style={active ? { background: T.status[s] + '22', color: T.status[s], borderColor: T.status[s] + '50' } : {}}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs border transition-colors',
                        active ? 'font-semibold' : 'border-line text-ink-dim hover:text-ink bg-lift',
                      )}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-2.5">Prioridade</p>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITIES.map((p) => {
                  const active = filters.priority.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => onTogglePriority(p)}
                      style={active ? { background: T.priority[p] + '22', color: T.priority[p], borderColor: T.priority[p] + '50' } : {}}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs border transition-colors',
                        active ? 'font-semibold' : 'border-line text-ink-dim hover:text-ink bg-lift',
                      )}
                    >
                      {PRIORITY_LABELS[p]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Members */}
            {members.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-2.5">Responsável</p>
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => {
                    const active = filters.assignees.includes(m._id);
                    return (
                      <button
                        key={m._id}
                        onClick={() => onToggleAssignee(m._id)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs border transition-colors',
                          active
                            ? 'bg-brand/15 border-brand/30 text-brand font-semibold'
                            : 'border-line text-ink-dim hover:text-ink bg-lift',
                        )}
                      >
                        {m.displayName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-2.5">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const active = filters.tags.includes(tag._id);
                    return (
                      <button
                        key={tag._id}
                        onClick={() => onToggleTag(tag._id)}
                        style={{
                          background: active ? tag.color : tag.color + '18',
                          color: active ? '#fff' : tag.color,
                          border: `1px solid ${tag.color}40`,
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-line">
              {isActive ? (
                <button
                  onClick={onReset}
                  className="flex items-center gap-1 text-xs text-danger hover:text-danger/80 transition-colors"
                >
                  <X size={11} /> Limpar filtros
                </button>
              ) : <span />}
              <button
                onClick={() => filterDropdown.setOpen(false)}
                className="text-xs text-ink-dim hover:text-ink transition-colors px-2.5 py-1.5 rounded-lg hover:bg-lift"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Group by */}
      <div className="relative flex items-center">
        <select
          value={filters.groupBy ?? ''}
          onChange={(e) => onSetGroupBy((e.target.value || undefined) as FilterState['groupBy'])}
          className="appearance-none pl-3 pr-7 py-1.5 bg-lift border border-line rounded-lg text-sm text-ink-dim focus:outline-none focus:border-brand transition-colors cursor-pointer"
        >
          {GROUP_OPTIONS.map((opt) => (
            <option key={String(opt.value)} value={opt.value ?? ''}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={11} className="absolute right-2 text-ink-muted pointer-events-none" />
      </div>

      {/* Subtask mode */}
      <div className="relative flex items-center">
        <select
          value={filters.subtaskMode}
          onChange={(e) => onSetSubtaskMode(e.target.value as SubtaskMode)}
          className="appearance-none pl-3 pr-7 py-1.5 bg-lift border border-line rounded-lg text-sm text-ink-dim focus:outline-none focus:border-brand transition-colors cursor-pointer"
        >
          {SUBTASK_MODES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown size={11} className="absolute right-2 text-ink-muted pointer-events-none" />
      </div>

      {/* Saved filters dropdown — last control */}
      {(savedFilters.length > 0 || onSaveFilter) && (
        <div ref={savedDropdown.ref} className="relative">
          <button
            onClick={() => savedDropdown.setOpen((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-sm font-medium transition-colors',
              savedDropdown.open
                ? 'bg-brand/12 border-brand/30 text-brand'
                : 'bg-lift border-line text-ink-dim hover:text-ink hover:border-brand/20',
            )}
          >
            <BookmarkCheck size={13} />
            Salvos
            {savedFilters.length > 0 && (
              <span className="text-[10px] font-semibold bg-brand/15 text-brand rounded-full px-1.5 py-0.5 leading-none">
                {savedFilters.length}
              </span>
            )}
          </button>

          {savedDropdown.open && (
            <div className="absolute top-full right-0 mt-1.5 z-50 w-68 bg-modal border border-line rounded-xl shadow-2xl p-2 flex flex-col gap-0.5">
              {/* Save current config */}
              {onSaveFilter && (
                <div className="px-1 pb-2 mb-1 border-b border-line">
                  {showSaveInput ? (
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        autoFocus
                        type="text"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveInput(false); }}
                        placeholder="Nome da configuração…"
                        className="flex-1 px-2.5 py-1 bg-lift border border-line rounded-lg text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-colors"
                      />
                      <button
                        onClick={handleSave}
                        disabled={!saveName.trim()}
                        className="px-2.5 py-1 rounded-lg text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => { setShowSaveInput(false); setSaveName(''); }}
                        className="p-1 rounded text-ink-dim hover:text-ink transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSaveInput(true)}
                      className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-xs text-ink-dim hover:text-brand hover:bg-lift transition-colors"
                    >
                      <Bookmark size={12} /> Salvar configuração atual
                    </button>
                  )}
                </div>
              )}

              {savedFilters.length === 0 ? (
                <p className="text-xs text-ink-muted px-3 py-3 text-center">
                  Nenhuma configuração salva ainda.
                </p>
              ) : (
                savedFilters.map((sf) => (
                  <div
                    key={sf._id}
                    className="flex items-center gap-1 group rounded-lg hover:bg-lift px-2 py-1.5 transition-colors"
                  >
                    <button
                      className="flex-1 text-sm text-left text-ink truncate"
                      onClick={() => {
                        onLoadFilter?.(sf.filters as Partial<FilterState>);
                        savedDropdown.setOpen(false);
                      }}
                    >
                      {sf.name}
                    </button>
                    {onDeleteFilter && (
                      <button
                        onClick={() => onDeleteFilter(sf._id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-ink-muted hover:text-danger transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Active filter chips */}
      {filters.status.map((s) => (
        <button
          key={s}
          onClick={() => onToggleStatus(s)}
          style={{ background: T.status[s] + '18', color: T.status[s], border: `1px solid ${T.status[s]}38` }}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        >
          {STATUS_LABELS[s]} <X size={10} />
        </button>
      ))}
      {filters.priority.map((p) => (
        <button
          key={p}
          onClick={() => onTogglePriority(p)}
          style={{ background: T.priority[p] + '18', color: T.priority[p], border: `1px solid ${T.priority[p]}38` }}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        >
          {PRIORITY_LABELS[p]} <X size={10} />
        </button>
      ))}
      {isActive && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-danger border border-danger/30 hover:bg-danger/10 transition-colors"
        >
          <X size={10} /> Limpar
        </button>
      )}
    </div>
  );
}
