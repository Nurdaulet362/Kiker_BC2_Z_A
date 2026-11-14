import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import { App } from "./App";
import { Simulation } from "./simulation/Simulation";
import { LearningApp } from "./learning/LearningApp";
import {
  LANGUAGE_KEY,
  LanguageContext,
  translate,
  type Language,
} from "./i18n";
import { getSessionItem, setSessionItem } from "./session-storage";
import "./styles.css";
import "./simulation/simulation.css";

function Root() {
  const [hash, setHash] = React.useState(location.hash);
  const [language, setLanguage] = React.useState<Language>(() => {
    try {
      const saved = getSessionItem(LANGUAGE_KEY);
      return saved === "ru" || saved === "en" ? saved : ["#trial", "#practice"].includes(location.hash) ? "en" : "ru";
    } catch {
      return ["#trial", "#practice"].includes(location.hash) ? "en" : "ru";
    }
  });
  React.useEffect(() => {
    document.documentElement.lang = language;
    document.title = hash !== "#trial" && hash !== "#practice" ? language === "ru" ? "Fix the Report — навыки работы с данными" : "Fix the Report — Learn to make sense of data" : translate(
      language,
      "Fix the Report — Spreadsheet interview practice",
    );
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        hash !== "#trial" && hash !== "#practice" ? language === "ru" ? "Учитесь понимать отчёты на практике. Короткие задания, разбор ошибок и личный учебный маршрут." : "Learn to understand reports through hands-on lessons, clear feedback and a personal learning path." : translate(
          language,
          "Prepare for a sales operations spreadsheet assessment. Repair a revenue report, explain a budget decision, and get feedback from 30 checks. Free browser practice.",
        ),
      );
    try {
      setSessionItem(LANGUAGE_KEY, language);
    } catch {
      // The selected language is still available in this tab.
    }
  }, [language, hash]);
  React.useEffect(() => {
    const update = () => setHash(location.hash);
    addEventListener("hashchange", update);
    return () => removeEventListener("hashchange", update);
  }, []);
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {hash === "#practice" ? <App /> : hash === "#trial" ? <Simulation /> : <LearningApp />}
    </LanguageContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
