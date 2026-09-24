import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorKey } from "../api";
import Icon from "../components/Icon";
import PredictionCard from "../components/PredictionCard";
import { useLanguage, useT } from "../context/useLanguage";

const steps = [
  ["upload", "home.step1Title", "home.step1"],
  ["scan", "home.step2Title", "home.step2"],
  ["sprout", "home.step3Title", "home.step3"],
];

export default function Dashboard() {
  const t = useT();
  const { language } = useLanguage();
  const [health, setHealth] = useState(null);
  const [recent, setRecent] = useState([]);
  const [historyError, setHistoryError] = useState(false);
  useEffect(() => {
    let active = true;
    api.get("/api/health").then(({ data }) => { if (active) setHealth(data); }).catch(() => { if (active) setHealth({ status: "degraded", components: {} }); });
    api.get("/api/predictions/history", { params: { page: 1, limit: 3, language } })
      .then(({ data }) => { if (active) setRecent(data.items); })
      .catch(() => { if (active) setHistoryError(true); });
    return () => { active = false; };
  }, [language]);

  const modelUnavailable = health && health.components?.model !== "ready";
  return (
    <div className="page-stack">
      {modelUnavailable && <div className="system-banner"><span className="banner-indicator" /><span><strong>{t("common.backendUnavailable")}</strong><small>{t("errors.modelUnavailable")}</small></span></div>}
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" />{t("home.eyebrow")}</div>
          <h1>{t("home.title")}</h1>
          <p>{t("home.subtitle")}</p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/detect">{t("home.start")}<Icon name="arrow" size={18} /></Link>
            <Link className="button button-quiet" to="/history">{t("home.history")}</Link>
          </div>
          <div className="hero-coverage"><Icon name="check" size={15} />{t("home.coverage")}</div>
        </div>
        <div className="hero-illustration" aria-hidden="true">
          <div className="illustration-orbit orbit-one" /><div className="illustration-orbit orbit-two" />
          <div className="leaf-plate"><Icon name="leaf" size={87} /></div>
          <span className="illustration-tag tag-top"><Icon name="scan" size={15} /> 38 classes</span>
          <span className="illustration-tag tag-bottom"><span className="eyebrow-dot" /> Image analysis</span>
        </div>
      </section>

      <section className="metrics-row" aria-label={t("home.evaluationTitle")}>
        <div className="metric-card"><span>{t("home.accuracy")}</span><strong>97.82%</strong><small>{t("home.modelName")}</small></div>
        <div className="metric-card"><span>{t("home.top3")}</span><strong>99.85%</strong><small>{t("home.testSamples")}: 8,154</small></div>
        <div className="metric-card metric-card--baseline"><span>{t("home.baseline")}</span><strong>97.15%</strong><small>{t("home.accuracy")}</small></div>
      </section>
      <p className="metrics-footnote">{t("home.metricNote")}</p>

      <section className="workflow-section">
        <div className="section-heading"><div><div className="section-kicker">{t("home.modelLabel")}</div><h2>{t("home.modelName")}</h2></div><span className="model-chip">PlantVillage · 38</span></div>
        <div className="workflow-grid">
          {steps.map(([icon, title, body], index) => <article className="workflow-card" key={title}>
            <div className="workflow-index">0{index + 1}</div><span className="workflow-icon"><Icon name={icon} size={20} /></span>
            <h3>{t(title)}</h3><p>{t(body)}</p>
          </article>)}
        </div>
      </section>

      <section className="recent-section">
        <div className="section-heading"><div><div className="section-kicker">{t("home.recent")}</div><h2>{t("history.title")}</h2></div><Link className="text-link" to="/history">{t("home.history")}<Icon name="arrow" size={16} /></Link></div>
        {recent.length ? <div className="history-list">{recent.map((item) => <PredictionCard key={item.prediction_id} item={item} />)}</div>
          : <div className="quiet-empty"><Icon name="history" size={20} /><span>{historyError ? t(apiErrorKey({ response: { status: 503 } })) : t("home.noRecent")}</span></div>}
      </section>
    </div>
  );
}
