import { useState } from 'react';
import type { FilterState } from '../../hooks/useTaskFilter';
import { type TaskStatus, type TaskPriority, STATUS_LABELS, PRIORITY_LABELS } from '../../types/task.types';

interface SpaceMember {
  _id: string;
  displayName: string;
}

interface TagOption {
  _id: string;
  name: string;
  color: string;
}

interface Props {
  filters: FilterState;
  members?: SpaceMember[];
  tags?: TagOption[];
  onToggleStatus: (s: TaskStatus) => void;
  onTogglePriority: (p: TaskPriority) => void;
  onToggleAssignee: (id: string) => void;
  onToggleTag: (id: string) => void;
  onSetGroupBy: (g: FilterState['groupBy']) => void;
  onSetSearch: (q: string) => void;
  onToggleSubtasks: () => void;
  onReset: () => void;
  isActive: boolean;
}

const STATUSES = Object.keys(STATUS_LABELS) as TaskStatus[];
const PRIORITIES = Object.keys(PRIORITY_LABELS) as TaskPriority[];

const GROUP_OPTIONS: { value: FilterState['groupBy']; label: string }[] = [
  { value: undefined, label: 'No grouping' },
  { value: 'status', label: 'By status' },
  { value: 'priority', label: 'By priority' },
  { value: 'assignee', label: 'By assignee' },
  { value: 'sprint', label: 'By sprint' },
];

export function FilterBar({
  filters,
  members = [],
  tags = [],
  onToggleStatus,
  onTogglePriority,
  onToggleAssignee,
  onToggleTag,
  onSetGroupBy,
  onSetSearch,
  onToggleSubtasks,
  onReset,
  isActive,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      {/* Search */}
      <input
        type="text"
        value={filters.q}
        onChange={(e) => onSetSearch(e.target.value)}
        placeholder="Search tasks..."
        style={{
          padding: '0.35rem 0.6rem',
          border: '1px solid #E8E8E8',
          borderRadius: '4px',
          fontSize: '0.8rem',
          width: '180px',
          outline: 'none',
        }}
      />

      {/* Filter toggle */}
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          padding: '0.35rem 0.65rem',
          background: open || isActive ? '#4A90E2' : '#F0F0F0',
          color: open || isActive ? '#fff' : '#555',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
        }}
      >
        ⚙ Filters{isActive ? ' ●' : ''}
      </button>

      {/* Group by */}
      <select
        value={filters.groupBy ?? ''}
        onChange={(e) => onSetGroupBy((e.target.value || undefined) as FilterState['groupBy'])}
        style={{ padding: '0.35rem 0.5rem', border: '1px solid #E8E8E8', borderRadius: '4px', fontSize: '0.8rem', color: '#555' }}
      >
        {GROUP_OPTIONS.map((opt) => (
          <option key={String(opt.value)} value={opt.value ?? ''}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Subtasks toggle */}
      <label style={{ fontSize: '0.8rem', color: '#555', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
        <input type="checkbox" checked={filters.includeSubtasks} onChange={onToggleSubtasks} />
        Subtasks
      </label>

      {isActive && (
        <button
          onClick={onReset}
          style={{ padding: '0.35rem 0.65rem', background: 'none', border: '1px solid #E8E8E8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', color: '#FF4D4F' }}
        >
          Clear
        </button>
      )}

      {/* Filter popover */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 100,
            background: '#fff',
            border: '1px solid #E8E8E8',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            padding: '1rem',
            minWidth: '280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Status */}
          <div>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Status</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => onToggleStatus(s)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    border: '1px solid #E8E8E8',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    background: filters.status.includes(s) ? '#4A90E2' : '#F8F8F8',
                    color: filters.status.includes(s) ? '#fff' : '#333',
                    fontWeight: filters.status.includes(s) ? 600 : 400,
                  }}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Priority</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => onTogglePriority(p)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    border: '1px solid #E8E8E8',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    background: filters.priority.includes(p) ? '#4A90E2' : '#F8F8F8',
                    color: filters.priority.includes(p) ? '#fff' : '#333',
                    fontWeight: filters.priority.includes(p) ? 600 : 400,
                  }}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Members */}
          {members.length > 0 && (
            <div>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Assignee</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {members.map((m) => (
                  <button
                    key={m._id}
                    onClick={() => onToggleAssignee(m._id)}
                    style={{
                      padding: '0.25rem 0.6rem',
                      border: '1px solid #E8E8E8',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      background: filters.assignees.includes(m._id) ? '#4A90E2' : '#F8F8F8',
                      color: filters.assignees.includes(m._id) ? '#fff' : '#333',
                    }}
                  >
                    {m.displayName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Tags</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {tags.map((tag) => (
                  <button
                    key={tag._id}
                    onClick={() => onToggleTag(tag._id)}
                    style={{
                      padding: '0.25rem 0.6rem',
                      border: `1px solid ${tag.color}44`,
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      background: filters.tags.includes(tag._id) ? tag.color : tag.color + '22',
                      color: filters.tags.includes(tag._id) ? '#fff' : tag.color,
                      fontWeight: 600,
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setOpen(false)}
            style={{ alignSelf: 'flex-end', padding: '0.3rem 0.75rem', border: '1px solid #E8E8E8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', background: 'none', color: '#555' }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
