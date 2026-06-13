import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, LayoutList, Zap } from 'lucide-react';
import * as listsApi from '../../api/lists.api';
import * as sprintsApi from '../../api/sprints.api';
import * as sprintFoldersApi from '../../api/sprint-folders.api';
import type { Sprint } from '../../api/sprints.api';
import { sprintDisplayStatus } from '../../lib/sprintStatus';

export interface Destination {
  listId?: string;
  sprintId?: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function SprintOption({
  sprint,
  selected,
  onSelect,
}: {
  sprint: Sprint;
  selected: boolean;
  onSelect: () => void;
}) {
  const { Icon, color, label } = sprintDisplayStatus(sprint);
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
        selected ? 'bg-brand/15 text-brand' : 'text-ink hover:bg-lift'
      }`}
    >
      <span title={label} className="shrink-0 flex">
        <Icon size={13} className={color} />
      </span>
      <span className="truncate">{sprint.name}</span>
      <span className="ml-auto shrink-0 text-xs text-ink-muted">
        {fmtDate(sprint.startDate)} - {fmtDate(sprint.endDate)}
      </span>
    </button>
  );
}

interface Props {
  spaceId: string;
  title: string;
  onConfirm: (dest: Destination) => void;
  onClose: () => void;
  /** Show a task picker for choosing a parent task instead of sprint/list */
  taskPickerLabel?: string;
  onPickTask?: (taskId: string) => void;
  tasks?: { _id: string; name: string }[];
}

export function DestinationPickerModal({ spaceId, title, onConfirm, onClose }: Props) {
  const [tab, setTab] = useState<'sprint' | 'list'>('sprint');
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const { data: sprints = [] } = useQuery({
    queryKey: ['sprints', spaceId],
    queryFn: () => sprintsApi.getSprints(spaceId),
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['sprint-folders', spaceId],
    queryFn: () => sprintFoldersApi.getSprintFolders(spaceId),
  });

  const { data: lists = [] } = useQuery({
    queryKey: ['lists', spaceId],
    queryFn: () => listsApi.getLists(spaceId),
  });

  const unfiledSprints = sprints.filter((s) => !s.folderId);

  const canConfirm =
    (tab === 'sprint' && !!selectedSprintId) ||
    (tab === 'list' && !!selectedListId);

  const handleConfirm = () => {
    if (tab === 'sprint' && selectedSprintId) {
      onConfirm({ sprintId: selectedSprintId });
    } else if (tab === 'list' && selectedListId) {
      onConfirm({ listId: selectedListId });
    }
  };

  return (
    <div
      data-testid="destination-picker-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-line rounded-xl shadow-2xl w-[400px] max-h-[520px] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="p-1 text-ink-muted hover:text-ink transition-colors rounded">
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-line-dim shrink-0">
          {(['sprint', 'list'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'border-brand text-brand'
                  : 'border-transparent text-ink-muted hover:text-ink-dim'
              }`}
            >
              {t === 'sprint' ? <Zap size={12} /> : <LayoutList size={12} />}
              {t === 'sprint' ? 'Sprint' : 'Lista'}
            </button>
          ))}
        </div>

        {/* Options */}
        <div className="flex-1 overflow-auto p-2">
          {tab === 'sprint' ? (
            sprints.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-8">Nenhuma sprint disponível</p>
            ) : (
              <>
                {folders.map((folder) => {
                  const folderSprints = sprints.filter((s) => s.folderId === folder._id);
                  if (folderSprints.length === 0) return null;
                  return (
                    <div key={folder._id} className="mb-2">
                      <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                        {folder.name}
                      </p>
                      {folderSprints.map((s) => (
                        <SprintOption
                          key={s._id}
                          sprint={s}
                          selected={selectedSprintId === s._id}
                          onSelect={() => setSelectedSprintId(s._id)}
                        />
                      ))}
                    </div>
                  );
                })}
                {unfiledSprints.length > 0 && (
                  <div className="mb-2">
                    <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      Sprints avulsos
                    </p>
                    {unfiledSprints.map((s) => (
                      <SprintOption
                        key={s._id}
                        sprint={s}
                        selected={selectedSprintId === s._id}
                        onSelect={() => setSelectedSprintId(s._id)}
                      />
                    ))}
                  </div>
                )}
              </>
            )
          ) : (
            lists.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-8">Nenhuma lista disponível</p>
            ) : (
              lists.map((l) => (
                <button
                  key={l._id}
                  onClick={() => setSelectedListId(l._id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    selectedListId === l._id
                      ? 'bg-brand/15 text-brand'
                      : 'text-ink hover:bg-lift'
                  }`}
                >
                  <LayoutList size={13} className="shrink-0 text-ink-muted" />
                  <span className="truncate">{l.name}</span>
                </button>
              ))
            )
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
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="px-4 py-1.5 bg-brand hover:bg-brand-hi text-white text-xs font-medium rounded-lg disabled:opacity-40 transition-all"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
