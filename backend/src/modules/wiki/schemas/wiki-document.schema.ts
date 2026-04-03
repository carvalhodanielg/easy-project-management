import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WikiDocumentDocument = WikiDocument & Document;

@Schema({ timestamps: true })
export class WikiDocument {
  @Prop({ type: Types.ObjectId, ref: 'WikiFolder', required: true })
  folderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Space', required: true })
  spaceId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ default: '' })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  lastEditedBy: Types.ObjectId;
}

export const WikiDocumentSchema = SchemaFactory.createForClass(WikiDocument);
WikiDocumentSchema.index({ folderId: 1 });
WikiDocumentSchema.index({ spaceId: 1 });
