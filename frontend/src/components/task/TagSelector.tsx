import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Check, X } from 'lucide-react';
import * as tagsApi from '../../api/tags.api';
import type { Tag } from '../../types/task.types';

const PALETTE = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#3B82F6', '#6366F1', '#A855F7',
  '#EC4899', '#6B7280',
];

const DEFAULT_COLOR = '#6366F1';

interface Props {
  spaceId: string;
  tags: Tag[];
  onChange: (tagIds: string[]) => void;
  /** Hides the + button until the parent group is hovered (for use inside task rows). */
  compact?: boolean;
}

function ColorSwatches({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (c: string) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`cor ${c}`}
          onClick={() => onSelect(c)}
          className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 shrink-0"
          style={{
            background: c,
            borderColor: selected === c ? '#fff' : 'transparent',
            outline: selected === c ? `2px solid ${c}` : 'none',
          }}
        />
      ))}
    </div>
  );
}

export function TagSelector({ spaceId, tags, onChange, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(DEFAULT_COLOR);
  const [newTagOpen, setNewTagOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const assignedIds = new Set(tags.map((t) => (typeof t === 'string' ? t : t._id)));

  const { data: allTags = [] } = useQuery({
    queryKey: ['tags', spaceId],
    queryFn: () => tagsApi.getTags(spaceId),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setEditingTagId(null);
        setNewTagOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; color: string }) =>
      tagsApi.createTag(spaceId, payload),
    onSuccess: (newTag) => {
      void queryClient.invalidateQueries({ queryKey: ['tags', spaceId] });
      onChange([...currentIds(), newTag._id]);
      setNewName('');
      setNewColor(DEFAULT_COLOR);
      setNewTagOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ tagId, name, color }: { tagId: string; name: string; color: string }) =>
      tagsApi.updateTag(spaceId, tagId, { name, color }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tags', spaceId] });
      setEditingTagId(null);
    },
  });

  function currentIds(): string[] {
    return tags.map((t) => (typeof t === 'string' ? t : t._id)).filter(Boolean) as string[];
  }

  function toggle(tag: Tag) {
    if (assignedIds.has(tag._id)) {
      onChange(currentIds().filter((id) => id !== tag._id));
    } else {
      onChange([...currentIds(), tag._id]);
    }
  }

  function startEdit(tag: Tag) {
    setEditingTagId(tag._id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setNewTagOpen(false);
  }

  function saveEdit() {
    if (!editingTagId || !editName.trim()) return;
    updateMutation.mutate({ tagId: editingTagId, name: editName.trim(), color: editColor });
  }

  function handleCreate() {
    if (!newName.trim()) return;
    createMutation.mutate({ name: newName.trim(), color: newColor });
  }

  const MAX_VISIBLE = compact ? 2 : Infinity;
  const visibleTags = tags.slice(0, MAX_VISIBLE);
  const overflowCount = compact ? Math.max(0, tags.length - MAX_VISIBLE) : 0;

  return (
    <div ref={ref} className="relative flex items-center gap-1.5 flex-wrap">
      {visibleTags.map((tag) => (
        <span
          key={tag._id}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{
            background: tag.color + '18',
            color: tag.color,
            border: `1px solid ${tag.color}30`,
          }}
        >
          {tag.name}
          <button
            type="button"
            aria-label={`remover ${tag.name}`}
            onClick={() => onChange(currentIds().filter((id) => id !== tag._id))}
            className={`transition-opacity ml-0.5${compact ? ' opacity-0 group-hover:opacity-100' : ' hover:opacity-70'}`}
          >
            <X size={10} />
          </button>
        </span>
      ))}

      {overflowCount > 0 && (
        <button
          type="button"
          aria-label="ver todas as labels"
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 px-1.5 py-0.5 rounded-full text-xs text-ink-muted bg-lift border border-line hover:border-brand/60 hover:text-ink transition-colors"
        >
          +{overflowCount}
        </button>
      )}

      <button
        type="button"
        aria-label="adicionar label"
        onClick={() => setOpen((o) => !o)}
        className={`w-6 h-6 rounded-full border border-dashed border-line flex items-center justify-center text-ink-muted hover:text-ink hover:border-brand/60 transition-colors${compact && tags.length > 0 ? ' opacity-0 group-hover:opacity-100' : ''}`}
      >
        <Plus size={13} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-modal border border-line rounded-xl shadow-2xl min-w-56 py-1.5 max-h-72 overflow-y-auto">
          {allTags.length === 0 && !newTagOpen && (
            <p className="px-3 py-2 text-xs text-ink-muted">Nenhuma label criada ainda.</p>
          )}

          {allTags.map((tag) => {
            const assigned = assignedIds.has(tag._id);
            const editing = editingTagId === tag._id;

            if (editing) {
              return (
                <div key={tag._id} className="px-3 py-2 flex flex-col gap-2 border-b border-line-dim">
                  <ColorSwatches selected={editColor} onSelect={setEditColor} />
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') setEditingTagId(null);
                      }}
                      className="flex-1 bg-lift border border-line rounded-md px-2 py-1 text-xs text-ink focus:outline-none focus:border-brand"
                      placeholder="nome da label"
                    />
                    <button
                      type="button"
                      aria-label="salvar edição"
                      onClick={saveEdit}
                      disabled={updateMutation.isPending}
                      className="p-1 rounded text-green-400 hover:bg-green-400/10 transition-colors"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      type="button"
                      aria-label="cancelar edição"
                      onClick={() => setEditingTagId(null)}
                      className="p-1 rounded text-ink-muted hover:bg-lift transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={tag._id} className="flex items-center group">
                <button
                  type="button"
                  aria-label={`toggle ${tag.name}`}
                  onClick={() => toggle(tag)}
                  className="flex-1 flex items-center gap-2.5 px-3 py-2 text-left text-sm text-ink hover:bg-lift transition-colors"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: tag.color }}
                  />
                  <span className="flex-1 text-xs">{tag.name}</span>
                  {assigned && (
                    <Check
                      data-testid={`tag-check-${tag._id}`}
                      size={12}
                      className="text-brand shrink-0"
                    />
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`editar ${tag.name}`}
                  onClick={() => startEdit(tag)}
                  className="px-2 py-2 text-ink-muted opacity-0 group-hover:opacity-100 hover:text-ink transition-all"
                >
                  <Pencil size={11} />
                </button>
              </div>
            );
          })}

          <div className="border-t border-line-dim mt-1">
            {newTagOpen ? (
              <div className="px-3 py-2 flex flex-col gap-2">
                <ColorSwatches selected={newColor} onSelect={setNewColor} />
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreate();
                      if (e.key === 'Escape') setNewTagOpen(false);
                    }}
                    placeholder="nome da label"
                    className="flex-1 bg-lift border border-line rounded-md px-2 py-1 text-xs text-ink focus:outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    aria-label="criar"
                    onClick={handleCreate}
                    disabled={createMutation.isPending || !newName.trim()}
                    className="px-2 py-1 rounded-md bg-brand/20 text-brand text-xs font-semibold hover:bg-brand/30 disabled:opacity-40 transition-colors"
                  >
                    Criar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                aria-label="criar nova label"
                onClick={() => { setNewTagOpen(true); setEditingTagId(null); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-ink-muted hover:text-ink hover:bg-lift transition-colors"
              >
                <Plus size={12} />
                Criar nova label
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
