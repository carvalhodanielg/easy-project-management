import { apiClient } from './client';
import type { InvitationContext, Space } from '../types/space.types';

interface ApiResponse<T> {
  data: T;
}

export async function getInvitation(token: string): Promise<InvitationContext> {
  const res = await apiClient.get<ApiResponse<InvitationContext>>(
    `/invitations/${token}`,
  );
  return res.data.data;
}

export async function acceptInvitation(token: string): Promise<Space> {
  const res = await apiClient.post<ApiResponse<Space>>(
    `/invitations/${token}/accept`,
  );
  return res.data.data;
}

/** Builds the shareable accept link for an invitation token, rooted at this app. */
export function buildInviteUrl(token: string): string {
  return `${window.location.origin}/invite/accept?token=${token}`;
}
