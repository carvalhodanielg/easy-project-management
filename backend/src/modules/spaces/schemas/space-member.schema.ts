import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SpaceMemberDocument = HydratedDocument<SpaceMember>;

export enum SpaceRole {
  Owner = 'owner',
  Editor = 'editor',
  Viewer = 'viewer',
}

/**
 * Privilege ranking used by SpaceRoleGuard. A higher number grants every
 * permission of the roles below it, so `@Roles(Editor)` accepts Owner too.
 */
export const ROLE_RANK: Record<SpaceRole, number> = {
  [SpaceRole.Viewer]: 0,
  [SpaceRole.Editor]: 1,
  [SpaceRole.Owner]: 2,
};

@Schema({ timestamps: true })
export class SpaceMember {
  @Prop({ type: Types.ObjectId, ref: 'Space', required: true })
  spaceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: SpaceRole, default: SpaceRole.Editor })
  role: SpaceRole;
}

export const SpaceMemberSchema = SchemaFactory.createForClass(SpaceMember);

SpaceMemberSchema.index({ spaceId: 1, userId: 1 }, { unique: true });
