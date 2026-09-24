import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import AuthPage from "./pages/AuthPage";
import About from "./pages/About";
import Dashboard from "./pages/Dashboard";
import Detect from "./pages/Detect";
import History from "./pages/History";
import Result from "./pages/Result";
import { useAuth } from "./context/useAuth";
import { useT } from "./context/useLanguage";

function ProtectedLayout() {
  const { user, checking } = useAuth();
  const t = useT();
  if (checking) return <div className="full-screen-loading"><span className="loading-orbit" />{t("common.loading")}</div>;
  return user ? <Outlet /> : <Navigate to="/signin" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<AuthPage />} />
      <Route element={<ProtectedLayout />}>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="/detect" element={<Detect />} />
          <Route path="/history" element={<History />} />
          <Route path="/result/:predictionId" element={<Result />} />
          <Route path="/about" element={<About />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
