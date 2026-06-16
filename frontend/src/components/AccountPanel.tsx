import { LogIn, RefreshCw, UserPlus } from "lucide-react";
import { useRecallStore } from "../stores/useRecallStore";

export function AccountPanel() {
  const isAuthenticated = useRecallStore((state) => state.isAuthenticated);
  const isGuest = useRecallStore((state) => state.isGuest);
  const hasMergeableGuestSession = useRecallStore(
    (state) => state.hasMergeableGuestSession,
  );
  const syncError = useRecallStore((state) => state.syncError);
  const isSyncing = useRecallStore((state) => state.isSyncing);
  const continueAsGuest = useRecallStore((state) => state.continueAsGuest);
  const mergeGuestSession = useRecallStore((state) => state.mergeGuestSession);
  const visitWebHatcheryLogin = useRecallStore(
    (state) => state.visitWebHatcheryLogin,
  );
  const loadRemoteState = useRecallStore((state) => state.loadRemoteState);

  return (
    <section className="rounded-md border border-stone-700/70 bg-stone-950/55 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-stone-50">Account</h2>
          <p className="text-sm text-stone-400">
            {isAuthenticated
              ? isGuest
                ? "Guest progress can sync on this device."
                : "WebHatchery progress sync is available."
              : "Local progress is saved on this device."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isAuthenticated ? (
            <>
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-amber-200/25 bg-amber-200/10 px-3 text-sm font-medium text-amber-100 hover:bg-amber-200/15"
                onClick={() => void continueAsGuest()}
                disabled={isSyncing}
              >
                <UserPlus aria-hidden="true" className="h-4 w-4" />
                Guest Sync
              </button>
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-600 bg-stone-900 px-3 text-sm font-medium text-stone-100 hover:bg-stone-800"
                onClick={() => void visitWebHatcheryLogin()}
                disabled={isSyncing}
              >
                <LogIn aria-hidden="true" className="h-4 w-4" />
                Sign In
              </button>
            </>
          ) : (
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-600 bg-stone-900 px-3 text-sm font-medium text-stone-100 hover:bg-stone-800"
              onClick={() => void loadRemoteState()}
              disabled={isSyncing}
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Sync
            </button>
          )}
          {hasMergeableGuestSession ? (
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-teal-200/25 bg-teal-200/10 px-3 text-sm font-medium text-teal-100 hover:bg-teal-200/15"
              onClick={() => void mergeGuestSession()}
              disabled={isSyncing}
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Merge Guest
            </button>
          ) : null}
        </div>
      </div>
      {syncError ? (
        <p className="mt-3 text-sm text-rose-200">{syncError}</p>
      ) : null}
    </section>
  );
}
