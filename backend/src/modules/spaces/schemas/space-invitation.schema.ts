import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SpaceRole } from './space-member.schema';

export type SpaceInvitationDocument = HydratedDocument<SpaceInvitation>;

export enum InvitationStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Revoked = 'revoked',
  Expired = 'expired',
}

@Schema({ timestamps: true })
export class SpaceInvitation {
  @Prop({ type: Types.ObjectId, ref: 'Space', required: true })
  spaceId: Types.ObjectId;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, enum: SpaceRole, default: SpaceRole.Editor })
  role: SpaceRole;

  @Prop({ type: String, required: true, unique: true })
  token: string;

  @Prop({
    type: String,
    enum: InvitationStatus,
    default: InvitationStatus.Pending,
  })
  status: InvitationStatus;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  invitedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  acceptedBy: Types.ObjectId | null;
}

export const SpaceInvitationSchema =
  SchemaFactory.createForClass(SpaceInvitation);

// One active (pending) invitation per email per space; accepted/revoked rows
// stay for audit and do not collide thanks to the partial filter.
SpaceInvitationSchema.index(
  { spaceId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { status: InvitationStatus.Pending },
  },
);
