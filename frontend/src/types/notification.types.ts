export type NotificationType = 'task_assigned' | 'comment_added' | 'mention';

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  message: string;
  taskId: string | null;
  read: boolean;
  createdAt: string;
}
