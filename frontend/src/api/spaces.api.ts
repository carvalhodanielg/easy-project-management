import { apiClient } from './client';
import {
  Space,
  SpaceMember,
  CreateSpacePayload,
  SpaceRole,
  SpaceInvitation,
  CreateInvitationResult,
} from '../types/space.types';

// Re-exported so consumers can reference the type via this module (e.g.
// `spacesApi.SpaceMember`) alongside the data-fetching helpers.
export type { SpaceMember } from '../types/space.types';

interface ApiResponse<T> {
  data: T;
}

export async function getSpaces(): Promise<Space[]> {
  const res = await apiClient.get<ApiResponse<Space[]>>('/spaces');
  return res.data.data;
}

export async function getSpace(spaceId: string): Promise<Space> {
  const res = await apiClient.get<ApiResponse<Space>>(`/spaces/${spaceId}`);
  return res.data.data;
}

export async function createSpace(payload: CreateSpacePayload): Promise<Space> {
  const res = await apiClient.post<ApiResponse<Space>>('/spaces', payload);
  return res.data.data;
}

export async function updateSpace(spaceId: string, payload: Partial<CreateSpacePayload>): Promise<Space> {
  const res = await apiClient.patch<ApiResponse<Space>>(`/spaces/${spaceId}`, payload);
  return res.data.data;
}

export async function deleteSpace(spaceId: string): Promise<void> {
  await apiClient.delete(`/spaces/${spaceId}`);
}

export async function getSpaceMembers(spaceId: string): Promise<SpaceMember[]> {
  const res = await apiClient.get<ApiResponse<SpaceMember[]>>(`/spaces/${spaceId}/members`);
  return res.data.data;
}

export async function addSpaceMember(spaceId: string, userId: string, role: SpaceRole): Promise<SpaceMember> {
  const res = await apiClient.post<ApiResponse<SpaceMember>>(`/spaces/${spaceId}/members`, {
    userId,
    role,
  });
  return res.data.data;
}

export async function updateMemberRole(spaceId: string, userId: string, role: SpaceRole): Promise<SpaceMember> {
  const res = await apiClient.patch<ApiResponse<SpaceMember>>(
    `/spaces/${spaceId}/members/${userId}`,
    { role },
  );
  return res.data.data;
}

export async function removeMember(spaceId: string, userId: string): Promise<void> {
  await apiClient.delete(`/spaces/${spaceId}/members/${userId}`);
}

export async function transferOwnership(spaceId: string, userId: string): Promise<void> {
  await apiClient.post(`/spaces/${spaceId}/transfer-ownership`, { userId });
}

export async function getSpaceInvitations(spaceId: string): Promise<SpaceInvitation[]> {
  const res = await apiClient.get<ApiResponse<SpaceInvitation[]>>(
    `/spaces/${spaceId}/invitations`,
  );
  return res.data.data;
}

export async function inviteSpaceMember(
  spaceId: string,
  email: string,
  role: SpaceRole,
): Promise<CreateInvitationResult> {
  const res = await apiClient.post<ApiResponse<CreateInvitationResult>>(
    `/spaces/${spaceId}/invitations`,
    { email, role },
  );
  return res.data.data;
}

export async function revokeInvitation(spaceId: string, invitationId: string): Promise<void> {
  await apiClient.delete(`/spaces/${spaceId}/invitations/${invitationId}`);
}
