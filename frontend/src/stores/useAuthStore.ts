import { create } from "zustand";
import { readFrontpageToken, readFrontpageUser } from "@webhatchery/auth-react";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  loginUrl: string | null;
  setAuth: (user: User, token: string) => void;
  setLoginUrl: (loginUrl: string | null) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>()((set) => ({
  user: readFrontpageUser() as User | null,
  token: readFrontpageToken(),
  loginUrl: null,
  setAuth: (user, token) => set({ user, token }),
  setLoginUrl: (loginUrl) => set({ loginUrl }),
  logout: () => set({ user: null, token: null }),
}));

export { useAuthStore };
