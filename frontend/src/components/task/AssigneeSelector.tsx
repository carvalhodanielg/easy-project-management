import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Check, X } from 'lucide-react';
import * as spacesApi from '../../api/spaces.api';
import type { User } from '../../types/user.types';
import type { SpaceMember } from '../../types/space.types';
import { Tooltip } from '../ui/tooltip';

interface Props {
  assignees: User[];
  spaceId: string;
  onChange: (ids: string[]) => void;
}

function memberUser(m: SpaceMember): User | null {
  return typeof m.userId === 'object' ? m.userId : null;
}

export function AssigneeSelector({ assignees, spaceId, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: members = [] } = useQuery({
    queryKey: ['space-members', spaceId],
    queryFn: () => spacesApi.getSpaceMembers(spaceId),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const assigneeIds = new Set(assignees.map((u) => u._id));

  const toggle = (user: User) => {
    if (assigneeIds.has(user._id))
      onChange(assignees.filter((u) => u._id !== user._id).map((u) => u._id));
    else
      onChange([...assignees.map((u) => u._id), user._id]);
  };

  return (
    <div ref={ref} className="relative flex items-center gap-2 flex-wrap">
      {assignees.map((user) => (
        <Tooltip key={user._id} content={user.displayName}>
          <span className="inline-flex items-center gap-1.5 bg-lift border border-line rounded-full pl-0.5 pr-2 py-0.5 text-xs text-ink">
            <span className="w-5 h-5 rounded-full bg-brand/30 text-brand text-[9px] font-bold flex items-center justify-center shrink-0">
              {user.displayName.charAt(0).toUpperCase()}
            </span>
            <span>{user.displayName}</span>
            <button
              aria-label="Remover"
              onClick={() => onChange(assignees.filter((u) => u._id !== user._id).map((u) => u._id))}
              className="text-ink-muted hover:text-ink ml-0.5 transition-colors"
            >
              <X size={10} />
            </button>
          </span>
        </Tooltip>
      ))}

      <button
        aria-label="Adicionar responsável"
        onClick={() => setOpen((o) => !o)}
        className="w-7 h-7 rounded-full border border-dashed border-line flex items-center justify-center text-ink-muted hover:text-ink hover:border-brand/60 transition-colors"
      >
        <Plus size={13} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-modal border border-line rounded-xl shadow-2xl min-w-48 py-1.5 max-h-56 overflow-y-auto">
          {members.map((m) => {
            const user = memberUser(m);
            if (!user) return null;
            const assigned = assigneeIds.has(user._id);
            return (
              <button
                key={m._id}
                aria-label={user.displayName}
                onClick={() => toggle(user)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm text-ink hover:bg-lift transition-colors"
              >
                <span
                  className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                  style={{ background: assigned ? '#6366F1' : '#3A3A4A' }}
                >
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1">{user.displayName}</span>
                {assigned && <Check size={13} className="text-brand shrink-0" />}
              </button>
            );
          })}
          {members.length === 0 && (
            <p className="px-3 py-2 text-xs text-ink-muted">Carregando…</p>
          )}
        </div>
      )}
    </div>
  );
}
