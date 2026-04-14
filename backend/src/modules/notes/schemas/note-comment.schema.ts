import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NoteCommentDocument = HydratedDocument<NoteComment>;

@Schema({ timestamps: true })
export class NoteComment {
  @Prop({ type: Types.ObjectId, ref: 'Note', required: true, index: true })
  noteId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  mentions: Types.ObjectId[];

  @Prop({ default: false })
  edited: boolean;
}

export const NoteCommentSchema = SchemaFactory.createForClass(NoteComment);
