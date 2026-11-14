import { createContext, Fragment, useContext, type ReactNode } from "react";
import russian from "./locales/ru.json";

export type Language = "en" | "ru";
export const LANGUAGE_KEY = "fix-the-report.language";
type Values = Record<string, string | number>;
export type Translate = (message: string, values?: Values) => string;
const messages: Record<string, string> = russian;

export function translate(
  language: Language,
  message: string,
  values: Values = {},
) {
  const translation =
    language === "ru" && Object.hasOwn(messages, message)
      ? messages[message]
      : message;
  return translation.replace(/\{(\w+)\}/g, (token, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : token,
  );
}

export const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
}>({ language: "en", setLanguage: () => {} });

export function useTranslation() {
  const { language } = useContext(LanguageContext);
  return (message: string, values?: Values) =>
    translate(language, message, values);
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useContext(LanguageContext);
  const t = useTranslation();
  return (
    <div className="language-switcher" role="group" aria-label={t("Language")}>
      <button
        type="button"
        lang="en"
        aria-label="English"
        aria-pressed={language === "en"}
        onClick={() => setLanguage("en")}
      >
        EN
      </button>
      <button
        type="button"
        lang="ru"
        aria-label="Русский"
        aria-pressed={language === "ru"}
        onClick={() => setLanguage("ru")}
      >
        RU
      </button>
    </div>
  );
}

export function LocalizedText({
  message,
  tags = {},
}: {
  message: string;
  tags?: Record<string, (text: string) => ReactNode>;
}) {
  const t = useTranslation();
  const parts = t(message).split(/<(\w+)>([^<>]*)<\/\1>/);
  return (
    <>
      {parts.map((part, index) => {
        if (index % 3 === 1) return null;
        return (
          <Fragment key={index}>
            {index % 3 === 2
              ? (tags[parts[index - 1]]?.(part) ?? <strong>{part}</strong>)
              : part}
          </Fragment>
        );
      })}
    </>
  );
}

// Saved reviews and workers use the original English messages. Translate them
// at display time so old results change language without rewriting their data.
const feedbackPatterns = [
  [/^Variation (\d+)$/, "Variation {n}", ["n"]],
  [/^Choose a status for row (\d+)\.$/, "Choose a status for row {n}.", ["n"]],
  [
    /^Row (\d+) needs an amount from 0 to 1,000,000 with up to two decimal places\.$/,
    "Row {n} needs an amount from 0 to 1,000,000 with up to two decimal places.",
    ["n"],
  ],
  [
    /^(Email|Ads) leads must be a whole number between (\d+) and 1,000,000\. Paid orders cannot exceed leads\.$/,
    "{channel} leads must be a whole number between {paid} and 1,000,000. Paid orders cannot exceed leads.",
    ["channel", "paid"],
  ],
  [
    /^(Email|Ads) spend must be from 0 to 1,000,000, with up to two decimal places\.$/,
    "{channel} spend must be from 0 to 1,000,000, with up to two decimal places.",
    ["channel"],
  ],
  [
    /^Use cells on this sheet, from A1 to ([A-D]101)\.$/,
    "Use cells on this sheet, from A1 to {end}.",
    ["end"],
  ],
  [
    /^([A-Z][A-Z0-9_.]*) is outside this exercise\. Try SUMIF, SUM or IF\.$/,
    "{fn} is outside this exercise. Try SUMIF, SUM or IF.",
    ["fn"],
  ],
  [
    /^Use cells from A1 to ([A-D]101)\. This exercise has room for 100 data rows\.$/,
    "Use cells from A1 to {end}. This exercise has room for 100 data rows.",
    ["end"],
  ],
  [
    /^(Email|Ads): a small controlled test$/,
    "{channel}: a small controlled test",
    ["channel"],
  ],
] as const;

export function feedback(t: Translate, message: string) {
  for (const [pattern, template, keys] of feedbackPatterns) {
    const match = message.match(pattern);
    if (match)
      return t(
        template,
        Object.fromEntries(
          keys.map((key, index) => [
            key,
            key === "channel" ? t(match[index + 1]) : match[index + 1],
          ]),
        ),
      );
  }
  return t(message);
}
