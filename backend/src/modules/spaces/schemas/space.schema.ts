import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SpaceDocument = HydratedDocument<Space>;

@Schema({ timestamps: true })
export class Space {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ default: '#4A90E2' })
  color: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const SpaceSchema = SchemaFactory.createForClass(Space);
