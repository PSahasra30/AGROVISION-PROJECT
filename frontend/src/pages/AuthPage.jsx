import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import LanguageSwitch from "../components/LanguageSwitch";
import { apiErrorKey } from "../api";
import { useAuth } from "../context/useAuth";
import { useT } from "../context/useLanguage";

export default function AuthPage() {
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const t = useT();

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError(t("auth.invalidEmail")); return; }
    if (!password) { setError(t("auth.passwordRequired")); return; }
    if (registering && password.length < 12) { setError(t("auth.passwordTooShort")); return; }
    setBusy(true);
    try {
      await signIn(email, password, registering);
      navigate("/", { replace: true });
    } catch (requestError) {
      const status = requestError.response?.status;
      if (status === 409) setError(t("auth.accountExists"));
      else if (status === 401) setError(t("auth.invalidCredentials"));
      else setError(t(apiErrorKey(requestError)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-top"><div className="brand-lockup"><span className="brand-mark"><Icon name="leaf" size={23} /></span><span><strong>{t("brand")}</strong><small>{t("tagline")}</small></span></div><LanguageSwitch compact /></div>
      <div className="auth-grid">
        <section className="auth-story">
          <div className="eyebrow"><span className="eyebrow-dot" />{t("auth.eyebrow")}</div>
          <h1>{t("home.title")}</h1>
          <p>{t("home.subtitle")}</p>
          <div className="auth-story-mark"><Icon name="sprout" size={62} /></div>
          <div className="auth-stat-line"><span>38</span><span>{t("home.coverage")}</span></div>
        </section>
        <section className="auth-card">
          <div className="section-kicker">{t("auth.eyebrow")}</div>
          <h2>{t(registering ? "auth.join" : "auth.welcome")}</h2>
          <p className="muted">{t(registering ? "auth.createHint" : "auth.signInHint")}</p>
          <form className="auth-form" onSubmit={submit} noValidate>
            <label>{t("common.email")}<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("auth.emailPlaceholder")} required maxLength={254} /></label>
            <label>{t("common.password")}<input type="password" autoComplete={registering ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t("auth.passwordPlaceholder")} required minLength={registering ? 12 : 1} maxLength={128} /></label>
            {registering && <p className="field-hint">{t("auth.passwordRule")}</p>}
            {error && <div className="inline-alert" role="alert">{error}</div>}
            <button className="button button-primary button-wide" type="submit" disabled={busy}>
              {busy ? t("common.loading") : t(registering ? "auth.submitRegister" : "auth.submitLogin")}<Icon name="arrow" size={18} />
            </button>
          </form>
          <button className="text-button auth-toggle" type="button" onClick={() => { setRegistering((value) => !value); setError(""); }}>
            {t(registering ? "auth.switchLogin" : "auth.switchRegister")}
          </button>
          <div className="auth-privacy"><Icon name="shield" size={16} />{t("auth.privacy")}</div>
        </section>
      </div>
      <div className="auth-footer">{t("about.support")}</div>
    </main>
  );
}
