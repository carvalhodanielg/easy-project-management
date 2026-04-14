import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SavedFilterDocument = HydratedDocument<SavedFilter>;

export interface SavedFilterFields {
  status?: string[];
  priority?: string[];
  assignees?: string[];
  tags?: string[];
  groupBy?: string;
  includeSubtasks?: boolean;
  q?: string;
}

@Schema({ timestamps: true })
export class SavedFilter {
  @Prop({ type: Types.ObjectId, ref: 'Space', required: true, index: true })
  spaceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Object, required: true })
  filters: SavedFilterFields;
}

export const SavedFilterSchema = SchemaFactory.createForClass(SavedFilter);
SavedFilterSchema.index({ spaceId: 1, name: 1 });
