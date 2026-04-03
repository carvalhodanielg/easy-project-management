import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';

export function useLogin() {
  const { setAuth, setUser } = useAuthStore();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (token) => {
      const { setAuth: _setAuth } = useAuthStore.getState();
      // temporarily set token to allow getMe call
      useAuthStore.setState({ token });
      const user = await authApi.getMe();
      _setAuth(token, user);
      setUser(user);
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: async (token) => {
      useAuthStore.setState({ token });
      const user = await authApi.getMe();
      useAuthStore.getState().setAuth(token, user);
      navigate('/home');
    },
  });
}

export function useCurrentUser() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}
