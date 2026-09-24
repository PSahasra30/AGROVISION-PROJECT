import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(() => Boolean(sessionStorage.getItem("agrovision.token")));

  useEffect(() => {
    const token = sessionStorage.getItem("agrovision.token");
    if (!token) return undefined;
    let active = true;
    api.get("/api/auth/me")
      .then(({ data }) => { if (active) setUser(data); })
      .catch(() => { sessionStorage.removeItem("agrovision.token"); if (active) setUser(null); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onExpired = () => { setUser(null); setChecking(false); };
    window.addEventListener("agrovision:session-expired", onExpired);
    return () => window.removeEventListener("agrovision:session-expired", onExpired);
  }, []);

  const signIn = useCallback(async (email, password, isRegister = false) => {
    const { data } = await api.post(isRegister ? "/api/auth/register" : "/api/auth/login", { email, password });
    sessionStorage.setItem("agrovision.token", data.access_token);
    setUser(data.user);
  }, []);

  const signOut = useCallback(() => {
    sessionStorage.removeItem("agrovision.token");
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, checking, signIn, signOut }), [user, checking, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
