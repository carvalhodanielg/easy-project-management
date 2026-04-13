import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NotificationBell } from './NotificationBell';
import * as notifApi from '../../api/notifications.api';
import type { Notification } from '../../types/notification.types';

vi.mock('../../api/notifications.api');

const NOTIFICATIONS: Notification[] = [
  {
    _id: 'n1',
    userId: 'u1',
    type: 'task_assigned',
    message: 'Você foi atribuído à tarefa "Fix bug"',
    taskId: 't1',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'n2',
    userId: 'u1',
    type: 'comment_added',
    message: 'Novo comentário na tarefa "Deploy"',
    taskId: 't2',
    read: true,
    createdAt: new Date().toISOString(),
  },
];

function renderComponent() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <NotificationBell />
    </QueryClientProvider>,
  );
}

describe('NotificationBell', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows unread badge when there are unread notifications', async () => {
    vi.mocked(notifApi.getNotifications).mockResolvedValue(NOTIFICATIONS);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('does not show badge when all notifications are read', async () => {
    vi.mocked(notifApi.getNotifications).mockResolvedValue(
      NOTIFICATIONS.map((n) => ({ ...n, read: true })),
    );
    renderComponent();
    await waitFor(() => {
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });
  });

  it('opens dropdown when bell is clicked', async () => {
    vi.mocked(notifApi.getNotifications).mockResolvedValue(NOTIFICATIONS);
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /notificações/i }));
    await waitFor(() => {
      expect(screen.getByText('Você foi atribuído à tarefa "Fix bug"')).toBeInTheDocument();
    });
  });

  it('shows "Marcar todas como lidas" button in dropdown', async () => {
    vi.mocked(notifApi.getNotifications).mockResolvedValue(NOTIFICATIONS);
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /notificações/i }));
    await waitFor(() => {
      expect(screen.getByText('Marcar todas como lidas')).toBeInTheDocument();
    });
  });

  it('shows empty state when there are no notifications', async () => {
    vi.mocked(notifApi.getNotifications).mockResolvedValue([]);
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /notificações/i }));
    await waitFor(() => {
      expect(screen.getByText('Nenhuma notificação')).toBeInTheDocument();
    });
  });
});
