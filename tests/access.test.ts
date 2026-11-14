import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { canAccessLesson, isDemoAccess, PRO_INTEREST_URL, resolveAccessRoute } from "../src/access";
import { LESSONS } from "../src/learning/model";

describe("build-time demo access", () => {
  it.each([undefined, null, "", "false", "TRUE", "True", "1", 1, true, false, {}, ["true"]])(
    "keeps demo access closed for %s", value => expect(isDemoAccess(value)).toBe(false),
  );
  it("opens demo access only for the exact build flag", () => {
    expect(isDemoAccess("true")).toBe(true);
    expect(PRO_INTEREST_URL).toBe("");
  });
  it.each([false, true])("keeps three foundation lessons open with demo=%s", demo => {
    const foundation = LESSONS.filter(lesson => lesson.level === "foundation");
    expect(foundation).toHaveLength(3);
    for (const lesson of foundation) {
      expect(canAccessLesson(lesson.level, demo)).toBe(true);
      expect(resolveAccessRoute(`#lesson/${lesson.id}`, demo)).toBe(`#lesson/${lesson.id}`);
    }
    expect(resolveAccessRoute("#practice", demo)).toBe("#lesson/revenue-cancelled");
  });
  it.each([false, true])("gates exactly the three practice lessons and Work Trial with demo=%s", demo => {
    const practice = LESSONS.filter(lesson => lesson.level === "practice");
    expect(practice).toHaveLength(3);
    for (const lesson of practice) {
      expect(canAccessLesson(lesson.level, demo)).toBe(demo);
      expect(resolveAccessRoute(`#lesson/${lesson.id}`, demo)).toBe(demo ? `#lesson/${lesson.id}` : "#pricing");
    }
    expect(resolveAccessRoute("#trial", demo)).toBe(demo ? "#trial" : "#pricing");
    for (const hash of ["", "#learn", "#progress", "#pricing", "#review/saved-id", "#lesson/unknown"]) {
      expect(resolveAccessRoute(hash, demo)).toBe(hash);
    }
  });
});

describe("external interest link", () => {
  afterEach(() => {
    vi.doUnmock("../src/access");
    vi.resetModules();
  });

  for (const language of ["en", "ru"] as const) {
    it(`hides the interest action when no destination is configured in ${language}`, async () => {
      vi.doMock("../src/access", () => ({ PRO_INTEREST_URL: "" }));
      const { Pricing } = await import("../src/pricing/Pricing");
      const { LanguageContext } = await import("../src/i18n");
      const html = renderToStaticMarkup(createElement(LanguageContext.Provider, {
        value: { language, setLanguage: () => {} },
      }, createElement(Pricing)));
      expect(html).not.toContain(language === "en" ? "Get notified" : "Узнать о запуске");
      expect(html).not.toMatch(/<(form|input)\b/);
      expect(html).toContain(language === "en"
        ? "Payments are not connected yet. This is a product test."
        : "Оплата пока не подключена. Это тест продукта.");
    });

    it(`renders the exact configured destination after the payment notice in ${language}`, async () => {
      const url = "https://example.com/fix-the-report-interest";
      vi.doMock("../src/access", () => ({ PRO_INTEREST_URL: url }));
      const { Pricing } = await import("../src/pricing/Pricing");
      const { LanguageContext } = await import("../src/i18n");
      const html = renderToStaticMarkup(createElement(LanguageContext.Provider, {
        value: { language, setLanguage: () => {} },
      }, createElement(Pricing)));
      expect(html).toContain(`href="${url}"`);
      expect(html).toContain(language === "en" ? "Get notified" : "Узнать о запуске");
      expect(html.indexOf("pricing-payment-note")).toBeLessThan(html.indexOf(`href="${url}"`));
      expect(html).not.toMatch(/<(form|input)\b/);
    });
  }
});
