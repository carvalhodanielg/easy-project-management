import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Zap, Plus, Calendar, X, ArrowRight, CheckCircle2, Clock, CircleDot,
  Loader2, Folder, Trash2, ChevronDown, ChevronRight, MoreHorizontal, Pencil,
} from 'lucide-react';
import * as sprintsApi from '../../api/sprints.api';
import * as sprintFoldersApi from '../../api/sprint-folders.api';
import type { DayOfWeek } from '../../api/sprint-folders.api';
import { type Sprint } from '../../api/sprints.api';
import { cn } from '../../lib/utils';

/* ── helpers ── */
const STATUS_ORDER: Sprint['status'][] = ['active', 'planning', 'completed'];

const STATUS_META: Record<Sprint['status'], { label: string; icon: React.ElementType; color: string; bg: string }> = {
  active:    { label: 'Ativo',        icon: CircleDot,    color: 'text-s-done',   bg: 'bg-s-done/10' },
  planning:  { label: 'Planejamento', icon: Clock,        color: 'text-s-review', bg: 'bg-s-review/10' },
  completed: { label: 'Concluído',    icon: CheckCircle2, color: 'text-ink-dim',  bg: 'bg-lift' },
};

const DAY_LABELS: Record<DayOfWeek, string> = {
  0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta',
  4: 'Quinta', 5: 'Sexta', 6: 'Sábado',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function durationDays(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000);
}

/* ── Sprint card ── */
function SprintCard({ sprint, spaceId, onDelete }: { sprint: Sprint; spaceId: string; onDelete: (id: string) => void }) {
  const navigate  = useNavigate();
  const meta      = STATUS_META[sprint.status];
  const StatusIcon = meta.icon;
  const days      = durationDays(sprint.startDate, sprint.endDate);
  const sprintLabel = `Sprint ${sprint.folderNumber ?? sprint.number}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <div
      onClick={() => navigate(`/spaces/${spaceId}/sprints/${sprint._id}`)}
      className="group relative flex flex-col gap-3.5 p-4 bg-surface border border-line rounded-xl hover:border-brand/30 hover:bg-lift/40 transition-all text-left w-full cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', meta.bg)}>
            <Zap size={15} className={meta.color} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">
              {sprintLabel}
            </p>
            {sprint.name && sprint.name !== sprintLabel && (
              <p className="text-xs text-ink-muted mt-0.5">{sprint.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ArrowRight
            size={14}
            className="text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity mt-1"
          />
          <div className="relative" ref={menuRef}>
            <button
              aria-label="Opções do sprint"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              className="p-1 rounded text-ink-muted hover:text-ink hover:bg-lift transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 z-10 min-w-[130px] bg-modal border border-line rounded-lg shadow-xl py-1"
              >
                <button
                  role="menuitem"
                  onClick={(e) => { e.stopPropagation(); onDelete(sprint._id); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                >
                  <Trash2 size={12} />
                  Apagar sprint
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <span className={cn('self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', meta.color, meta.bg)}>
        <StatusIcon size={10} />
        {meta.label}
      </span>

      <div className="flex items-center gap-1.5 text-xs text-ink-muted">
        <Calendar size={10} className="shrink-0" />
        <span>{fmtDate(sprint.startDate)} → {fmtDate(sprint.endDate)}</span>
        <span className="text-ink-muted/40">·</span>
        <span>{days} dias</span>
      </div>
    </div>
  );
}

/* ── Folder section ── */
function FolderSection({
  folder,
  sprints,
  spaceId,
  onDelete,
  onRename,
}: {
  folder: sprintFoldersApi.SprintFolder;
  sprints: Sprint[];
  spaceId: string;
  onDelete: (id: string) => void;
  onRename: (folder: sprintFoldersApi.SprintFolder) => void;
}) {
  const [open, setOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const grouped = STATUS_ORDER
    .map((status) => ({ status, items: sprints.filter((s) => s.status === status) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="mb-8">
      {/* Folder header */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-ink-dim hover:text-ink transition-colors"
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Folder size={14} className="text-brand/70" />
          <span className="text-sm font-semibold text-ink">{folder.name}</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span className="px-1.5 py-0.5 bg-lift rounded-full">{sprints.length} sprint{sprints.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{DAY_LABELS[folder.startDayOfWeek as DayOfWeek]}</span>
          <span>·</span>
          <span>{folder.durationWeeks}sem</span>
          {folder.autoComplete && (
            <>
              <span>·</span>
              <span className="text-s-done">Auto-fecha</span>
            </>
          )}
          {folder.folderEndDate && (
            <>
              <span>·</span>
              <span>até {fmtDate(folder.folderEndDate)}</span>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <div className="relative" ref={menuRef}>
            <button
              aria-label="Opções da pasta"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded text-ink-muted hover:text-ink hover:bg-lift transition-colors"
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 z-10 min-w-[150px] bg-modal border border-line rounded-lg shadow-xl py-1"
              >
                <button
                  role="menuitem"
                  onClick={() => { onRename(folder); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-lift transition-colors"
                >
                  <Pencil size={12} />
                  Renomear
                </button>
                <button
                  role="menuitem"
                  onClick={() => { onDelete(folder._id); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                >
                  <Trash2 size={12} />
                  Apagar pasta
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {open && grouped.length > 0 && grouped.map(({ status, items }) => {
        const meta = STATUS_META[status];
        const StatusIcon = meta.icon;
        return (
          <div key={status} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon size={11} className={meta.color} />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                {meta.label}
              </span>
              <span className="text-[10px] text-ink-muted bg-lift px-1.5 py-0.5 rounded-full tabular-nums">
                {items.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map((sprint) => (
                <SprintCard key={sprint._id} sprint={sprint} spaceId={spaceId} onDelete={() => {}} />
              ))}
            </div>
          </div>
        );
      })}

      {open && sprints.length === 0 && (
        <p className="text-sm text-ink-muted py-4 pl-2">Nenhum sprint nesta pasta ainda.</p>
      )}
    </div>
  );
}

/* ── Create sprint modal ── */
function CreateSprintModal({ spaceId, onClose }: { spaceId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name,  setName]  = useState('');
  const [start, setStart] = useState('');
  const [end,   setEnd]   = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => sprintsApi.createSprint(spaceId, { name, startDate: start, endDate: end }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sprints', spaceId] });
      onClose();
    },
    onError: () => setError('Falha ao criar sprint.'),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-modal border border-line rounded-2xl shadow-2xl w-full max-w-sm p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-ink">Novo Sprint</h3>
          <button onClick={onClose} className="p-1 rounded text-ink-muted hover:text-ink hover:bg-lift transition-colors">
            <X size={15} />
          </button>
        </div>

        <form
          onSubmit={(e: FormEvent) => { e.preventDefault(); setError(''); mutation.mutate(); }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-ink-dim mb-1.5">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Nome do sprint…"
              className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-ink-dim mb-1.5">Início</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink focus:outline-none focus:border-brand transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-dim mb-1.5">Término</label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm text-ink-dim hover:text-ink transition-colors rounded-lg hover:bg-lift"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hi text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60"
            >
              {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
              {mutation.isPending ? 'Criando…' : 'Criar sprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Create Sprint Folder Modal ── */
function CreateSprintFolderModal({ spaceId, onClose }: { spaceId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [startDay, setStartDay] = useState<DayOfWeek>(1);
  const [durationWeeks, setDurationWeeks] = useState(2);
  const [autoComplete, setAutoComplete] = useState(false);
  const [openFuture, setOpenFuture] = useState(1);
  const [folderEndDate, setFolderEndDate] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      sprintFoldersApi.createSprintFolder(spaceId, {
        name,
        startDayOfWeek: startDay,
        durationWeeks,
        autoComplete,
        openFutureSprints: openFuture,
        folderEndDate: folderEndDate || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sprint-folders', spaceId] });
      void queryClient.invalidateQueries({ queryKey: ['sprints', spaceId] });
      onClose();
    },
    onError: () => setError('Falha ao criar pasta.'),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-modal border border-line rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand/12 border border-brand/20 flex items-center justify-center">
              <Folder size={15} className="text-brand" />
            </div>
            <h3 className="text-base font-semibold text-ink">Nova pasta de sprints</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-ink-muted hover:text-ink hover:bg-lift transition-colors">
            <X size={15} />
          </button>
        </div>

        <form
          onSubmit={(e: FormEvent) => { e.preventDefault(); setError(''); mutation.mutate(); }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-ink-dim mb-1.5">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Ex: Sprint Quinzenal"
              className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-dim mb-1.5">Início do sprint</label>
              <select
                value={startDay}
                onChange={(e) => setStartDay(Number(e.target.value) as DayOfWeek)}
                className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink focus:outline-none focus:border-brand transition-colors"
              >
                {(Object.entries(DAY_LABELS) as [string, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-dim mb-1.5">Duração (semanas)</label>
              <input
                type="number"
                min={1}
                max={52}
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-dim mb-1.5">Sprints futuras abertas</label>
            <input
              type="number"
              min={1}
              max={10}
              value={openFuture}
              onChange={(e) => setOpenFuture(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink focus:outline-none focus:border-brand transition-colors"
            />
            <p className="mt-1 text-[11px] text-ink-muted">
              Novas sprints são criadas automaticamente para manter esse total de sprints abertas.
            </p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setAutoComplete((v) => !v)}
              className={cn(
                'relative w-9 h-5 rounded-full transition-colors shrink-0',
                autoComplete ? 'bg-brand' : 'bg-line',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                  autoComplete ? 'translate-x-4' : 'translate-x-0',
                )}
              />
            </div>
            <div>
              <p className="text-sm text-ink">Marcar como concluída automaticamente</p>
              <p className="text-[11px] text-ink-muted">A sprint é fechada quando a data de término chega.</p>
            </div>
          </label>

          <div>
            <label className="block text-xs font-medium text-ink-dim mb-1.5">
              Data limite da pasta <span className="text-ink-muted font-normal">(opcional)</span>
            </label>
            <input
              type="date"
              value={folderEndDate}
              onChange={(e) => setFolderEndDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink focus:outline-none focus:border-brand transition-colors"
            />
            <p className="mt-1 text-[11px] text-ink-muted">
              Após essa data nenhuma nova sprint é criada e a pasta é arquivada.
            </p>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm text-ink-dim hover:text-ink transition-colors rounded-lg hover:bg-lift"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hi text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60"
            >
              {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
              {mutation.isPending ? 'Criando…' : 'Criar pasta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Rename Folder Modal ── */
function RenameFolderModal({
  folder,
  spaceId,
  onClose,
}: {
  folder: sprintFoldersApi.SprintFolder;
  spaceId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(folder.name);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => sprintFoldersApi.updateSprintFolder(spaceId, folder._id, { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sprint-folders', spaceId] });
      onClose();
    },
    onError: () => setError('Falha ao renomear pasta.'),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-modal border border-line rounded-2xl shadow-2xl w-full max-w-sm p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-ink">Renomear pasta</h3>
          <button onClick={onClose} className="p-1 rounded text-ink-muted hover:text-ink hover:bg-lift transition-colors">
            <X size={15} />
          </button>
        </div>
        <form
          onSubmit={(e: FormEvent) => { e.preventDefault(); setError(''); mutation.mutate(); }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-ink-dim mb-1.5">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm text-ink-dim hover:text-ink transition-colors rounded-lg hover:bg-lift"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hi text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60"
            >
              {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
              {mutation.isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main ── */
export function SprintListPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<sprintFoldersApi.SprintFolder | null>(null);

  const { data: sprints = [], isLoading: loadingSprints } = useQuery({
    queryKey: ['sprints', spaceId],
    queryFn: () => sprintsApi.getSprints(spaceId!),
    enabled: !!spaceId,
  });

  const { data: folders = [], isLoading: loadingFolders } = useQuery({
    queryKey: ['sprint-folders', spaceId],
    queryFn: () => sprintFoldersApi.getSprintFolders(spaceId!),
    enabled: !!spaceId,
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: string) => sprintFoldersApi.deleteSprintFolder(spaceId!, folderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sprint-folders', spaceId] });
      void queryClient.invalidateQueries({ queryKey: ['sprints', spaceId] });
    },
  });

  const deleteSprintMutation = useMutation({
    mutationFn: (sprintId: string) => sprintsApi.deleteSprint(spaceId!, sprintId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sprints', spaceId] });
    },
  });

  const isLoading = loadingSprints || loadingFolders;

  const unfiledSprints = sprints.filter((s) => !s.folderId);

  const unfiledGrouped = STATUS_ORDER
    .map((status) => ({ status, items: unfiledSprints.filter((s) => s.status === status) }))
    .filter((g) => g.items.length > 0);

  const totalCount = sprints.length;

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <header className="bg-surface border-b border-line shrink-0 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand/12 border border-brand/20 flex items-center justify-center">
              <Zap size={15} className="text-brand" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-ink">Sprints</h1>
              <p className="text-xs text-ink-muted mt-0.5">
                {totalCount === 0
                  ? 'Nenhum sprint'
                  : `${totalCount} sprint${totalCount !== 1 ? 's' : ''}${folders.length > 0 ? ` em ${folders.length} pasta${folders.length !== 1 ? 's' : ''}` : ''}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateFolder(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-line hover:bg-lift text-ink-dim hover:text-ink text-sm font-medium rounded-lg transition-all"
            >
              <Folder size={13} /> Nova pasta
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-hi text-white text-sm font-medium rounded-lg transition-all"
            >
              <Plus size={13} /> Novo sprint
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-6">

        {isLoading && (
          <div className="flex items-center gap-2 text-ink-muted text-sm py-10">
            <Loader2 size={15} className="animate-spin" /> Carregando…
          </div>
        )}

        {!isLoading && totalCount === 0 && folders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-14 h-14 rounded-2xl bg-lift border border-line flex items-center justify-center mb-5">
              <Zap size={22} className="text-ink-muted" />
            </div>
            <p className="text-base font-semibold text-ink-dim">Nenhum sprint criado ainda</p>
            <p className="text-sm text-ink-muted mt-1.5 mb-6 max-w-xs">
              Crie sprints avulsos ou organize-os em pastas com cadência automática.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateFolder(true)}
                className="flex items-center gap-2 px-4 py-2 border border-line hover:bg-lift text-ink-dim hover:text-ink text-sm font-semibold rounded-lg transition-all"
              >
                <Folder size={13} /> Nova pasta
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hi text-white text-sm font-semibold rounded-lg transition-all"
              >
                <Plus size={13} /> Criar sprint
              </button>
            </div>
          </div>
        )}

        {/* Folder sections */}
        {!isLoading && folders.map((folder) => (
          <FolderSection
            key={folder._id}
            folder={folder}
            sprints={sprints.filter((s) => s.folderId === folder._id)}
            spaceId={spaceId!}
            onDelete={(id) => deleteFolderMutation.mutate(id)}
            onRename={(f) => setRenamingFolder(f)}
          />
        ))}

        {/* Unfiled sprints */}
        {!isLoading && unfiledGrouped.length > 0 && (
          <div className="mb-8">
            {folders.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <Zap size={14} className="text-ink-muted" />
                <span className="text-sm font-semibold text-ink-dim">Sprints avulsos</span>
                <span className="text-xs text-ink-muted bg-lift px-1.5 py-0.5 rounded-full">{unfiledSprints.length}</span>
              </div>
            )}
            {unfiledGrouped.map(({ status, items }) => {
              const meta = STATUS_META[status];
              const StatusIcon = meta.icon;
              return (
                <div key={status} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <StatusIcon size={12} className={meta.color} />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
                      {meta.label}
                    </span>
                    <span className="text-[11px] text-ink-muted bg-lift px-1.5 py-0.5 rounded-full tabular-nums">
                      {items.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {items.map((sprint) => (
                      <SprintCard
                        key={sprint._id}
                        sprint={sprint}
                        spaceId={spaceId!}
                        onDelete={(id) => deleteSprintMutation.mutate(id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateSprintModal spaceId={spaceId!} onClose={() => setShowCreate(false)} />
      )}

      {showCreateFolder && (
        <CreateSprintFolderModal spaceId={spaceId!} onClose={() => setShowCreateFolder(false)} />
      )}

      {renamingFolder && (
        <RenameFolderModal
          folder={renamingFolder}
          spaceId={spaceId!}
          onClose={() => setRenamingFolder(null)}
        />
      )}
    </div>
  );
}
