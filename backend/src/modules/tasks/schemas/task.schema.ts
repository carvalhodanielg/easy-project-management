import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TaskDocument = HydratedDocument<Task>;

export enum TaskStatus {
  Pendente = 'pendente',
  EmProgresso = 'em_progresso',
  EmReview = 'em_review',
  Feito = 'feito',
  Fechado = 'fechado',
}

export enum TaskPriority {
  Urgente = 'urgente',
  Alta = 'alta',
  Normal = 'normal',
  Baixa = 'baixa',
}

export const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89] as const;
export type FibonacciPoint = (typeof FIBONACCI_POINTS)[number];

@Schema({ timestamps: true })
export class Task {
  @Prop({ type: Types.ObjectId, ref: 'Space', required: true, index: true })
  spaceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'List', default: null, index: true })
  listId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Sprint', default: null, index: true })
  sprintId: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: String, enum: TaskStatus, default: TaskStatus.Pendente, index: true })
  status: TaskStatus;

  @Prop({ type: String, enum: TaskPriority, default: TaskPriority.Normal, index: true })
  priority: TaskPriority;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [], index: true })
  assignees: Types.ObjectId[];

  @Prop({ type: Date, default: null })
  startDate: Date | null;

  @Prop({ type: Date, default: null, index: true })
  dueDate: Date | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tag' }], default: [] })
  tags: Types.ObjectId[];

  @Prop({ type: Number, default: null })
  storyPoints: number | null;

  @Prop({ type: Types.ObjectId, ref: 'Task', default: null, index: true })
  parentTask: Types.ObjectId | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Task' }], default: [] })
  blockedBy: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Task' }], default: [] })
  blocks: Types.ObjectId[];

  @Prop({ default: 0 })
  position: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  // Computed on read by TasksService — never persisted from client
  @Prop({ type: Number, default: 0 })
  subtaskCount: number;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

TaskSchema.index({ spaceId: 1, status: 1 });
TaskSchema.index({ spaceId: 1, sprintId: 1, status: 1 });
TaskSchema.index({ spaceId: 1, assignees: 1, status: 1 });
TaskSchema.index({ spaceId: 1, listId: 1 });
