import { lazy, Suspense, useState } from "react";
import { AttendanceProvider } from "./context/AttendanceContext";
import Header from "./components/Header";
import DashboardPage from "./pages/DashboardPage";

const HolidaysPage = lazy(() => import("./pages/HolidaysPage"));

type Page = "dashboard" | "holidays";

const AppContent = () => {
  const [page, setPage] = useState<Page>("dashboard");

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-200">
      <Header currentPage={page} onNavigate={setPage} />
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
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
  return (
    <AttendanceProvider>
      <AppContent />
    </AttendanceProvider>
  );
};

export default App;
