import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as commentsApi from '../../api/comments.api';
import { useAuthStore } from '../../store/auth.store';

interface Props {
  spaceId: string;
  taskId: string;
}

export function CommentThread({ spaceId, taskId }: Props) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => commentsApi.getComments(spaceId, taskId),
  });

  const createMutation = useMutation({
    mutationFn: () => commentsApi.createComment(spaceId, taskId, content),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      setContent('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      commentsApi.updateComment(spaceId, taskId, id, text),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) =>
      commentsApi.deleteComment(spaceId, taskId, commentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', taskId] }),
  });

  return (
    <div>
      <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#555' }}>
        Comments ({comments.length})
      </h4>

      {comments.map((comment) => (
        <div
          key={comment._id}
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            background: '#FAFAFA',
            borderRadius: '6px',
            border: '1px solid #F0F0F0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#4A90E2',
                  color: '#fff',
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {comment.author.displayName.charAt(0).toUpperCase()}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{comment.author.displayName}</span>
              <span style={{ fontSize: '0.75rem', color: '#AAA' }}>
                {new Date(comment.createdAt).toLocaleString()}
                {comment.edited && ' (edited)'}
              </span>
            </div>
            {comment.author._id === currentUser?._id && (
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={() => { setEditingId(comment._id); setEditContent(comment.content); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#888' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteMutation.mutate(comment._id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#FF4D4F' }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {editingId === comment._id ? (
            <div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.5rem', border: '1px solid #4A90E2', borderRadius: '4px', resize: 'vertical', fontSize: '0.875rem' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => updateMutation.mutate({ id: comment._id, text: editContent })}
                  disabled={updateMutation.isPending}
                  style={{ padding: '0.3rem 0.75rem', background: '#4A90E2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  style={{ padding: '0.3rem 0.75rem', background: 'none', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
              {comment.content}
            </p>
          )}

          {comment.attachments.length > 0 && (
            <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {comment.attachments.map((att) => (
                <a
                  key={att._id}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.75rem', color: '#4A90E2', textDecoration: 'none' }}
                >
                  📎 {att.originalName}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* New comment form */}
      <div style={{ marginTop: '1rem' }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          style={{ width: '100%', boxSizing: 'border-box', padding: '0.5rem', border: '1px solid #E8E8E8', borderRadius: '6px', resize: 'vertical', fontSize: '0.875rem' }}
        />
        <button
          onClick={() => content.trim() && createMutation.mutate()}
          disabled={!content.trim() || createMutation.isPending}
          style={{
            marginTop: '0.5rem',
            padding: '0.4rem 0.8rem',
            background: '#4A90E2',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          {createMutation.isPending ? 'Posting...' : 'Post Comment'}
        </button>
      </div>
    </div>
  );
}
