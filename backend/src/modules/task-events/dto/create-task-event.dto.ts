import { TaskEventType } from '../schemas/task-event.schema';

export class CreateTaskEventDto {
  taskId: string;
  spaceId: string;
  userId: string;
  type: TaskEventType;
  changes?: {
    field: string;
    oldValue: string | null;
    newValue: string | null;
  } | null;
}
