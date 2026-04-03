import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WikiFolderDocument = WikiFolder & Document;

@Schema({ timestamps: true })
export class WikiFolder {
  @Prop({ type: Types.ObjectId, ref: 'Space', required: true })
  spaceId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: 0 })
  position: number;
}

export const WikiFolderSchema = SchemaFactory.createForClass(WikiFolder);
WikiFolderSchema.index({ spaceId: 1, position: 1 });
