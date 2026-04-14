import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TaskEventDocument = HydratedDocument<TaskEvent>;

export enum TaskEventType {
  Created = 'created',
  StatusChanged = 'status_changed',
  PriorityChanged = 'priority_changed',
  NameChanged = 'name_changed',
  DescriptionChanged = 'description_changed',
  DueDateChanged = 'due_date_changed',
  StartDateChanged = 'start_date_changed',
  StoryPointsChanged = 'story_points_changed',
  AssigneeAdded = 'assignee_added',
  AssigneeRemoved = 'assignee_removed',
  Moved = 'moved',
}

@Schema({ timestamps: true })
export class TaskEvent {
  @Prop({ type: Types.ObjectId, ref: 'Task', required: true, index: true })
  taskId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Space', required: true, index: true })
  spaceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: TaskEventType })
  type: TaskEventType;

  @Prop({ type: Object, default: null })
  changes: { field: string; oldValue: string | null; newValue: string | null } | null;
}

export const TaskEventSchema = SchemaFactory.createForClass(TaskEvent);
TaskEventSchema.index({ taskId: 1, createdAt: -1 });
