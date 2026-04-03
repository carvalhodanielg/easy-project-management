import { useEffect } from 'react';
import { Outlet, useParams, useNavigate, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import { useSpacesStore } from '../../store/spaces.store';
import * as spacesApi from '../../api/spaces.api';
import * as listsApi from '../../api/lists.api';
import * as sprintsApi from '../../api/sprints.api';
import * as wikiApi from '../../api/wiki.api';

export function SpaceLayout() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { setCurrentSpace } = useSpacesStore();

  const { data: space } = useQuery({
    queryKey: ['space', spaceId],
    queryFn: () => spacesApi.getSpace(spaceId!),
    enabled: !!spaceId,
  });

  const { data: lists = [] } = useQuery({
    queryKey: ['lists', spaceId],
    queryFn: () => listsApi.getLists(spaceId!),
    enabled: !!spaceId,
  });

  const { data: sprints = [] } = useQuery({
    queryKey: ['sprints', spaceId],
    queryFn: () => sprintsApi.getSprints(spaceId!),
    enabled: !!spaceId,
  });

  const { data: wikiFolders = [] } = useQuery({
    queryKey: ['wiki-folders', spaceId],
    queryFn: () => wikiApi.getFolders(spaceId!),
    enabled: !!spaceId,
  });

  useEffect(() => {
    if (space) setCurrentSpace(space);
    return () => setCurrentSpace(null);
  }, [space, setCurrentSpace]);

  const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    display: 'block',
    padding: '0.4rem 0.75rem',
    borderRadius: '4px',
    textDecoration: 'none',
    fontSize: '0.875rem',
    color: isActive ? '#4A90E2' : '#333',
    background: isActive ? '#EBF3FD' : 'transparent',
    fontWeight: isActive ? 600 : 400,
  });

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '220px',
          flexShrink: 0,
          background: '#FAFAFA',
          borderRight: '1px solid #E8E8E8',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '1rem', borderBottom: '1px solid #E8E8E8' }}>
          <button
            onClick={() => navigate('/home')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#888', padding: 0 }}
          >
            ← All Spaces
          </button>
          <h2
            style={{
              margin: '0.5rem 0 0',
              fontSize: '1rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: space?.color ?? '#4A90E2',
                marginRight: '6px',
              }}
            />
            {space?.name ?? '...'}
          </h2>
        </div>

        <nav style={{ flex: 1, overflow: 'auto', padding: '0.5rem' }}>
          {lists.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#AAA', margin: '0.5rem 0.75rem 0.25rem', letterSpacing: '0.05em' }}>
                Lists
              </p>
              {lists.map((list) => (
                <NavLink
                  key={list._id}
                  to={`/spaces/${spaceId}/lists/${list._id}`}
                  style={navLinkStyle}
                >
                  ≡ {list.name}
                </NavLink>
              ))}
            </div>
          )}

          {sprints.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#AAA', margin: '0.5rem 0.75rem 0.25rem', letterSpacing: '0.05em' }}>
                Sprints
              </p>
              {sprints.map((sprint) => (
                <NavLink
                  key={sprint._id}
                  to={`/spaces/${spaceId}/sprints/${sprint._id}`}
                  style={navLinkStyle}
                >
                  ⚡ Sprint {sprint.number}
                </NavLink>
              ))}
            </div>
          )}

          {wikiFolders.length > 0 && (
            <div>
              <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#AAA', margin: '0.5rem 0.75rem 0.25rem', letterSpacing: '0.05em' }}>
                Wiki
              </p>
              {wikiFolders.map((folder) => (
                <NavLink
                  key={folder._id}
                  to={`/spaces/${spaceId}/wiki/folders/${folder._id}`}
                  style={navLinkStyle}
                >
                  📂 {folder.name}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        <div style={{ padding: '0.75rem', borderTop: '1px solid #E8E8E8', fontSize: '0.8rem', color: '#888' }}>
          {user?.displayName}
          <button
            onClick={logout}
            style={{ marginLeft: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#AAA', fontSize: '0.75rem' }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}
