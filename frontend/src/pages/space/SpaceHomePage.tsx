import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Zap, Calendar, ArrowRight, CheckCircle2, Clock, CircleDot,
  Loader2, Folder, ChevronDown, ChevronRight,
} from 'lucide-react';
import * as sprintsApi from '../../api/sprints.api';
import * as sprintFoldersApi from '../../api/sprint-folders.api';
import type { DayOfWeek } from '../../api/sprint-folders.api';
import { type Sprint } from '../../api/sprints.api';
import { sprintStatusKey } from '../../lib/sprintStatus';
import { cn } from '../../lib/utils';

/* ── helpers ── */
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
function SprintCard({ sprint, spaceId }: { sprint: Sprint; spaceId: string }) {
  const navigate = useNavigate();
  const status   = sprintStatusKey(sprint);
  const meta     = STATUS_META[status];
  const StatusIcon = meta.icon;
  const days     = durationDays(sprint.startDate, sprint.endDate);
  const label    = sprint.folderId
    ? `Sprint ${sprint.folderNumber ?? sprint.number}`
    : `Sprint ${sprint.number}${sprint.name ? ` · ${sprint.name}` : ''}`;

  return (
    <button
      onClick={() => navigate(`/spaces/${spaceId}/sprints/${sprint._id}`)}
      className="group flex flex-col gap-3 p-4 bg-surface border border-line rounded-xl hover:border-brand/30 hover:bg-lift/40 transition-all text-left w-full"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', meta.bg)}>
            <Zap size={14} className={meta.color} />
          </div>
          <p className="text-sm font-semibold text-ink truncate">{label}</p>
        </div>
        <ArrowRight size={13} className="text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
      </div>

      <span className={cn('self-start flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', meta.color, meta.bg)}>
        <StatusIcon size={10} />
        {meta.label}
      </span>

      <div className="flex items-center gap-1.5 text-xs text-ink-muted">
        <Calendar size={10} className="shrink-0" />
        <span>{fmtDate(sprint.startDate)} → {fmtDate(sprint.endDate)}</span>
        <span className="text-ink-muted/40">·</span>
        <span>{days}d</span>
      </div>
    </button>
  );
}

/* ── Folder section ── */
function FolderSection({
  folder,
  sprints,
  spaceId,
}: {
  folder: sprintFoldersApi.SprintFolder;
  sprints: Sprint[];
  spaceId: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-8">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 mb-3 w-full text-left group"
      >
        {open
          ? <ChevronDown size={14} className="text-ink-muted" />
          : <ChevronRight size={14} className="text-ink-muted" />}
        <Folder size={14} className="text-brand/70 shrink-0" />
        <span className="text-sm font-semibold text-ink">{folder.name}</span>
        <div className="flex items-center gap-1.5 text-xs text-ink-muted ml-2">
          <span className="px-1.5 py-0.5 bg-lift rounded-full">{sprints.length} sprint{sprints.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{DAY_LABELS[folder.startDayOfWeek as DayOfWeek]}</span>
          <span>·</span>
          <span>{folder.durationWeeks}sem</span>
          {folder.autoComplete && <span className="text-s-done">· Auto-fecha</span>}
        </div>
      </button>

      {open && (
        sprints.length > 0
          ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {sprints.map((s) => <SprintCard key={s._id} sprint={s} spaceId={spaceId} />)}
            </div>
          )
          : <p className="text-sm text-ink-muted pl-6 py-2">Nenhum sprint nesta pasta ainda.</p>
      )}
    </div>
  );
}

/* ── Main ── */
export function SpaceHomePage() {
  const { spaceId } = useParams<{ spaceId: string }>();

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

  const isLoading = loadingSprints || loadingFolders;
  const unfiledSprints = sprints.filter((s) => !s.folderId);
  const isEmpty = !isLoading && folders.length === 0 && sprints.length === 0;

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <header className="bg-surface border-b border-line shrink-0 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand/12 border border-brand/20 flex items-center justify-center">
            <Zap size={15} className="text-brand" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-ink">Sprints</h1>
            <p className="text-xs text-ink-muted mt-0.5">
              {isLoading
                ? 'Carregando…'
                : isEmpty
                  ? 'Nenhum sprint'
                  : `${sprints.length} sprint${sprints.length !== 1 ? 's' : ''}${folders.length > 0 ? ` · ${folders.length} pasta${folders.length !== 1 ? 's' : ''}` : ''}`}
            </p>
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

        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-14 h-14 rounded-2xl bg-lift border border-line flex items-center justify-center mb-5">
              <Zap size={22} className="text-ink-muted" />
            </div>
            <p className="text-base font-semibold text-ink-dim">Nenhum sprint criado ainda</p>
            <p className="text-sm text-ink-muted mt-1.5 max-w-xs">
              Use a barra lateral para criar sprints ou pastas de sprints.
            </p>
          </div>
        )}

        {/* Folder sections */}
        {!isLoading && folders.map((folder) => (
          <FolderSection
            key={folder._id}
            folder={folder}
            sprints={sprints.filter((s) => s.folderId === folder._id)}
            spaceId={spaceId!}
          />
        ))}

        {/* Unfiled sprints */}
        {!isLoading && unfiledSprints.length > 0 && (
          <div>
            {folders.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-ink-muted" />
                <span className="text-sm font-semibold text-ink-dim">Sprints avulsos</span>
                <span className="text-xs text-ink-muted bg-lift px-1.5 py-0.5 rounded-full">{unfiledSprints.length}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {unfiledSprints.map((s) => (
                <SprintCard key={s._id} sprint={s} spaceId={spaceId!} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
