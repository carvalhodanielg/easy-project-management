import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, X, Shield, Eye, Trash2, Search, Check, Loader2, ChevronDown,
} from 'lucide-react';
import * as spacesApi from '../../api/spaces.api';
import * as usersApi from '../../api/users.api';
import { useAuthStore } from '../../store/auth.store';
import { useSpacesStore } from '../../store/spaces.store';
import type { SpaceRole } from '../../types/space.types';
import type { User } from '../../types/user.types';
import { cn } from '../../lib/utils';
import { UserAvatar } from '../../components/ui/UserAvatar';

/* ── helpers ── */
const ROLE_META: Record<SpaceRole, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  editor: { label: 'Editor',       icon: Shield, color: 'text-brand',   bg: 'bg-brand/10' },
  viewer: { label: 'Visualizador', icon: Eye,    color: 'text-ink-dim', bg: 'bg-lift' },
};

function memberUser(m: spacesApi.SpaceMember): User | null {
  return typeof m.userId === 'object' ? m.userId : null;
}

/* ── Add member panel ── */
function AddMemberPanel({ spaceId, existingIds, onClose }: {
  spaceId: string;
  existingIds: Set<string>;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [query,  setQuery]  = useState('');
  const [role,   setRole]   = useState<SpaceRole>('editor');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await usersApi.searchUsers(query);
        setResults(data.filter((u) => !existingIds.has(u._id)));
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query, existingIds]);

  const addMutation = useMutation({
    mutationFn: () => spacesApi.addSpaceMember(spaceId, selected!._id, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['space-members', spaceId] });
      onClose();
    },
  });

  return (
    <div className="bg-lift border border-line rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Adicionar membro</p>
        <button onClick={onClose} className="p-1 text-ink-muted hover:text-ink transition-colors rounded">
          <X size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
          placeholder="Buscar por email ou nome…"
          autoFocus
          className="w-full pl-8 pr-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-colors"
        />
        {searching && (
          <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted animate-spin" />
        )}
      </div>

      {/* Search results */}
      {results.length > 0 && !selected && (
        <div className="border border-line rounded-lg overflow-hidden divide-y divide-line-dim">
          {results.map((user) => (
            <button
              key={user._id}
              onClick={() => { setSelected(user); setQuery(user.displayName); setResults([]); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-lift/80 transition-colors text-left"
            >
              <UserAvatar user={user} size="xs" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{user.displayName}</p>
                <p className="text-xs text-ink-muted truncate">{user.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {query.trim() && results.length === 0 && !searching && !selected && (
        <p className="text-xs text-ink-muted px-1">Nenhum usuário encontrado.</p>
      )}

      {/* Selected user preview */}
      {selected && (
        <div className="flex items-center gap-3 px-3 py-2.5 bg-brand/8 border border-brand/20 rounded-lg">
          <UserAvatar user={selected} size="xs" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink">{selected.displayName}</p>
            <p className="text-xs text-ink-muted">{selected.email}</p>
          </div>
          <Check size={14} className="text-brand shrink-0" />
        </div>
      )}

      {/* Role select + submit */}
      <div className="flex items-center gap-2 pt-1">
        <div className="relative flex-1">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as SpaceRole)}
            className="appearance-none w-full pl-3 pr-7 py-2 bg-input border border-line rounded-lg text-sm text-ink focus:outline-none focus:border-brand transition-colors cursor-pointer"
          >
            <option value="editor">Editor — pode editar e gerenciar</option>
            <option value="viewer">Visualizador — somente leitura</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
        </div>
        <button
          onClick={() => addMutation.mutate()}
          disabled={!selected || addMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-hi text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
        >
          {addMutation.isPending && <Loader2 size={13} className="animate-spin" />}
          Adicionar
        </button>
      </div>

      {addMutation.isError && (
        <p className="text-xs text-danger">Falha ao adicionar membro.</p>
      )}
    </div>
  );
}

/* ── Member row ── */
function MemberRow({ member, spaceId, isCurrentUser, canManage }: {
  member: spacesApi.SpaceMember;
  spaceId: string;
  isCurrentUser: boolean;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const user = memberUser(member);
  if (!user) return null;

  const meta = ROLE_META[member.role];
  const RoleIcon = meta.icon;

  const updateMutation = useMutation({
    mutationFn: (role: SpaceRole) => spacesApi.updateMemberRole(spaceId, user._id, role),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['space-members', spaceId] }),
  });

  const removeMutation = useMutation({
    mutationFn: () => spacesApi.removeMember(spaceId, user._id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['space-members', spaceId] }),
  });

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-line-dim last:border-0 hover:bg-lift/30 transition-colors">
      {/* Avatar + info */}
      <UserAvatar user={user} size="lg" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-ink truncate">{user.displayName}</p>
          {isCurrentUser && (
            <span className="text-[10px] font-semibold text-ink-muted bg-lift px-1.5 py-0.5 rounded">
              Você
            </span>
          )}
        </div>
        <p className="text-xs text-ink-muted truncate">{user.email}</p>
      </div>

      {/* Role */}
      {canManage && !isCurrentUser ? (
        <div className="relative">
          <select
            value={member.role}
            onChange={(e) => updateMutation.mutate(e.target.value as SpaceRole)}
            disabled={updateMutation.isPending}
            className={cn(
              'appearance-none pl-7 pr-6 py-1.5 rounded-full text-xs font-semibold cursor-pointer focus:outline-none border transition-colors disabled:opacity-60',
              meta.color, meta.bg, 'border-transparent',
            )}
          >
            <option value="editor">Editor</option>
            <option value="viewer">Visualizador</option>
          </select>
          <RoleIcon size={11} className={cn('absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none', meta.color)} />
          <ChevronDown size={10} className={cn('absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none', meta.color)} />
        </div>
      ) : (
        <span className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', meta.color, meta.bg)}>
          <RoleIcon size={11} />
          {meta.label}
        </span>
      )}

      {/* Remove */}
      {canManage && !isCurrentUser && (
        confirmRemove ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
              className="px-2.5 py-1 bg-danger/15 border border-danger/30 text-danger text-xs font-medium rounded-lg hover:bg-danger/25 transition-colors disabled:opacity-60"
            >
              {removeMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : 'Confirmar'}
            </button>
            <button
              onClick={() => setConfirmRemove(false)}
              className="p-1 text-ink-muted hover:text-ink transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            aria-label="Remover"
            onClick={() => setConfirmRemove(true)}
            className="p-1.5 rounded text-ink-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={14} />
          </button>
        )
      )}
    </div>
  );
}

/* ── Main page ── */
export function MembersPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const currentUser  = useAuthStore((s) => s.user);
  const currentSpace = useSpacesStore((s) => s.currentSpace);
  const [showAdd, setShowAdd] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['space-members', spaceId],
    queryFn: () => spacesApi.getSpaceMembers(spaceId!),
    enabled: !!spaceId,
  });

  const currentMember = members.find((m) => {
    const u = memberUser(m);
    return u?._id === currentUser?._id;
  });
  const canManage = currentMember?.role === 'editor';
  const existingIds = new Set(members.map((m) => memberUser(m)?._id ?? '').filter(Boolean));

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <header className="bg-surface border-b border-line shrink-0 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-lift border border-line flex items-center justify-center">
              <Users size={15} className="text-ink-dim" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-ink">Membros</h1>
              <p className="text-xs text-ink-muted mt-0.5">
                {currentSpace?.name} · {members.length} membro{members.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-hi text-white text-sm font-medium rounded-lg transition-all"
            >
              <Plus size={13} /> Adicionar membro
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">

          {/* Add member panel */}
          {showAdd && canManage && (
            <AddMemberPanel
              spaceId={spaceId!}
              existingIds={existingIds}
              onClose={() => setShowAdd(false)}
            />
          )}

          {/* Members list */}
          {isLoading ? (
            <div className="flex items-center gap-2 text-ink-muted text-sm py-10">
              <Loader2 size={15} className="animate-spin" /> Carregando membros…
            </div>
          ) : (
            <div className="bg-surface border border-line rounded-xl overflow-hidden">
              {/* Role legend */}
              <div className="px-5 py-3 border-b border-line-dim flex items-center gap-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted flex-1">
                  {members.length} membro{members.length !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <Shield size={11} className="text-brand" /> Editor — edita e gerencia
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <Eye size={11} /> Visualizador — só leitura
                  </span>
                </div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-line-dim">
                {members.map((member) => {
                  const u = memberUser(member);
                  return (
                    <div key={member._id} className="group">
                      <MemberRow
                        member={member}
                        spaceId={spaceId!}
                        isCurrentUser={u?._id === currentUser?._id}
                        canManage={canManage}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info box */}
          <div className="bg-brand/5 border border-brand/15 rounded-xl px-4 py-3.5">
            <p className="text-xs font-semibold text-brand mb-1">Sobre as permissões</p>
            <ul className="space-y-1 text-xs text-ink-dim">
              <li><span className="font-medium text-ink">Editor</span> — pode criar, editar e excluir tarefas, sprints e listas; gerenciar membros do espaço.</li>
              <li><span className="font-medium text-ink">Visualizador</span> — acesso somente leitura a todas as informações do espaço.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
