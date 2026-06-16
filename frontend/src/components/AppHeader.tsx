import {
  BarChart3,
  BookOpen,
  Home,
  Moon,
  RefreshCw,
  UserRound,
} from "lucide-react";
import type { PortalView } from "../stores/useRecallStore";
import { useRecallStore } from "../stores/useRecallStore";

const tabs: { id: PortalView; label: string; icon: typeof Home }[] = [
  { id: "tonight", label: "Tonight", icon: Home },
  { id: "progress", label: "Progress", icon: BarChart3 },
  { id: "library", label: "Library", icon: BookOpen },
];

export function AppHeader() {
  const activeView = useRecallStore((state) => state.activeView);
  const setView = useRecallStore((state) => state.setView);
  const isGuest = useRecallStore((state) => state.isGuest);
  const isAuthenticated = useRecallStore((state) => state.isAuthenticated);
  const authDisplayName = useRecallStore((state) => state.authDisplayName);
  const isSyncing = useRecallStore((state) => state.isSyncing);

  return (
    <header className="border-b border-stone-700/40 bg-[#0b0d12]/80 backdrop-blur">
      <div className="mx-auto flex min-h-20 w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-teal-200/20 bg-teal-200/10 text-teal-100">
            <Moon aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-teal-100/70">
              Quiet Recall
            </p>
            <h1 className="text-xl font-semibold text-stone-50">
              Bedtime Japanese review
            </h1>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <nav
            aria-label="Portal sections"
            className="grid grid-cols-3 rounded-md border border-stone-700/70 bg-stone-950/70 p-1"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`flex min-h-10 items-center justify-center gap-2 rounded px-3 text-sm transition ${
                    selected
                      ? "bg-stone-100 text-stone-950"
                      : "text-stone-300 hover:bg-stone-800 hover:text-stone-50"
                  }`}
                  onClick={() => setView(tab.id)}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex min-h-10 items-center gap-2 rounded-md border border-stone-700/70 bg-stone-950/70 px-3 text-sm text-stone-300">
            {isSyncing ? (
              <RefreshCw
                aria-hidden="true"
                className="h-4 w-4 animate-spin text-teal-100"
              />
            ) : (
              <UserRound
                aria-hidden="true"
                className="h-4 w-4 text-stone-400"
              />
            )}
            <span>
              {authDisplayName ?? (isAuthenticated ? "Signed in" : "Local")}
            </span>
            {isGuest ? <span className="text-amber-100">Guest</span> : null}
          </div>
        </div>
      </div>
    </header>
  );
}
