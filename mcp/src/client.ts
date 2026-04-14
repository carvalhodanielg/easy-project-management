import axios, { type AxiosInstance } from 'axios';

const BASE_URL = process.env.CLAUDIO_API_URL ?? 'http://localhost:3000';

let token: string | null = process.env.CLAUDIO_TOKEN ?? null;

export const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface ApiResponse<T> { data: T; }

export async function login(): Promise<void> {
  const email    = process.env.CLAUDIO_EMAIL;
  const password = process.env.CLAUDIO_PASSWORD;

  if (!email || !password) {
    if (!token) throw new Error('Defina CLAUDIO_TOKEN ou CLAUDIO_EMAIL + CLAUDIO_PASSWORD nas variáveis de ambiente.');
    return; // já tem token estático
  }

  const res = await http.post<ApiResponse<{ token: string }>>('/auth/login', { email, password });
  token = res.data.data.token;
}

export function unwrap<T>(res: { data: ApiResponse<T> }): T {
  return res.data.data;
}
