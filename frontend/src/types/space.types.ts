import type { User } from './user.types';

export interface Space {
  _id: string;
  name: string;
  description: string | null;
  color: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type SpaceRole = 'editor' | 'viewer';

export interface SpaceMember {
  _id: string;
  spaceId: string;
  userId: User | string;
  role: SpaceRole;
}

export interface CreateSpacePayload {
  name: string;
  description?: string;
  color?: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface SpaceInvitation {
  _id: string;
  spaceId: string;
  email: string;
  role: SpaceRole;
  status: InvitationStatus;
  token: string;
  expiresAt: string;
  invitedBy: User | string;
  createdAt: string;
}

export interface CreateInvitationResult {
  invitation: SpaceInvitation;
  inviteUrl: string;
}

export interface InvitationContext {
  email: string;
  role: SpaceRole;
  status: InvitationStatus;
  valid: boolean;
  spaceId: string;
  spaceName: string | null;
  inviterName: string | null;
}
