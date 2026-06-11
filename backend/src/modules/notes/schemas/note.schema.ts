import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NoteDocument = HydratedDocument<Note>;

@Schema({ timestamps: true })
export class Note {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ default: '' })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'Space', required: true, index: true })
  spaceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Sprint', required: true, index: true })
  sprintId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: String, default: null })
  label: string | null;
}

export const NoteSchema = SchemaFactory.createForClass(Note);
// Full-text index for indexed search on the note title (replaces unindexed $regex).
NoteSchema.index({ title: 'text' });
