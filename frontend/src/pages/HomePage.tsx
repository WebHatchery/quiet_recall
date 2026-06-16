import { useEffect } from "react";
import { AppHeader } from "../components/AppHeader";
import { LibraryView } from "../components/LibraryView";
import { ProgressView } from "../components/ProgressView";
import { TonightScreen } from "../components/TonightScreen";
import { useRecallStore } from "../stores/useRecallStore";

export function HomePage() {
  const activeView = useRecallStore((state) => state.activeView);
  const refreshAuthStatus = useRecallStore((state) => state.refreshAuthStatus);

  useEffect(() => {
    refreshAuthStatus();
  }, [refreshAuthStatus]);

  return (
    <div className="min-h-screen bg-[#08090d] text-stone-100">
      <AppHeader />
      {activeView === "tonight" ? <TonightScreen /> : null}
      {activeView === "progress" ? <ProgressView /> : null}
      {activeView === "library" ? <LibraryView /> : null}
    </div>
  );
}
