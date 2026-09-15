import { createContext, useContext, useState, useMemo, useCallback } from "react";
import { translate } from "../i18n";

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem("fm_lang") || "en");

  const changeLang = useCallback((code) => {
    setLang(code);
    localStorage.setItem("fm_lang", code);
  }, []);

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  const value = useMemo(() => ({ lang, changeLang, t }), [lang, changeLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
