import { api } from './client';
import type { LoginResponse, User } from '@/src/types/api';

export const authApi = {
  async login(payload: { username: string; password: string }) {
    const res = await api.post<LoginResponse>('/auth/login', payload);
    return res.data;
  },

  async me() {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },

  async refresh() {
    const res = await api.post<LoginResponse>('/auth/refresh');
    return res.data;
  },

  async logout() {
    const res = await api.post<{ message: string }>('/auth/logout');
    return res.data;
  },
};
