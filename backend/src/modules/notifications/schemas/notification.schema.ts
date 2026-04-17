import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationType {
  TaskAssigned = 'task_assigned',
  CommentAdded = 'comment_added',
  Mention = 'mention',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Types.ObjectId, ref: 'Task', default: null })
  taskId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Space', default: null })
  spaceId: Types.ObjectId | null;

  @Prop({ default: false })
  read: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
