import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MDEditor from '@uiw/react-md-editor';
import * as tasksApi from '../../api/tasks.api';
import { CommentThread } from '../../components/task/CommentThread';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { TaskRow } from '../../components/task/TaskRow';
import { AssigneeSelector } from '../../components/task/AssigneeSelector';
import {
  type TaskStatus,
  type TaskPriority,
  FIBONACCI_POINTS,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from '../../types/task.types';

export function TaskDetailPage() {
  const { spaceId, taskId } = useParams<{ spaceId: string; taskId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingDesc, setEditingDesc] = useState(false);
  const [description, setDescription] = useState('');

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.getTask(spaceId!, taskId!),
    enabled: !!spaceId && !!taskId,
  });

  const { data: subtasks = [] } = useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: () => tasksApi.getSubtasks(spaceId!, taskId!),
    enabled: !!spaceId && !!taskId,
  });

  useEffect(() => {
    if (task) setDescription(task.description);
  }, [task]);

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof tasksApi.updateTask>[2]) =>
      tasksApi.updateTask(spaceId!, taskId!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
    },
  });

  const saveDescription = () => {
    updateMutation.mutate({ description });
    setEditingDesc(false);
  };

  if (isLoading || !task) {
    return (
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => navigate(-1)}
      >
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}
      onClick={() => navigate(-1)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '680px',
          maxWidth: '100vw',
          height: '100%',
          background: '#fff',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 16px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E8E8E8', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', flex: 1 }}>{task.name}</h2>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#888', marginLeft: '1rem' }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Properties */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Status */}
            <div>
              <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '0.25rem' }}>Status</label>
              <select
                value={task.status}
                onChange={(e) => updateMutation.mutate({ status: e.target.value as TaskStatus })}
                style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #E8E8E8', fontSize: '0.875rem' }}
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '0.25rem' }}>Priority</label>
              <select
                value={task.priority}
                onChange={(e) => updateMutation.mutate({ priority: e.target.value as TaskPriority })}
                style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #E8E8E8', fontSize: '0.875rem' }}
              >
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {/* Story Points */}
            <div>
              <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '0.25rem' }}>Story Points</label>
              <select
                value={task.storyPoints ?? ''}
                onChange={(e) => updateMutation.mutate({ storyPoints: e.target.value ? Number(e.target.value) : null })}
                style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #E8E8E8', fontSize: '0.875rem' }}
              >
                <option value="">—</option>
                {FIBONACCI_POINTS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '0.25rem' }}>Due Date</label>
              <input
                type="date"
                value={task.dueDate ? task.dueDate.substring(0, 10) : ''}
                onChange={(e) => updateMutation.mutate({ dueDate: e.target.value || null })}
                style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #E8E8E8', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '0.5rem' }}>Responsáveis</label>
            <AssigneeSelector
              spaceId={spaceId!}
              assignees={task.assignees}
              onChange={(ids) => updateMutation.mutate({ assignees: ids })}
            />
          </div>

          {/* Tags */}
          {task.tags.length > 0 && (
            <div>
              <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '0.5rem' }}>Tags</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {task.tags.map((tag) => (
                  <span key={tag._id} style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}44` }}>
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {(task.blockedBy.length > 0 || task.blocks.length > 0) && (
            <div>
              <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '0.5rem' }}>Dependencies</label>
              {task.blockedBy.length > 0 && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#FF4D4F', fontWeight: 600 }}>Blocked by: </span>
                  {task.blockedBy.map((dep) => (
                    <span key={dep._id} style={{ marginRight: '0.5rem', fontSize: '0.8rem' }}>
                      {dep.name} <StatusBadge status={dep.status} />
                    </span>
                  ))}
                </div>
              )}
              {task.blocks.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#FA8C16', fontWeight: 600 }}>Blocks: </span>
                  {task.blocks.map((dep) => (
                    <span key={dep._id} style={{ marginRight: '0.5rem', fontSize: '0.8rem' }}>
                      {dep.name} <StatusBadge status={dep.status} />
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#888' }}>Description</label>
              {!editingDesc && (
                <button
                  onClick={() => setEditingDesc(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#4A90E2' }}
                >
                  Edit
                </button>
              )}
            </div>
            {editingDesc ? (
              <div>
                <MDEditor value={description} onChange={(v) => setDescription(v ?? '')} height={200} />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button onClick={saveDescription} style={{ padding: '0.3rem 0.75rem', background: '#4A90E2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Save</button>
                  <button onClick={() => { setEditingDesc(false); setDescription(task.description); }} style={{ padding: '0.3rem 0.75rem', background: 'none', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div
                style={{ minHeight: '60px', padding: '0.75rem', background: '#FAFAFA', borderRadius: '6px', border: '1px solid #F0F0F0', fontSize: '0.875rem', color: task.description ? '#333' : '#BBB', cursor: 'pointer' }}
                onClick={() => setEditingDesc(true)}
              >
                {task.description || 'Click to add a description...'}
              </div>
            )}
          </div>

          {/* Subtasks */}
          {(subtasks.length > 0) && (
            <div>
              <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '0.5rem' }}>
                Subtasks ({subtasks.length})
              </label>
              {subtasks.map((sub) => (
                <TaskRow key={sub._id} task={sub} depth={1} />
              ))}
            </div>
          )}

          {/* Comments */}
          <div style={{ borderTop: '1px solid #E8E8E8', paddingTop: '1.5rem' }}>
            <CommentThread spaceId={spaceId!} taskId={taskId!} />
          </div>
        </div>
      </div>
    </div>
  );
}
