import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import * as spacesApi from '../../api/spaces.api';
import { Space } from '../../types/space.types';

export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#4A90E2');
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
      setColor('#4A90E2');
    },
    onError: () => setFormError('Failed to create space.'),
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    createMutation.mutate();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header
        style={{
          background: '#fff',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>AtkPlan</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#555' }}>{user?.displayName}</span>
          <button onClick={logout} style={{ padding: '0.4rem 0.8rem', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </header>

      <main style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Spaces</h2>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: '0.5rem 1rem',
              background: '#4A90E2',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            + New Space
          </button>
        </div>

        {isLoading && <p>Loading...</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {spaces.map((space: Space) => (
            <div
              key={space._id}
              onClick={() => navigate(`/spaces/${space._id}`)}
              style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '1.25rem',
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                borderLeft: `4px solid ${space.color}`,
                transition: 'box-shadow 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: space.color,
                    flexShrink: 0,
                  }}
                />
                <strong style={{ fontSize: '1rem' }}>{space.name}</strong>
              </div>
              {space.description && (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>{space.description}</p>
              )}
            </div>
          ))}
        </div>

        {spaces.length === 0 && !isLoading && (
          <p style={{ color: '#888', textAlign: 'center', marginTop: '3rem' }}>
            No spaces yet. Create your first space to get started.
          </p>
        )}
      </main>

      {showCreate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setShowCreate(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '2rem',
              width: '100%',
              maxWidth: '400px',
            }}
          >
            <h3 style={{ marginTop: 0 }}>New Space</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem' }}>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem' }}>Color</label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{ width: '100%', height: '40px', cursor: 'pointer' }}
                />
              </div>
              {formError && <p style={{ color: 'red', fontSize: '0.875rem' }}>{formError}</p>}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  style={{ padding: '0.5rem 1rem', background: '#4A90E2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
