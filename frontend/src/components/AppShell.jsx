import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Icon from "./Icon";
import LanguageSwitch from "./LanguageSwitch";
import { useAuth } from "../context/useAuth";
import { useT } from "../context/useLanguage";

const navItems = [
  ["/", "home", "nav.overview", true],
  ["/detect", "scan", "nav.detect"],
  ["/history", "history", "nav.history"],
  ["/about", "info", "nav.about"],
];

export default function AppShell() {
  const { user, signOut } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const leave = () => { signOut(); navigate("/signin", { replace: true }); };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand-lockup">
          <span className="brand-mark"><Icon name="leaf" size={22} /></span>
          <span><strong>{t("brand")}</strong><small>{t("tagline")}</small></span>
        </NavLink>
        <div className="sidebar-label">{t("nav.overview")}</div>
        <nav className="primary-nav" aria-label={t("nav.overview")}>
          {navItems.map(([to, icon, key, exact]) => (
            <NavLink key={to} to={to} end={exact} className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`}>
              <Icon name={icon} size={19} /><span>{t(key)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note"><Icon name="shield" size={17} /><span>{t("auth.privacy")}</span></div>
          <button className="user-profile" type="button" onClick={leave} title={t("common.signOut")}>
            <span className="user-avatar">{user?.email?.[0]?.toUpperCase() || "A"}</span>
            <span className="user-email">{user?.email}</span>
            <span className="signout-label">{t("common.signOut")}</span>
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="topbar-mobile-brand"><span className="brand-mark"><Icon name="leaf" size={19} /></span><strong>{t("brand")}</strong></div>
          <div className="topbar-spacer" />
          <LanguageSwitch compact />
          <span className="user-email topbar-user">{user?.email}</span>
          <button className="icon-button signout-mobile" type="button" onClick={leave} aria-label={t("common.signOut")}><Icon name="shield" size={18} /></button>
        </header>
        <main className="page-content"><Outlet /></main>
        <nav className="mobile-nav" aria-label={t("nav.overview")}>
          {navItems.map(([to, icon, key, exact]) => (
            <NavLink key={to} to={to} end={exact} className={({ isActive }) => `mobile-nav-link ${isActive ? "is-active" : ""}`}>
              <Icon name={icon} size={19} /><span>{t(key)}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
