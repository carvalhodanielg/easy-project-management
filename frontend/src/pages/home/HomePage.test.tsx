import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import * as spacesApi from '../../api/spaces.api';
import { useAuthStore } from '../../store/auth.store';
import { useUiStore } from '../../store/ui.store';

vi.mock('../../store/auth.store');
vi.mock('../../store/ui.store');
vi.mock('../../api/spaces.api');
vi.mock('../../hooks/useAuth', () => ({
  useLogout: () => vi.fn(),
}));
vi.mock('../../hooks/useConfirm', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(false),
}));

function mockAuthStore(token: string | null) {
  const state = {
    token,
    user: token
      ? { _id: 'u1', displayName: 'Tester', email: 't@t.com' }
      : null,
  };
  vi.mocked(useAuthStore).mockImplementation((selector) =>
    selector(state as never),
  );
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }
  return Wrapper;
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUiStore).mockImplementation((selector) =>
      selector({ sidebarCollapsed: false, toggleSidebar: vi.fn() } as never),
    );
    vi.mocked(spacesApi.getSpaces).mockResolvedValue([]);
    vi.mocked(spacesApi.getArchivedSpaces).mockResolvedValue([]);
  });

  it('does not call getSpaces when token is null', async () => {
    mockAuthStore(null);
    render(<HomePage />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(spacesApi.getSpaces).not.toHaveBeenCalled();
    });
  });

  it('calls getSpaces and renders spaces when token is available', async () => {
    mockAuthStore('tok-123');
    vi.mocked(spacesApi.getSpaces).mockResolvedValue([
      { _id: 's1', name: 'Design', color: '#6366F1', description: '' } as never,
    ]);

    render(<HomePage />, { wrapper: makeWrapper() });

    // space name appears in both sidebar and grid — use findAllByText
    expect((await screen.findAllByText('Design')).length).toBeGreaterThan(0);
    expect(spacesApi.getSpaces).toHaveBeenCalledTimes(1);
  });
});
