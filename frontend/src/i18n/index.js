import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import kn from "./locales/kn.json";
import hi from "./locales/hi.json";
import te from "./locales/te.json";
import ta from "./locales/ta.json";
import ml from "./locales/ml.json";

const savedLang = localStorage.getItem("examHub_language") || "en";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      kn: { translation: kn },
      hi: { translation: hi },
      te: { translation: te },
      ta: { translation: ta },
      ml: { translation: ml },
    },
    lng: savedLang,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("examHub_language", lng);
});

export default i18n;
