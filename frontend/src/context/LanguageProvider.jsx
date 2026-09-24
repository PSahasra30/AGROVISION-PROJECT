import { useCallback, useEffect, useMemo, useState } from "react";
import { LanguageContext } from "./LanguageContext";
import { translations } from "../translations";

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem("agrovision.language") === "te" ? "te" : "en");
  const setLanguage = useCallback((nextLanguage) => {
    const value = nextLanguage === "te" ? "te" : "en";
    localStorage.setItem("agrovision.language", value);
    setLanguageState(value);
  }, []);
  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = translations[language].metaTitle;
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
