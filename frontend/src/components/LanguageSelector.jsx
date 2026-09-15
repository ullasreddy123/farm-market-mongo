import { useLanguage } from "../context/LanguageContext";
import { languages } from "../i18n";

export default function LanguageSelector({ className = "" }) {
  const { lang, changeLang } = useLanguage();

  return (
    <select
      className={`lang-select ${className}`}
      value={lang}
      onChange={(e) => changeLang(e.target.value)}
      aria-label="Select language"
    >
      {languages.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
