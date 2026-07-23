import { useState } from "react";
import { AttendanceProvider } from "./context/AttendanceContext";
import Header from "./components/Header";
import DashboardPage from "./pages/DashboardPage";
import HolidaysPage from "./pages/HolidaysPage";

type Page = "dashboard" | "holidays";

function AppContent() {
  const [page, setPage] = useState<Page>("dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentPage={page} onNavigate={setPage} />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {page === "dashboard" ? <DashboardPage /> : <HolidaysPage />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AttendanceProvider>
      <AppContent />
    </AttendanceProvider>
  );
}
