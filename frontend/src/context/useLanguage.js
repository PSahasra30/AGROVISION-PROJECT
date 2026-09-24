import { useCallback, useContext } from "react";
import { LanguageContext } from "./LanguageContext";
import { translations } from "../translations";

export const useLanguage = () => useContext(LanguageContext);

export const useT = () => {
  const { language } = useLanguage();
  return useCallback((path, values = {}) => {
    const value = path.split(".").reduce((entry, key) => entry?.[key], translations[language])
      ?? path.split(".").reduce((entry, key) => entry?.[key], translations.en)
      ?? path;
    return Object.entries(values).reduce((output, [key, replacement]) => output.replaceAll(`{${key}}`, replacement), value);
  }, [language]);
};
