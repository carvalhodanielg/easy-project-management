import { User } from './user.types';

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
