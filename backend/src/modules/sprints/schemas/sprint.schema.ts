import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SprintDocument = HydratedDocument<Sprint>;

export enum SprintStatus {
  Planning = 'planning',
  Active = 'active',
  Completed = 'completed',
}

@Schema({ timestamps: true })
export class Sprint {
  @Prop({ type: Types.ObjectId, ref: 'Space', required: true, index: true })
  spaceId: Types.ObjectId;

  @Prop({ required: true })
  number: number;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ type: String, enum: SprintStatus, default: SprintStatus.Planning })
  status: SprintStatus;

  /** Optional reference to the SprintFolder that manages this sprint */
  @Prop({ type: Types.ObjectId, ref: 'SprintFolder', default: null, index: true })
  folderId: Types.ObjectId | null;

  /** Sequential number within the folder (1, 2, 3…). Null for sprints without a folder. */
  @Prop({ type: Number, default: null })
  folderNumber: number | null;
}

export const SprintSchema = SchemaFactory.createForClass(Sprint);

SprintSchema.index({ spaceId: 1, number: 1 }, { unique: true });
