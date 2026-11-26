import { lazy, Suspense, useState } from "react";
import { AttendanceProvider } from "./context/AttendanceContext";
import Header from "./components/Header";
import StatusBanners from "./components/StatusBanners";
import DashboardPage from "./pages/DashboardPage";
import type { AppMode } from "./types";
import { loadMode, saveMode } from "./utils/storage";

const HolidaysPage = lazy(() => import("./pages/HolidaysPage"));

type Page = "dashboard" | "holidays";

const AppContent = ({
  page,
  setPage,
  onToggleMode,
}: {
  page: Page;
  setPage: (p: Page) => void;
  onToggleMode: () => void;
}) => {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-200">
      <Header
        currentPage={page}
        onNavigate={setPage}
        onToggleMode={onToggleMode}
      />
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <StatusBanners />
        <div key={page} className="animate-fade-in-up">
          {page === "dashboard" ? (
            <DashboardPage />
          ) : (
            <Suspense
              fallback={
                <div className="py-16 text-center text-zinc-600 text-sm">
                  Loading…
                </div>
              }
            >
              <HolidaysPage />
            </Suspense>
          )}
        </div>
      </main>
    </div>
  );
};

const App = () => {
  const [mode, setMode] = useState<AppMode>(() => loadMode());
  // Page lives above the provider so switching mode doesn't reset it
  const [page, setPage] = useState<Page>("dashboard");

  const toggleMode = () => {
    const next: AppMode = mode === "cycle" ? "quarter" : "cycle";
    saveMode(next);
    setMode(next);
  };

  // key remounts the provider so each mode loads its own stored data
  return (
    <AttendanceProvider key={mode} mode={mode}>
      <AppContent page={page} setPage={setPage} onToggleMode={toggleMode} />
    </AttendanceProvider>
  );
};

export default App;
