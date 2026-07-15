import { create } from 'zustand';

import type { User } from '@/src/types/api';

interface AuthState {
  user: User | null;
  bootstrapped: boolean;
  bootstrapError: string | null;
  bootstrapAttempt: number;
  setUser: (user: User | null) => void;
  setBootstrapped: (value: boolean) => void;
  setBootstrapError: (message: string | null) => void;
  retryBootstrap: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  bootstrapped: false,
  bootstrapError: null,
  bootstrapAttempt: 0,
  setUser: (user) => set({ user }),
  setBootstrapped: (bootstrapped) => set({ bootstrapped }),
  setBootstrapError: (bootstrapError) => set({ bootstrapError }),
  retryBootstrap: () =>
    set((state) => ({
      bootstrapped: false,
      bootstrapError: null,
      bootstrapAttempt: state.bootstrapAttempt + 1,
    })),
}));
