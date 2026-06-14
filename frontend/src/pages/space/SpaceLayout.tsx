import { useEffect, useState, useCallback, useContext, useRef, type FormEvent } from 'react';
import { Outlet, useParams, useNavigate, NavLink, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  Home, List, Zap, Plus, LogOut, ChevronDown, ChevronRight,
  FolderOpen, X, Loader2, Users, Search, Folder, Trash2,
  Pencil, Settings, FileText, FolderPlus, GripVertical,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useUiStore } from '../../store/ui.store';
import { useLogout } from '../../hooks/useAuth';
import { useSpacesStore } from '../../store/spaces.store';
import * as spacesApi from '../../api/spaces.api';
import * as listsApi from '../../api/lists.api';
import * as sprintsApi from '../../api/sprints.api';
import * as tasksApi from '../../api/tasks.api';
import * as wikiApi from '../../api/wiki.api';
import * as sprintFoldersApi from '../../api/sprint-folders.api';
import type { DayOfWeek } from '../../api/sprint-folders.api';
import { GlobalSearch } from '../../components/search/GlobalSearch';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { ShortcutsModal } from '../../components/ui/ShortcutsModal';
import { cn } from '../../lib/utils';
import { sprintDisplayStatus } from '../../lib/sprintStatus';
import { Tooltip } from '../../components/ui/tooltip';
import { FolderMenu } from '../../components/ui/FolderMenu';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useMoveTaskWithUndo } from '../../hooks/useMoveTaskWithUndo';
import { TaskDragProvider } from '../../contexts/TaskDragProvider';
import { MovingSprintContext } from '../../contexts/MovingSprintContext';
import type { ReorderHandler } from '../../contexts/TaskDragContext';
import { resolveSprintDrop, isSprintDropzone } from './resolveSprintDrop';

const DAY_LABELS: Record<DayOfWeek, string> = {
  0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta',
  4: 'Quinta', 5: 'Sexta', 6: 'Sábado',
};

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function NavItem({
  to, icon: Icon, children, count,
}: {
  to: string; icon: React.ElementType; children: React.ReactNode; count?: number;
}) {
  return (
    <NavLink
      to={to}
      end={false}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-2.5 px-2.5 py-[5px] rounded-lg text-sm transition-colors select-none',
          isActive
            ? 'bg-brand/12 text-brand font-medium'
            : 'text-ink-dim hover:bg-lift hover:text-ink',
        )
      }
    >
      <Icon size={14} className="shrink-0 opacity-75" />
      <span className="flex-1 truncate">{children}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs tabular-nums text-ink-muted">{count}</span>
      )}
    </NavLink>
  );
}

function SectionHeader({
  label, open, onToggle, onAdd,
}: {
  label: string; open: boolean; onToggle: () => void; onAdd?: () => void;
}) {
  return (
    <div
      className="group flex items-center gap-1 px-2.5 py-1 cursor-pointer select-none rounded hover:bg-lift/40 transition-colors mt-4 mb-0.5"
      onClick={onToggle}
    >
      <span className="flex-1 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
        {label}
      </span>
      {open
        ? <ChevronDown size={9} className="text-ink-muted shrink-0" />
        : <ChevronRight size={9} className="text-ink-muted shrink-0" />
      }
      {onAdd && (
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-brand/20 hover:text-brand text-ink-muted transition-all shrink-0 ml-0.5"
        >
          <Plus size={11} />
        </button>
      )}
    </div>
  );
}

/**
 * A sprint row in the sidebar. Doubles as a drop target: dragging a task from
 * the open sprint and releasing it here moves the task to this sprint.
 */
export function SprintNavItem({
  sprint,
  spaceId,
  indented,
}: {
  sprint: sprintsApi.Sprint;
  spaceId: string;
  indented?: boolean;
}) {
  const ds = sprintDisplayStatus(sprint);
  const movingToSprintId = useContext(MovingSprintContext);
  const isMoving = movingToSprintId === sprint._id;
  const { setNodeRef, isOver } = useDroppable({
    id: `sprint-dz-${sprint._id}`,
    data: { type: 'sprint-dropzone', sprintId: sprint._id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg transition-colors',
        (isOver || isMoving) && 'ring-1 ring-brand/60 bg-brand/10',
      )}
    >
      <NavLink
        to={`/spaces/${spaceId}/sprints/${sprint._id}`}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-1.5 py-1 rounded-lg text-sm transition-colors select-none',
            indented ? 'pl-6 pr-2' : 'px-2.5',
            isActive
              ? 'bg-brand/12 text-brand font-medium'
              : 'text-ink-dim hover:bg-lift hover:text-ink',
          )
        }
      >
        <span title={ds.label} className="shrink-0 flex">
          <ds.Icon size={12} className={ds.color} />
        </span>
        <span className="truncate text-xs font-medium flex-1 min-w-0">
          Sprint {indented ? (sprint.folderNumber ?? sprint.number) : sprint.number}
        </span>
        {isMoving ? (
          <span className="shrink-0 flex items-center gap-1 text-[10px] text-brand">
            <Loader2 size={10} className="animate-spin" />
            movendo…
          </span>
        ) : (
          <span className="shrink-0 text-[10px] text-ink-muted tabular-nums">
            {fmtShort(sprint.startDate)} - {fmtShort(sprint.endDate)}
          </span>
        )}
      </NavLink>
    </div>
  );
}

/** Collapsible folder inside the Sprints section */
function SprintFolderItem({
  folder,
  sprints,
  spaceId,
  onEditSettings,
}: {
  folder: sprintFoldersApi.SprintFolder;
  sprints: sprintsApi.Sprint[];
  spaceId: string;
  onEditSettings: (folder: sprintFoldersApi.SprintFolder) => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(folder.name);
  const [error, setError] = useState('');

  const renameMutation = useMutation({
    mutationFn: (name: string) =>
      sprintFoldersApi.updateSprintFolder(spaceId, folder._id, { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sprint-folders', spaceId] });
      setRenaming(false);
    },
  });

  const createSprintMutation = useMutation({
    mutationFn: () => sprintFoldersApi.createNextSprint(spaceId, folder._id),
    onSuccess: () => {
      setOpen(true);
      void queryClient.invalidateQueries({ queryKey: ['sprints', spaceId] });
    },
    onError: () => setError('Não foi possível criar a sprint.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => sprintFoldersApi.deleteSprintFolder(spaceId, folder._id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sprint-folders', spaceId] });
      void queryClient.invalidateQueries({ queryKey: ['sprints', spaceId] });
    },
  });

  function commitRename() {
    const name = nameDraft.trim();
    if (name && name !== folder.name) renameMutation.mutate(name);
    else setRenaming(false);
  }

  return (
    <div>
      <div className="group flex items-center gap-2 w-full px-2.5 py-[5px] rounded-lg text-sm text-ink-dim hover:bg-lift hover:text-ink transition-colors select-none">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          {open
            ? <ChevronDown size={10} className="text-ink-muted shrink-0" />
            : <ChevronRight size={10} className="text-ink-muted shrink-0" />}
          <Folder size={13} className="shrink-0 opacity-75" />
          {renaming ? (
            <input
              autoFocus
              value={nameDraft}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setNameDraft(folder.name); setRenaming(false); }
              }}
              className="flex-1 min-w-0 bg-input border border-brand/40 rounded px-1.5 py-0.5 text-xs text-ink focus:outline-none"
            />
          ) : (
            <span className="flex-1 truncate text-xs font-medium">{folder.name}</span>
          )}
        </button>
        {!renaming && sprints.length > 0 && (
          <span className="text-[10px] tabular-nums text-ink-muted group-hover:hidden">{sprints.length}</span>
        )}
        <FolderMenu
          label="Opções da pasta de sprints"
          items={[
            {
              label: 'Criar sprint',
              icon: Plus,
              loading: createSprintMutation.isPending,
              onClick: () => { setError(''); createSprintMutation.mutate(); },
            },
            { label: 'Editar nome', icon: Pencil, onClick: () => { setNameDraft(folder.name); setRenaming(true); } },
            { label: 'Configurações da pasta', icon: Settings, onClick: () => onEditSettings(folder) },
            {
              label: 'Excluir pasta',
              icon: Trash2,
              danger: true,
              onClick: () => {
                if (window.confirm(`Excluir a pasta "${folder.name}" e suas sprints?`)) deleteMutation.mutate();
              },
            },
          ]}
        />
      </div>

      {error && <p className="pl-7 pr-2.5 text-[10px] text-danger">{error}</p>}

      {open && sprints.map((sprint) => (
        <SprintNavItem key={sprint._id} sprint={sprint} spaceId={spaceId} indented />
      ))}

      {open && sprints.length === 0 && (
        <p className="pl-7 pr-2.5 py-[5px] text-xs text-ink-muted italic">Sem sprints</p>
      )}
    </div>
  );
}

/** Document (wiki) folder row in the Documentos section, with options menu. */
function DocFolderItem({
  folder,
  spaceId,
}: {
  folder: wikiApi.WikiFolder;
  spaceId: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(folder.name);

  const renameMutation = useMutation({
    mutationFn: (name: string) => wikiApi.updateFolder(spaceId, folder._id, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wiki-folders', spaceId] });
      setRenaming(false);
    },
  });

  const createDocMutation = useMutation({
    mutationFn: () => wikiApi.createDocument(spaceId, folder._id, 'Sem título'),
    onSuccess: (doc) => {
      void queryClient.invalidateQueries({ queryKey: ['wiki-documents', spaceId, folder._id] });
      navigate(`/spaces/${spaceId}/wiki/documents/${doc._id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => wikiApi.deleteFolder(spaceId, folder._id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wiki-folders', spaceId] });
    },
  });

  function commitRename() {
    const name = nameDraft.trim();
    if (name && name !== folder.name) renameMutation.mutate(name);
    else setRenaming(false);
  }

  return (
    <div className="group flex items-center gap-2.5 px-2.5 py-[5px] rounded-lg text-sm text-ink-dim hover:bg-lift hover:text-ink transition-colors select-none">
      {renaming ? (
        <>
          <FolderOpen size={14} className="shrink-0 opacity-75" />
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setNameDraft(folder.name); setRenaming(false); }
            }}
            className="flex-1 min-w-0 bg-input border border-brand/40 rounded px-1.5 py-0.5 text-xs text-ink focus:outline-none"
          />
        </>
      ) : (
        <NavLink
          to={`/spaces/${spaceId}/wiki/folders/${folder._id}`}
          className={({ isActive }) =>
            cn('flex items-center gap-2.5 flex-1 min-w-0', isActive && 'text-brand font-medium')
          }
        >
          <FolderOpen size={14} className="shrink-0 opacity-75" />
          <span className="flex-1 truncate">{folder.name}</span>
        </NavLink>
      )}
      <FolderMenu
        label="Opções da pasta de documentos"
        items={[
          {
            label: 'Criar documento',
            icon: FileText,
            loading: createDocMutation.isPending,
            onClick: () => createDocMutation.mutate(),
          },
          { label: 'Editar nome', icon: Pencil, onClick: () => { setNameDraft(folder.name); setRenaming(true); } },
          {
            label: 'Excluir pasta',
            icon: Trash2,
            danger: true,
            onClick: () => {
              if (window.confirm(`Excluir a pasta "${folder.name}" e seus documentos?`)) deleteMutation.mutate();
            },
          },
        ]}
      />
    </div>
  );
}

/* ── Create Sprint Folder Modal ── */
function CreateSprintFolderModal({
  spaceId,
  folder,
  onClose,
}: {
  spaceId: string;
  /** When provided the modal edits an existing folder instead of creating one. */
  folder?: sprintFoldersApi.SprintFolder;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!folder;
  const [name, setName] = useState(folder?.name ?? '');
  const [startDay, setStartDay] = useState<DayOfWeek>(folder?.startDayOfWeek ?? 1);
  const [durationWeeks, setDurationWeeks] = useState(folder?.durationWeeks ?? 2);
  const [autoComplete, setAutoComplete] = useState(folder?.autoComplete ?? false);
  const [openFuture, setOpenFuture] = useState(folder?.openFutureSprints ?? 1);
  const [folderEndDate, setFolderEndDate] = useState(
    folder?.folderEndDate ? folder.folderEndDate.slice(0, 10) : '',
  );
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        startDayOfWeek: startDay,
        durationWeeks,
        autoComplete,
        openFutureSprints: openFuture,
        folderEndDate: folderEndDate || null,
      };
      return isEdit
        ? sprintFoldersApi.updateSprintFolder(spaceId, folder._id, payload)
        : sprintFoldersApi.createSprintFolder(spaceId, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sprint-folders', spaceId] });
      void queryClient.invalidateQueries({ queryKey: ['sprints', spaceId] });
      onClose();
    },
    onError: () => setError(isEdit ? 'Falha ao salvar pasta.' : 'Falha ao criar pasta.'),
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
            <h3 className="text-base font-semibold text-ink">
              {isEdit ? 'Editar pasta de sprints' : 'Nova pasta de sprints'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-ink-muted hover:text-ink hover:bg-lift transition-colors">
            <X size={15} />
          </button>
        </div>

        <form
          onSubmit={(e: FormEvent) => { e.preventDefault(); setError(''); mutation.mutate(); }}
          className="space-y-4"
        >
          {/* Name */}
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

          {/* Day + Duration */}
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

          {/* Open future sprints */}
          <div>
            <label className="block text-xs font-medium text-ink-dim mb-1.5">
              Sprints futuras abertas
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={openFuture}
              onChange={(e) => setOpenFuture(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink focus:outline-none focus:border-brand transition-colors"
            />
            <p className="mt-1 text-[11px] text-ink-muted">
              Ao finalizar uma sprint, novas são criadas automaticamente para manter esse total de sprints abertas.
            </p>
          </div>

          {/* Auto-complete toggle */}
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

          {/* Folder end date */}
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
              {mutation.isPending
                ? (isEdit ? 'Salvando…' : 'Criando…')
                : (isEdit ? 'Salvar' : 'Criar pasta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SpaceLayout() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = useAuthStore((s) => s.user);
  const logout    = useLogout();
  const { setCurrentSpace } = useSpacesStore();
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar    = useUiStore((s) => s.toggleSidebar);
  const queryClient = useQueryClient();

  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<sprintFoldersApi.SprintFolder | null>(null);
  const [sprintName,  setSprintName]  = useState('');
  const [sprintStart, setSprintStart] = useState('');
  const [sprintEnd,   setSprintEnd]   = useState('');
  const [sprintError, setSprintError] = useState('');
  const [listsOpen,   setListsOpen]   = useState(true);
  const [sprintsOpen, setSprintsOpen] = useState(true);
  const [wikiOpen,    setWikiOpen]    = useState(false);
  const [creatingDocFolder, setCreatingDocFolder] = useState(false);
  const [docFolderName, setDocFolderName] = useState('');

  const { data: space } = useQuery({
    queryKey: ['space', spaceId],
    queryFn: () => spacesApi.getSpace(spaceId!),
    enabled: !!spaceId,
  });
  const { data: lists = [] } = useQuery({
    queryKey: ['lists', spaceId],
    queryFn: () => listsApi.getLists(spaceId!),
    enabled: !!spaceId,
  });
  const { data: sprints = [] } = useQuery({
    queryKey: ['sprints', spaceId],
    queryFn: () => sprintsApi.getSprints(spaceId!),
    enabled: !!spaceId,
  });
  const { data: sprintFolders = [] } = useQuery({
    queryKey: ['sprint-folders', spaceId],
    queryFn: () => sprintFoldersApi.getSprintFolders(spaceId!),
    enabled: !!spaceId,
  });
  const { data: wikiFolders = [] } = useQuery({
    queryKey: ['wiki-folders', spaceId],
    queryFn: () => wikiApi.getFolders(spaceId!),
    enabled: !!spaceId,
  });

  const createSprintMutation = useMutation({
    mutationFn: () =>
      sprintsApi.createSprint(spaceId!, { name: sprintName, startDate: sprintStart, endDate: sprintEnd }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sprints', spaceId] });
      setShowCreateSprint(false);
      setSprintName(''); setSprintStart(''); setSprintEnd('');
    },
    onError: () => setSprintError('Falha ao criar sprint.'),
  });

  const createDocFolderMutation = useMutation({
    mutationFn: (name: string) => wikiApi.createFolder(spaceId!, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wiki-folders', spaceId] });
      setWikiOpen(true);
      setCreatingDocFolder(false);
      setDocFolderName('');
    },
  });

  function submitDocFolder() {
    const name = docFolderName.trim();
    if (name) createDocFolderMutation.mutate(name);
    else { setCreatingDocFolder(false); setDocFolderName(''); }
  }

  useEffect(() => {
    if (space) setCurrentSpace(space);
    return () => setCurrentSpace(null);
  }, [space, setCurrentSpace]);

  const handleGlobalKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setShowSearch((v) => !v);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, [handleGlobalKey]);

  // Global keyboard shortcuts: "?" opens the reference modal, "Esc" closes panels.
  useKeyboardShortcuts({
    '?': () => setShowShortcuts(true),
    '[': () => toggleSidebar(),
    escape: () => {
      setShowShortcuts(false);
      setShowSearch(false);
      setShowCreateSprint(false);
      setShowCreateFolder(false);
      setEditingFolder(null);
      setCreatingDocFolder(false);
    },
  });


  const sprintsListActive = location.pathname.endsWith('/sprints');

  // Sprints that don't belong to any folder
  const unfiledSprints = sprints.filter((s) => !s.folderId);

  // ── Drag-and-drop: a single DndContext spans the sidebar (drop targets) and
  // the page outlet (drag sources). Pages register their own reorder handler;
  // dropping a task onto a sidebar sprint moves it there with an undo toast.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const reorderHandlerRef = useRef<ReorderHandler | null>(null);
  const moveWithUndo = useMoveTaskWithUndo(spaceId!);

  // Name of the task currently being dragged — drives the floating DragOverlay
  // cue that follows the cursor so it's clear a task is being carried.
  const [draggingTaskName, setDraggingTaskName] = useState<string | null>(null);
  // Whether the dragged task is currently over a sidebar sprint dropzone — the
  // floating cue only shows then, so in-list reordering keeps its native visual.
  const [overSprintDropzone, setOverSprintDropzone] = useState(false);
  // Sprint a task is being moved into while the API call is in flight — drives
  // the per-sprint "movendo…" indicator in the sidebar.
  const [movingToSprintId, setMovingToSprintId] = useState<string | null>(null);

  function handleDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === 'task') {
      setDraggingTaskName((event.active.data.current.name as string) ?? 'Tarefa');
    }
  }

  // The dragged task row is wide and lives in the main area, so its center rarely
  // approaches a small sidebar sprint row — closestCenter alone would never pick
  // it. Detect sidebar sprints by where the pointer is; fall back to closestCenter
  // for in-list reordering.
  const collisionDetection: CollisionDetection = (args) => {
    const sprintHit = pointerWithin(args).filter(
      (c) => c.data?.droppableContainer?.data?.current?.type === 'sprint-dropzone',
    );
    return sprintHit.length ? sprintHit : closestCenter(args);
  };

  const openSprintId = location.pathname.match(/\/sprints\/([^/]+)/)?.[1];

  function rootDragEnd(event: DragEndEvent) {
    setDraggingTaskName(null);
    setOverSprintDropzone(false);
    const drop = resolveSprintDrop(event, openSprintId);
    if (drop) {
      const target = sprints.find((s) => s._id === drop.targetSprintId);
      const label = target ? `Sprint ${target.folderNumber ?? target.number}` : 'outra sprint';
      setMovingToSprintId(drop.targetSprintId);
      moveWithUndo.run({
        moveFn: () => tasksApi.bulkMoveTasks(spaceId!, [drop.taskId], { sprintId: drop.targetSprintId }),
        undoFn: () =>
          drop.sourceSprintId
            ? tasksApi.bulkMoveTasks(spaceId!, [drop.taskId], { sprintId: drop.sourceSprintId })
            : Promise.resolve(),
        message: `Tarefa movida para ${label}`,
        onSettled: () => setMovingToSprintId(null),
      });
      return;
    }
    reorderHandlerRef.current?.(event);
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* ── Top bar (full width) ── */}
      <header className="shrink-0 grid grid-cols-3 items-center px-3 py-2 border-b border-line bg-surface">
        {/* Left: sidebar toggle + app logo + space name */}
        <div className="justify-self-start min-w-0 max-w-full flex items-center gap-1">
          <Tooltip content={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'} side="bottom">
            <button
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-lift transition-colors shrink-0"
            >
              {sidebarCollapsed
                ? <PanelLeftOpen size={17} />
                : <PanelLeftClose size={17} />}
            </button>
          </Tooltip>
          <Tooltip content="Ir para início" side="bottom">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-lift transition-colors max-w-full min-w-0"
            >
              <img src="/favicon.svg" alt="Claudio" className="w-7 h-7 shrink-0" />
              <span className="text-sm font-semibold text-ink truncate text-left">
                {space?.name ?? 'Claudio'}
              </span>
            </button>
          </Tooltip>
        </div>

        {/* Center: search trigger */}
        <div className="justify-self-center w-full max-w-md">
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg bg-lift/50 hover:bg-lift border border-line-dim hover:border-line text-ink-muted hover:text-ink-dim transition-all text-sm"
          >
            <Search size={13} className="shrink-0" />
            <span className="flex-1 text-left text-xs">Buscar…</span>
            <kbd className="hidden sm:flex items-center gap-px text-[10px] font-mono opacity-60">⌘K</kbd>
          </button>
        </div>

        {/* Right: notifications */}
        <div className="justify-self-end">
          <NotificationBell />
        </div>
      </header>

      {/* ── Body: sidebar + main ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={(e) => setOverSprintDropzone(isSprintDropzone(e.over))}
        onDragEnd={rootDragEnd}
        onDragCancel={() => { setDraggingTaskName(null); setOverSprintDropzone(false); }}
      >
      <MovingSprintContext.Provider value={movingToSprintId}>
      <TaskDragProvider reorderHandlerRef={reorderHandlerRef}>
      <div className="flex flex-1 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'shrink-0 bg-sidebar flex flex-col overflow-hidden transition-[width] duration-200 ease-in-out',
          sidebarCollapsed ? 'w-0 border-r-0' : 'w-58 border-r border-line',
        )}
      >

        {/* Nav tree (fixed width so content is clipped, not reflowed, while animating) */}
        <nav className="w-58 flex-1 overflow-y-auto px-2 py-2">

          <NavItem to="/home" icon={Home}>Início</NavItem>
          <NavItem to={`/spaces/${spaceId}/members`} icon={Users}>Membros</NavItem>
          <NavItem to={`/spaces/${spaceId}/trash`} icon={Trash2}>Lixeira</NavItem>

          {/* Lists */}
          {lists.length > 0 && (
            <>
              <SectionHeader
                label="Listas"
                open={listsOpen}
                onToggle={() => setListsOpen((v) => !v)}
              />
              {listsOpen && lists.map((list) => (
                <NavItem
                  key={list._id}
                  to={`/spaces/${spaceId}/lists/${list._id}`}
                  icon={List}
                >
                  {list.name}
                </NavItem>
              ))}
            </>
          )}

          {/* Sprints */}
          <SectionHeader
            label="Sprints"
            open={sprintsOpen}
            onToggle={() => setSprintsOpen((v) => !v)}
            onAdd={() => setShowCreateSprint(true)}
          />
          {sprintsOpen && (
            <>
              {/* Overview link */}
              <NavLink
                to={`/spaces/${spaceId}/sprints`}
                end
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-[5px] rounded-lg text-sm transition-colors select-none',
                  sprintsListActive
                    ? 'bg-brand/12 text-brand font-medium'
                    : 'text-ink-dim hover:bg-lift hover:text-ink',
                )}
              >
                <Zap size={14} className="shrink-0 opacity-75" />
                <span>Ver todos</span>
              </NavLink>

              {/* Sprint folders */}
              {sprintFolders.map((folder) => (
                <SprintFolderItem
                  key={folder._id}
                  folder={folder}
                  sprints={sprints.filter((s) => s.folderId === folder._id)}
                  spaceId={spaceId!}
                  onEditSettings={setEditingFolder}
                />
              ))}

              {/* Unfiled sprints (no folder) */}
              {unfiledSprints.map((sprint) => (
                <SprintNavItem key={sprint._id} sprint={sprint} spaceId={spaceId!} />
              ))}

              {/* Empty state actions */}
              {sprints.length === 0 && sprintFolders.length === 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  <button
                    onClick={() => setShowCreateSprint(true)}
                    className="flex items-center gap-2 w-full px-2.5 py-[5px] text-sm text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-lift"
                  >
                    <Plus size={13} /> Novo sprint
                  </button>
                  <button
                    onClick={() => setShowCreateFolder(true)}
                    className="flex items-center gap-2 w-full px-2.5 py-[5px] text-sm text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-lift"
                  >
                    <Folder size={13} /> Nova pasta
                  </button>
                </div>
              )}

              {/* "Nova pasta" button always visible at the bottom when there's content */}
              {(sprints.length > 0 || sprintFolders.length > 0) && (
                <button
                  onClick={() => setShowCreateFolder(true)}
                  className="flex items-center gap-2 w-full px-2.5 py-[5px] mt-0.5 text-xs text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-lift"
                >
                  <Folder size={12} className="opacity-60" /> Nova pasta de sprints
                </button>
              )}
            </>
          )}

          {/* Documentos */}
          <SectionHeader
            label="Documentos"
            open={wikiOpen}
            onToggle={() => setWikiOpen((v) => !v)}
            onAdd={() => { setWikiOpen(true); setCreatingDocFolder(true); }}
          />
          {wikiOpen && (
            <>
              {wikiFolders.map((folder) => (
                <DocFolderItem key={folder._id} folder={folder} spaceId={spaceId!} />
              ))}

              {creatingDocFolder && (
                <div className="flex items-center gap-2.5 px-2.5 py-[5px]">
                  <FolderOpen size={14} className="shrink-0 opacity-75 text-ink-muted" />
                  <input
                    autoFocus
                    value={docFolderName}
                    onChange={(e) => setDocFolderName(e.target.value)}
                    onBlur={submitDocFolder}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitDocFolder();
                      if (e.key === 'Escape') { setCreatingDocFolder(false); setDocFolderName(''); }
                    }}
                    placeholder="Nome da pasta…"
                    className="flex-1 min-w-0 bg-input border border-brand/40 rounded px-1.5 py-0.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none"
                  />
                </div>
              )}

              {wikiFolders.length === 0 && !creatingDocFolder && (
                <button
                  onClick={() => { setWikiOpen(true); setCreatingDocFolder(true); }}
                  className="flex items-center gap-2 w-full px-2.5 py-[5px] text-xs text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-lift"
                >
                  <FolderPlus size={13} /> Nova pasta de documentos
                </button>
              )}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="w-58 px-2 py-2.5 border-t border-line shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-lift transition-colors group">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2.5 flex-1 min-w-0"
            >
              {user && <UserAvatar user={user} size="sm" />}
              <span className="flex-1 text-sm text-ink-dim truncate text-left">{user?.displayName}</span>
            </button>
            <Tooltip content="Sair" side="right">
              <button
                onClick={logout}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-ink-muted hover:text-danger transition-all shrink-0"
              >
                <LogOut size={13} />
              </button>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-hidden flex flex-col bg-base">
        <Outlet />
      </main>
      </div>
      </TaskDragProvider>
      </MovingSprintContext.Provider>

      {/* Floating cue that follows the cursor — only while carrying a task over
          the sidebar sprint list; in-list reordering keeps its native visual. */}
      <DragOverlay dropAnimation={null}>
        {draggingTaskName && overSprintDropzone ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-brand/40 shadow-xl text-sm text-ink max-w-xs cursor-grabbing">
            <GripVertical size={13} className="text-ink-muted shrink-0" />
            <span className="truncate font-medium">{draggingTaskName}</span>
          </div>
        ) : null}
      </DragOverlay>
      </DndContext>

      {/* ── Global search ── */}
      {showSearch && spaceId && (
        <GlobalSearch spaceId={spaceId} onClose={() => setShowSearch(false)} />
      )}

      {/* ── Keyboard shortcuts reference ── */}
      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}

      {/* ── Create sprint folder modal ── */}
      {showCreateFolder && spaceId && (
        <CreateSprintFolderModal spaceId={spaceId} onClose={() => setShowCreateFolder(false)} />
      )}

      {/* ── Edit sprint folder settings modal ── */}
      {editingFolder && spaceId && (
        <CreateSprintFolderModal
          spaceId={spaceId}
          folder={editingFolder}
          onClose={() => setEditingFolder(null)}
        />
      )}

      {/* ── Create sprint modal ── */}
      {showCreateSprint && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowCreateSprint(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-modal border border-line rounded-2xl shadow-2xl w-full max-w-sm p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-ink">Novo Sprint</h3>
              <button onClick={() => setShowCreateSprint(false)} className="p-1 rounded text-ink-muted hover:text-ink hover:bg-lift transition-colors">
                <X size={15} />
              </button>
            </div>
            <form
              onSubmit={(e: FormEvent) => { e.preventDefault(); setSprintError(''); createSprintMutation.mutate(); }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-medium text-ink-dim mb-1.5">Nome</label>
                <input
                  type="text"
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
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
                    value={sprintStart}
                    onChange={(e) => setSprintStart(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink focus:outline-none focus:border-brand transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-dim mb-1.5">Término</label>
                  <input
                    type="date"
                    value={sprintEnd}
                    onChange={(e) => setSprintEnd(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink focus:outline-none focus:border-brand transition-colors"
                  />
                </div>
              </div>
              {sprintError && <p className="text-xs text-danger">{sprintError}</p>}
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateSprint(false)}
                  className="px-3 py-2 text-sm text-ink-dim hover:text-ink transition-colors rounded-lg hover:bg-lift"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createSprintMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hi text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60"
                >
                  {createSprintMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                  {createSprintMutation.isPending ? 'Criando…' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
