import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, LogOut, Layers, Loader2, X, Home, ChevronRight, LayoutGrid } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import * as spacesApi from '../../api/spaces.api';
import type { Space } from '../../types/space.types';
import { UserAvatar } from '../../components/ui/UserAvatar';

const PRESET_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#EAB308', '#10B981', '#14B8A6',
  '#3B82F6', '#0EA5E9',
];

export function HomePage() {
  const user        = useAuthStore((s) => s.user);
  const logout      = useAuthStore((s) => s.logout);
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [name,  setName]  = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [formError, setFormError] = useState('');

  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ['spaces'],
    queryFn: spacesApi.getSpaces,
  });

  const createMutation = useMutation({
    mutationFn: () => spacesApi.createSpace({ name, color }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['spaces'] });
      setShowCreate(false);
      setName('');
      setColor(PRESET_COLORS[0]);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string | string[] } } } })
        ?.response?.data?.error?.message;
      const detail = Array.isArray(msg) ? msg[0] : msg;
      setFormError(detail ?? 'Falha ao criar espaço.');
    },
  });

  const firstName = user?.displayName?.split(' ')[0] ?? 'usuário';

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="flex h-screen overflow-hidden bg-base">

      {/* ── Sidebar ── */}
      <aside className="w-58 shrink-0 bg-sidebar border-r border-line flex flex-col overflow-hidden">

        {/* Logo */}
        <div className="px-3 py-3 border-b border-line shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center text-white text-sm font-bold shadow-sm shadow-brand/40">
              C
            </div>
            <span className="text-sm font-semibold text-ink">Claudio</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          <div className="flex items-center gap-2.5 px-2.5 py-[5px] rounded-lg bg-brand/12 text-brand text-sm font-medium select-none">
            <Home size={14} className="shrink-0" />
            <span>Início</span>
          </div>

          {spaces.length > 0 && (
            <>
              <div className="px-2.5 pt-4 pb-1">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
                  Espaços
                </span>
              </div>
              {spaces.map((space: Space) => (
                <button
                  key={space._id}
                  onClick={() => navigate(`/spaces/${space._id}`)}
                  className="group flex items-center gap-2.5 w-full px-2.5 py-[5px] rounded-lg text-sm text-ink-dim hover:bg-lift hover:text-ink transition-colors select-none"
                >
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ background: space.color }}
                  >
                    {space.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 truncate text-left">{space.name}</span>
                  <ChevronRight size={12} className="text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-2 py-2.5 border-t border-line shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-lift transition-colors group">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2.5 flex-1 min-w-0"
            >
              {user && <UserAvatar user={user} size="sm" />}
              <span className="flex-1 text-sm text-ink-dim truncate text-left">{user?.displayName}</span>
            </button>
            <button
              onClick={logout}
              title="Sair"
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-ink-muted hover:text-danger transition-all shrink-0"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="h-12 border-b border-line px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <LayoutGrid size={13} />
            <span>Seus espaços</span>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand-hi text-white text-xs font-semibold rounded-lg transition-all shadow-sm shadow-brand/20"
          >
            <Plus size={13} /> Novo espaço
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto px-8 py-8">

          {/* Greeting */}
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-1">
              {greeting}
            </p>
            <h1 className="text-2xl font-bold text-ink">{firstName} 👋</h1>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-24 text-ink-muted gap-2">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Carregando…</span>
            </div>
          )}

          {/* Grid */}
          {!isLoading && spaces.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {spaces.map((space: Space) => (
                <button
                  key={space._id}
                  onClick={() => navigate(`/spaces/${space._id}`)}
                  className="group text-left bg-surface border border-line rounded-xl overflow-hidden hover:border-white/10 transition-all hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5"
                >
                  {/* Card header with color gradient */}
                  <div
                    className="h-20 relative flex items-end p-4"
                    style={{
                      background: `linear-gradient(135deg, ${space.color}33 0%, ${space.color}11 100%)`,
                      borderBottom: `1px solid ${space.color}22`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg"
                      style={{
                        background: space.color,
                        boxShadow: `0 4px 14px ${space.color}55`,
                      }}
                    >
                      {space.name.charAt(0).toUpperCase()}
                    </div>
                    <div
                      className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      style={{ background: space.color + '33' }}
                    >
                      <ChevronRight size={12} style={{ color: space.color }} />
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    <p className="text-sm font-semibold text-ink mb-1 truncate">
                      {space.name}
                    </p>
                    <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">
                      {space.description || 'Clique para abrir o espaço'}
                    </p>
                  </div>
                </button>
              ))}

              {/* Create new space card */}
              <button
                onClick={() => setShowCreate(true)}
                className="text-left bg-surface border border-dashed border-line rounded-xl overflow-hidden hover:border-brand/40 hover:bg-lift/30 transition-all group h-[136px] flex flex-col items-center justify-center gap-2"
              >
                <div className="w-10 h-10 rounded-xl border border-dashed border-line group-hover:border-brand/40 flex items-center justify-center text-ink-muted group-hover:text-brand transition-colors">
                  <Plus size={18} />
                </div>
                <span className="text-xs text-ink-muted group-hover:text-ink transition-colors font-medium">
                  Novo espaço
                </span>
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && spaces.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface border border-line flex items-center justify-center mb-6 shadow-inner">
                <Layers size={24} className="text-ink-muted" />
              </div>
              <p className="text-base font-semibold text-ink mb-2">Nenhum espaço ainda</p>
              <p className="text-sm text-ink-dim mb-7 max-w-xs leading-relaxed">
                Crie seu primeiro espaço para organizar projetos, tarefas e sprints.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-hi text-white text-sm font-semibold rounded-lg transition-all shadow-sm shadow-brand/20"
              >
                <Plus size={15} /> Criar primeiro espaço
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ── Create modal ── */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowCreate(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-modal border border-line rounded-2xl shadow-2xl w-full max-w-sm p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-ink">Novo espaço</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 rounded text-ink-muted hover:text-ink hover:bg-lift transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Color preview */}
            <div
              className="h-16 rounded-xl mb-5 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${color}44 0%, ${color}11 100%)` }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg"
                style={{ background: color, boxShadow: `0 4px 14px ${color}55` }}
              >
                {name.charAt(0).toUpperCase() || 'A'}
              </div>
            </div>

            <form
              onSubmit={(e: FormEvent) => { e.preventDefault(); setFormError(''); createMutation.mutate(); }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-ink-dim mb-1.5">Nome do espaço</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  placeholder="Ex: Produto, Marketing, Dev…"
                  className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-dim mb-2">Cor</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-6 h-6 rounded-full transition-all"
                      style={{
                        background: c,
                        outline: color === c ? `2px solid ${c}` : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>

              {formError && <p className="text-xs text-danger">{formError}</p>}

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-3 py-2 text-sm text-ink-dim hover:text-ink transition-colors rounded-lg hover:bg-lift"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !name.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hi text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60"
                >
                  {createMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                  {createMutation.isPending ? 'Criando…' : 'Criar espaço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
