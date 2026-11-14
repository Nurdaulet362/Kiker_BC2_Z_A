import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import { Simulation } from "./simulation/Simulation";
import { LearningApp } from "./learning/LearningApp";
import {
  LANGUAGE_KEY,
  LanguageContext,
  PAGE_COPY,
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
      return saved === "ru" || saved === "en" ? saved : "en";
    } catch {
      return "en";
    }
  });
  React.useEffect(() => {
    document.documentElement.lang = language;
    document.title = PAGE_COPY[language].title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        PAGE_COPY[language].description,
      );
    try {
      setSessionItem(LANGUAGE_KEY, language);
    } catch {
      // The selected language is still available in this tab.
    }
  }, [language]);
  React.useEffect(() => {
    const update = () => {
      if (location.hash === "#practice") {
        // Replace the obsolete entry and notify both hash-based routers.
        location.replace("#lesson/revenue-cancelled");
        return;
      }
      setHash(location.hash);
    };
    addEventListener("hashchange", update);
    update();
    return () => removeEventListener("hashchange", update);
  }, []);
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {hash === "#practice" ? null : hash === "#trial" ? <Simulation /> : <LearningApp />}
    </LanguageContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
