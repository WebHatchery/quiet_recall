import { create } from "zustand";
import { persist } from "zustand/middleware";
import { registerUnauthorizedCallback } from "../api/client";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  loginUrl: string | null;
  setAuth: (user: User, token: string) => void;
  setLoginUrl: (loginUrl: string | null) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      loginUrl: null,
      setAuth: (user, token) => set({ user, token }),
      setLoginUrl: (loginUrl) => set({ loginUrl }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: "auth-storage",
    },
  ),
);

registerUnauthorizedCallback((loginUrl) => {
  useAuthStore.getState().setLoginUrl(loginUrl);
});

export { useAuthStore };
