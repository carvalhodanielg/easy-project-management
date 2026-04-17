import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as notifApi from '../../api/notifications.api';
import type { Notification } from '../../types/notification.types';

const ICONS: Record<Notification['type'], string> = {
  task_assigned: '📋',
  comment_added: '💬',
  mention: '@',
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notifApi.getNotifications,
    refetchInterval: 15_000,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsReadMutation = useMutation({
    mutationFn: notifApi.markAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: notifApi.markAllAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="Notificações"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-ink-dim hover:text-ink hover:bg-surface-hi transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-line rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <span className="text-sm font-semibold text-ink">Notificações</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="text-xs text-brand hover:text-brand-hi transition-colors disabled:opacity-50"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-ink-dim text-center py-8">Nenhuma notificação</p>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif._id}
                  onClick={() => {
                    if (!notif.read) markAsReadMutation.mutate(notif._id);
                    if (notif.taskId && notif.spaceId) {
                      setOpen(false);
                      navigate(`/spaces/${notif.spaceId}/tasks/${notif.taskId}`);
                    }
                  }}
                  className={`w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-surface-hi transition-colors border-b border-line last:border-0 ${
                    notif.read ? 'opacity-60' : ''
                  }`}
                >
                  <span className="text-base shrink-0 mt-0.5">{ICONS[notif.type]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink leading-snug">{notif.message}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {new Date(notif.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
