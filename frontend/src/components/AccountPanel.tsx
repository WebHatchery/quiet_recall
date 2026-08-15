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
  const legacyImportPending = useRecallStore(
    (state) => state.legacyImportPending,
  );
  const pendingIntentCount = useRecallStore(
    (state) => state.pendingIntents.length,
  );
  const continueAsGuest = useRecallStore((state) => state.continueAsGuest);
  const mergeGuestSession = useRecallStore((state) => state.mergeGuestSession);
  const visitWebHatcheryLogin = useRecallStore(
    (state) => state.visitWebHatcheryLogin,
  );
  const loadRemoteState = useRecallStore((state) => state.loadRemoteState);
  const importLegacyProgress = useRecallStore(
    (state) => state.importLegacyProgress,
  );
  const discardLegacyProgress = useRecallStore(
    (state) => state.discardLegacyProgress,
  );

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
            <div
              className="flex flex-wrap gap-2"
              aria-label="Guest progress choice"
            >
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-teal-200/25 bg-teal-200/10 px-3 text-sm font-medium text-teal-100 hover:bg-teal-200/15"
                onClick={() => void mergeGuestSession("merge")}
                disabled={isSyncing}
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                Combine Both
              </button>
              <button
                type="button"
                className="min-h-10 rounded-md border border-stone-600 px-3 text-sm text-stone-100"
                onClick={() => void mergeGuestSession("keep_guest")}
                disabled={isSyncing}
              >
                Use Guest Progress
              </button>
              <button
                type="button"
                className="min-h-10 rounded-md border border-stone-600 px-3 text-sm text-stone-100"
                onClick={() => void mergeGuestSession("keep_account")}
                disabled={isSyncing}
              >
                Keep Account Progress
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {syncError ? (
        <p className="mt-3 text-sm text-rose-200">{syncError}</p>
      ) : null}
      {pendingIntentCount > 0 ? (
        <p className="mt-3 text-sm text-amber-100">
          {pendingIntentCount} study action{pendingIntentCount === 1 ? "" : "s"}{" "}
          waiting to sync. They will retry when you are online.
        </p>
      ) : null}
      {isAuthenticated && legacyImportPending ? (
        <div className="mt-4 rounded-md border border-amber-200/25 bg-amber-200/10 p-3">
          <p className="text-sm text-amber-50">
            Quiet Recall found progress from the earlier local prototype. Import
            it into this account, or keep the account&apos;s existing progress?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-10 rounded-md bg-amber-100 px-3 text-sm font-semibold text-stone-950"
              onClick={() => void importLegacyProgress()}
              disabled={isSyncing}
            >
              Import Local Progress
            </button>
            <button
              type="button"
              className="min-h-10 rounded-md border border-stone-600 px-3 text-sm text-stone-100"
              onClick={() => void discardLegacyProgress()}
              disabled={isSyncing}
            >
              Keep Account Progress
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
