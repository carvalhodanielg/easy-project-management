import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as spacesApi from '../../api/spaces.api';
import type { User } from '../../types/user.types';
import type { SpaceMember } from '../../types/space.types';

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
    if (assigneeIds.has(user._id)) {
      onChange(assignees.filter((u) => u._id !== user._id).map((u) => u._id));
    } else {
      onChange([...assignees.map((u) => u._id), user._id]);
    }
  };

  const remove = (userId: string) => {
    onChange(assignees.filter((u) => u._id !== userId).map((u) => u._id));
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
      {assignees.map((user) => (
        <span
          key={user._id}
          title={user.displayName}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: '#EBF3FD',
            borderRadius: '20px',
            padding: '2px 8px 2px 4px',
            fontSize: '0.75rem',
          }}
        >
          <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#4A90E2', color: '#fff', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
            {user.displayName.charAt(0).toUpperCase()}
          </span>
          {user.displayName}
          <button
            aria-label="×"
            onClick={() => remove(user._id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '0.8rem', padding: 0, lineHeight: 1 }}
          >
            ×
          </button>
        </span>
      ))}

      <button
        aria-label="+"
        onClick={() => setOpen((o) => !o)}
        style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px dashed #AAA', background: 'none', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', flexShrink: 0 }}
      >
        +
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: '#fff', border: '1px solid #E8E8E8', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '180px', padding: '4px 0' }}>
          {members.map((m) => {
            const user = memberUser(m);
            if (!user) return null;
            const assigned = assigneeIds.has(user._id);
            return (
              <button
                key={m._id}
                aria-label={user.displayName}
                onClick={() => toggle(user)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.4rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left', color: '#333' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F5F5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: assigned ? '#4A90E2' : '#DDD', color: '#fff', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
                {user.displayName}
                {assigned && <span style={{ marginLeft: 'auto', color: '#4A90E2', fontSize: '0.8rem' }}>✓</span>}
              </button>
            );
          })}
          {members.length === 0 && (
            <p style={{ margin: 0, padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: '#AAA' }}>Carregando...</p>
          )}
        </div>
      )}
    </div>
  );
}
