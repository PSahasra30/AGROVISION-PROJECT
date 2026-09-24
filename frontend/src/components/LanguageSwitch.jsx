import { useLanguage, useT } from "../context/useLanguage";

export default function LanguageSwitch({ compact = false }) {
  const { language, setLanguage } = useLanguage();
  const t = useT();
  return (
    <label className={`language-switch ${compact ? "language-switch--compact" : ""}`}>
      <span className="sr-only">{t("language")}</span>
      <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t("language")}>
        <option value="en">{t("english")}</option>
        <option value="te">{t("telugu")}</option>
      </select>
    </label>
  );
}
