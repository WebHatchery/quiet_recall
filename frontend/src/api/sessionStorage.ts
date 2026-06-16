import type { User } from "../types";

const FRONTPAGE_AUTH_STORAGE_KEY = "auth-storage";
const GUEST_SESSION_STORAGE_KEY = "quiet-recall-guest-session";

interface PersistedAuthStorage {
  state?: {
    token?: string | null;
    loginUrl?: string | null;
    user?: User | null;
    isGuest?: boolean;
  };
}

export interface GuestSession {
  token: string;
  user: User;
}

function parseJsonRecord(raw: string | null): Record<string, unknown> | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function readFrontpageStorage(): PersistedAuthStorage | null {
  return parseJsonRecord(
    window.localStorage.getItem(FRONTPAGE_AUTH_STORAGE_KEY),
  ) as PersistedAuthStorage | null;
}

export function readFrontpageToken(): string | null {
  const storage = readFrontpageStorage();
  const token = storage?.state?.token;
  const user = storage?.state?.user;
  const isGuest = Boolean(user?.is_guest || storage?.state?.isGuest);
  return typeof token === "string" && token !== "" && !isGuest ? token : null;
}

export function readFrontpageUser(): User | null {
  const storage = readFrontpageStorage();
  return storage?.state?.user ?? null;
}

export function readGuestSession(): GuestSession | null {
  const parsed = parseJsonRecord(
    window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY),
  );
  const token = parsed?.token;
  const user = parsed?.user;

  if (typeof token !== "string" || typeof user !== "object" || user === null) {
    return null;
  }

  return {
    token,
    user: user as User,
  };
}

export function readAuthToken(): string | null {
  return readFrontpageToken() ?? readGuestSession()?.token ?? null;
}

export function readAuthDisplayName(): string | null {
  const frontpageUser = readFrontpageUser();
  if (readFrontpageToken() && frontpageUser) {
    return (
      frontpageUser.display_name ||
      frontpageUser.username ||
      frontpageUser.email ||
      null
    );
  }

  const guestUser = readGuestSession()?.user;
  return guestUser?.display_name || guestUser?.username || null;
}

export function hasMergeableGuestSession(): boolean {
  return Boolean(readFrontpageToken() && readGuestSession());
}

export function isGuestSessionActive(): boolean {
  return !readFrontpageToken() && Boolean(readGuestSession());
}

export function saveGuestSession(token: string, user: User): void {
  window.localStorage.setItem(
    GUEST_SESSION_STORAGE_KEY,
    JSON.stringify({ token, user }),
  );
}

export function clearGuestSession(): void {
  window.localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
}

export function persistLoginUrl(loginUrl: string): void {
  const raw = window.localStorage.getItem(FRONTPAGE_AUTH_STORAGE_KEY);
  const parsed = parseJsonRecord(raw) ?? {};
  const state =
    typeof parsed.state === "object" && parsed.state !== null
      ? parsed.state
      : {};

  window.localStorage.setItem(
    FRONTPAGE_AUTH_STORAGE_KEY,
    JSON.stringify({
      ...parsed,
      state: {
        ...state,
        loginUrl,
      },
    }),
  );
}
