import { useContext } from "react";
import { ArrowRight, Check } from "lucide-react";
import { PRO_INTEREST_URL } from "../access";
import { LanguageContext } from "../i18n";
import "./pricing.css";

export function Pricing() {
  const { language } = useContext(LanguageContext);
  const c = (en: string, ru: string) => language === "ru" ? ru : en;
  return <section className="pricing-screen" data-testid="pricing-screen" aria-labelledby="pricing-heading">
    <div className="pricing-heading">
      <p className="pricing-eyebrow">{c("YOUR NEXT STEP", "ВАШ СЛЕДУЮЩИЙ ШАГ")}</p>
      <h1 id="pricing-heading" tabIndex={-1}>{c("Choose your practice plan", "Выберите план обучения")}</h1>
      <p>{c("Build confidence with one report at a time.", "Практикуйтесь и становитесь увереннее с каждым отчётом.")}</p>
    </div>
    <div className="pricing-plans">
      <section className="pricing-card pricing-card-free" aria-labelledby="pricing-free-heading">
        <h2 id="pricing-free-heading">Free</h2>
        <p className="pricing-price"><strong>$0</strong><span>{c("Free", "Бесплатно")}</span></p>
        <ul className="pricing-features">
          <li><Check size={18} aria-hidden="true" />{c("3 foundation lessons", "3 базовых занятия")}</li>
          <li><Check size={18} aria-hidden="true" />{c("Repeat the foundation lessons as often as you need", "Повторяйте базовые занятия сколько нужно")}</li>
        </ul>
        <a className="pricing-action pricing-action-free" href="#lesson/revenue-cancelled">{c("Start free lesson", "Начать бесплатное занятие")}<ArrowRight size={17} aria-hidden="true" /></a>
      </section>
      <section className="pricing-card pricing-card-pro" aria-labelledby="pricing-pro-heading">
        <div className="pricing-card-heading"><h2 id="pricing-pro-heading">Pro</h2><span>{c("Product test", "Тест продукта")}</span></div>
        <p className="pricing-price"><strong>$19</strong><span>{c("/month", "/месяц")}</span></p>
        <ul className="pricing-features">
          <li><Check size={18} aria-hidden="true" />{c("3 practice-level lessons", "3 занятия уровня «Закрепление»")}</li>
          <li><Check size={18} aria-hidden="true" />{c("Work Trial", "Рабочее задание (Work Trial)")}</li>
        </ul>
        <div className="pricing-interest">
          <p className="pricing-payment-note">{c("Payments are not connected yet. This is a product test.", "Оплата пока не подключена. Это тест продукта.")}</p>
          {PRO_INTEREST_URL && <a className="pricing-action pricing-action-pro" href={PRO_INTEREST_URL} target="_blank" rel="noopener noreferrer">{c("Get notified", "Узнать о запуске")}<ArrowRight size={17} aria-hidden="true" /></a>}
        </div>
      </section>
    </div>
  </section>;
}

export function DemoAccessBanner() {
  const { language } = useContext(LanguageContext);
  return <div className="pro-demo-banner" data-testid="demo-access-banner" role="note">
    {language === "ru" ? "Демо-доступ — не покупка" : "Demo access — not a purchase"}
  </div>;
}
