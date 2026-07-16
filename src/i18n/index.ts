import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import pt from "./locales/pt.json";
import ja from "./locales/ja.json";
import zh from "./locales/zh.json";
import ko from "./locales/ko.json";
import it from "./locales/it.json";
import nl from "./locales/nl.json";
import ar from "./locales/ar.json";

const deviceLocales = Localization.getLocales();
const languageCode = deviceLocales[0]?.languageCode ?? "en";

const supportedLanguages = new Set(["en", "es", "fr", "de", "pt", "ja", "zh", "ko", "it", "nl", "ar"]);
const lng = supportedLanguages.has(languageCode) ? languageCode : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    pt: { translation: pt },
    ja: { translation: ja },
    zh: { translation: zh },
    ko: { translation: ko },
    it: { translation: it },
    nl: { translation: nl },
    ar: { translation: ar },
  },
  lng,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
