import { useAuthStore } from '../../store/auth.store';

export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>AtkPlan</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>{user?.displayName}</span>
          <button onClick={logout} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </header>
      <p>Welcome! Spaces will appear here.</p>
    </div>
  );
}
