import { useEffect, useState, type FormEvent } from 'react';
import { Outlet, useParams, useNavigate, NavLink, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Home, List, Zap, BookOpen, Plus, LogOut, ChevronDown, ChevronRight,
  FolderOpen, X, Loader2, Users,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useSpacesStore } from '../../store/spaces.store';
import * as spacesApi from '../../api/spaces.api';
import * as listsApi from '../../api/lists.api';
import * as sprintsApi from '../../api/sprints.api';
import * as wikiApi from '../../api/wiki.api';
import { cn } from '../../lib/utils';
import { Tooltip } from '../../components/ui/tooltip';

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

export function SpaceLayout() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = useAuthStore((s) => s.user);
  const logout    = useAuthStore((s) => s.logout);
  const { setCurrentSpace } = useSpacesStore();
  const queryClient = useQueryClient();

  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [sprintName,  setSprintName]  = useState('');
  const [sprintStart, setSprintStart] = useState('');
  const [sprintEnd,   setSprintEnd]   = useState('');
  const [sprintError, setSprintError] = useState('');
  const [listsOpen,   setListsOpen]   = useState(true);
  const [sprintsOpen, setSprintsOpen] = useState(true);
  const [wikiOpen,    setWikiOpen]    = useState(false);

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

  useEffect(() => {
    if (space) setCurrentSpace(space);
    return () => setCurrentSpace(null);
  }, [space, setCurrentSpace]);

  const initials = user?.displayName
    ? user.displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  // highlight "Ver todos" as active only when on /sprints exactly
  const sprintsListActive = location.pathname.endsWith('/sprints');

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-58 shrink-0 bg-sidebar border-r border-line flex flex-col overflow-hidden">

        {/* Workspace header */}
        <div className="px-3 py-3 border-b border-line shrink-0">
          <Tooltip content="Ir para início" side="right">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-lift transition-colors group"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
                style={{ background: space?.color ?? '#6366F1' }}
              >
                {space?.name?.charAt(0).toUpperCase() ?? 'C'}
              </div>
              <span className="text-sm font-semibold text-ink truncate flex-1 text-left">
                {space?.name ?? 'Claudio'}
              </span>
              <ChevronDown size={12} className="text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          </Tooltip>
        </div>

        {/* Nav tree */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">

          <NavItem to="/home" icon={Home}>Início</NavItem>
          <NavItem to={`/spaces/${spaceId}/members`} icon={Users}>Membros</NavItem>

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

              {sprints.map((sprint) => (
                <NavLink
                  key={sprint._id}
                  to={`/spaces/${spaceId}/sprints/${sprint._id}`}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-2.5 px-2.5 py-[5px] rounded-lg text-sm transition-colors select-none',
                      isActive
                        ? 'bg-brand/12 text-brand font-medium'
                        : 'text-ink-dim hover:bg-lift hover:text-ink',
                    )
                  }
                >
                  <Zap size={14} className="shrink-0 opacity-75" />
                  <span className="flex-1 truncate min-w-0">
                    Sprint {sprint.number}
                    {sprint.name && (
                      <span className="text-ink-muted font-normal ml-1 text-xs">{sprint.name}</span>
                    )}
                  </span>
                </NavLink>
              ))}

              {sprints.length === 0 && (
                <button
                  onClick={() => setShowCreateSprint(true)}
                  className="flex items-center gap-2 w-full px-2.5 py-[5px] text-sm text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-lift"
                >
                  <Plus size={13} /> Novo sprint
                </button>
              )}
            </>
          )}

          {/* Wiki */}
          {wikiFolders.length > 0 && (
            <>
              <SectionHeader
                label="Wiki"
                open={wikiOpen}
                onToggle={() => setWikiOpen((v) => !v)}
              />
              {wikiOpen && wikiFolders.map((folder) => (
                <NavItem
                  key={folder._id}
                  to={`/spaces/${spaceId}/wiki/folders/${folder._id}`}
                  icon={FolderOpen}
                >
                  {folder.name}
                </NavItem>
              ))}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-2 py-2.5 border-t border-line shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-lift transition-colors group">
            <div className="w-7 h-7 rounded-full bg-brand/20 text-brand text-xs font-bold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <span className="flex-1 text-sm text-ink-dim truncate">{user?.displayName}</span>
            <Tooltip content="Sair" side="right">
              <button
                onClick={logout}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-ink-muted hover:text-danger transition-all"
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
