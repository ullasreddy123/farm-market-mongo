import en from "./locales/en.json";
import hi from "./locales/hi.json";
import kn from "./locales/kn.json";
import te from "./locales/te.json";
import ta from "./locales/ta.json";
import ml from "./locales/ml.json";

export const translations = { en, hi, kn, te, ta, ml };

export const languages = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "te", label: "తెలుగు" },
  { code: "ta", label: "தமிழ்" },
  { code: "ml", label: "മലയാളം" },
];

export const translate = (langCode, key, vars = {}) => {
  const dict = translations[langCode] || translations.en;
  let text = dict[key] ?? translations.en[key] ?? key;
  Object.keys(vars).forEach((v) => {
    text = text.replace(`{${v}}`, vars[v]);
  });
  return text;
};
