import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ListDocument = HydratedDocument<List>;

@Schema({ timestamps: true })
export class List {
  @Prop({ type: Types.ObjectId, ref: 'Space', required: true, index: true })
  spaceId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: 0 })
  position: number;
}

export const ListSchema = SchemaFactory.createForClass(List);
