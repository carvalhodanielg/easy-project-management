import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SprintFolderDocument = HydratedDocument<SprintFolder>;

/** Day of week: 0 = Sunday, 1 = Monday … 6 = Saturday */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

@Schema({ timestamps: true })
export class SprintFolder {
  @Prop({ type: Types.ObjectId, ref: 'Space', required: true, index: true })
  spaceId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  /** Day of week on which each sprint starts (0 = Sunday, 1 = Monday … 6 = Saturday) */
  @Prop({ required: true, min: 0, max: 6 })
  startDayOfWeek: DayOfWeek;

  /** Duration of each sprint in weeks */
  @Prop({ required: true, min: 1, default: 2 })
  durationWeeks: number;

  /** Automatically mark a sprint as completed when its endDate is reached */
  @Prop({ default: false })
  autoComplete: boolean;

  /**
   * How many upcoming (planning + active) sprints should exist at any moment.
   * When a sprint is completed and the count drops below this number,
   * a new sprint is created automatically.
   */
  @Prop({ required: true, min: 1, default: 1 })
  openFutureSprints: number;

  /** Optional date after which no new sprints are created and the folder is archived */
  @Prop({ type: Date, default: null })
  folderEndDate: Date | null;
}

export const SprintFolderSchema = SchemaFactory.createForClass(SprintFolder);
