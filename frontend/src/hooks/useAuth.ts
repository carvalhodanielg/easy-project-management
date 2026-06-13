import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';

export function useLogin() {
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async ({ token, refreshToken }) => {
      const { setAuth } = useAuthStore.getState();
      // temporarily set token to allow getMe call
      useAuthStore.setState({ token });
      const user = await authApi.getMe();
      setAuth(token, refreshToken, user);
      setUser(user);
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: async ({ token, refreshToken }) => {
      useAuthStore.setState({ token });
      const user = await authApi.getMe();
      useAuthStore.getState().setAuth(token, refreshToken, user);
      navigate('/home');
    },
  });
}

// Revokes the refresh token (best-effort) before clearing local session state.
export function useLogout() {
  const navigate = useNavigate();

  return async () => {
    const { refreshToken, logout } = useAuthStore.getState();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Best-effort: clear the local session even if revocation fails.
      }
    }
    logout();
    navigate('/login', { replace: true });
  };
}

export function useCurrentUser() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.getMe(),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}
