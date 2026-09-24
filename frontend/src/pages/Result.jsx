import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, apiErrorKey } from "../api";
import Icon from "../components/Icon";
import ProtectedImage from "../components/ProtectedImage";
import { useLanguage, useT } from "../context/useLanguage";

function labelText(value) {
  return String(value || "").replace("___", " · ").replaceAll("_", " ").replaceAll(",", "").replace(/\s+/g, " ").trim();
}

function KnowledgeSection({ icon, title, value, emptyText }) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <section className="knowledge-card">
      <div className="knowledge-title"><span><Icon name={icon} size={17} /></span><h3>{title}</h3></div>
      {values.length ? Array.isArray(value) ? <ul>{values.map((entry) => <li key={entry}>{entry}</li>)}</ul> : <p>{value}</p> : <p className="muted knowledge-empty">{emptyText}</p>}
    </section>
  );
}

export default function Result() {
  const { predictionId } = useParams();
  const location = useLocation();
  const [prediction, setPrediction] = useState(location.state?.prediction || null);
  const [loading, setLoading] = useState(!location.state?.prediction);
  const [error, setError] = useState("");
  const { language } = useLanguage();
  const t = useT();

  useEffect(() => {
    let active = true;
    api.get(`/api/predictions/${predictionId}`, { params: { language } })
      .then(({ data }) => { if (active) { setPrediction(data); setError(""); } })
      .catch((requestError) => { if (active) setError(t(apiErrorKey(requestError))); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [predictionId, language, t]);

  if (loading || (prediction && prediction.prediction_id !== predictionId)) return <div className="state-panel"><span className="loading-orbit" />{t("common.loading")}</div>;
  if (!prediction || error) return <div className="state-panel state-panel--error"><Icon name="info" size={21} /><p>{error || t("result.notFound")}</p><Link className="button button-secondary" to="/history">{t("common.back")}</Link></div>;

  const { recommendations } = prediction;
  const isHealthy = prediction.status === "healthy";
  const statusKey = prediction.status === "healthy" ? "result.healthy" : prediction.status === "uncertain" ? "result.uncertain" : "result.diseased";
  const percent = Math.round(prediction.confidence * 100);
  return (
    <div className="page-stack result-page">
      <header className="page-heading page-heading--row"><div><div className="eyebrow"><span className="eyebrow-dot" />{t("result.eyebrow")}</div><h1>{t("result.title")}</h1><p>{t("result.saved")} · {prediction.model_version}</p></div><Link className="button button-secondary" to="/history"><Icon name="back" size={17} />{t("history.title")}</Link></header>
      <section className={`result-hero result-hero--${prediction.status}`}>
        <div className="result-photo-wrap"><ProtectedImage path={prediction.image_url} alt={t("detect.preview")} className="result-photo" /></div>
        <div className="result-main">
          <div className={`status-pill status-pill--${prediction.status}`}><span className="status-dot status-dot--inherit" />{t(statusKey)}</div>
          <div className="result-crop-label">{t("result.crop")}</div><div className="result-crop-name">{labelText(recommendations.crop || prediction.disease.split("___")[0])}</div>
          <h2>{labelText(prediction.disease.split("___")[1] || prediction.disease)}</h2>
          <div className="confidence-block"><div className="confidence-head"><span>{t("result.confidence")}</span><strong>{percent}%</strong></div><div className="confidence-track"><span style={{ width: `${percent}%` }} /></div></div>
          {prediction.status === "uncertain" && <p className="uncertain-note"><Icon name="info" size={16} />{t("result.uncertainNote")}</p>}
        </div>
        <div className="top-predictions">
          <h3>{t("result.topThree")}</h3>
          {prediction.top_predictions.map((item, index) => <div className="top-prediction-row" key={item.class_id}>
            <span className="top-number">0{index + 1}</span><span className="top-prediction-name">{labelText(item.disease)}</span><strong>{(item.probability * 100).toFixed(1)}%</strong>
          </div>)}
        </div>
      </section>

      <section className="knowledge-section">
        <div className="section-heading"><div><div className="section-kicker">{t("result.disease")}</div><h2>{t("result.overview")}</h2></div></div>
        <div className="knowledge-grid">
          <KnowledgeSection icon="info" title={t("result.overview")} value={isHealthy ? t("result.healthyOverview") : recommendations.description} emptyText={t("common.notDocumented")} />
          <KnowledgeSection icon="scan" title={t("result.symptoms")} value={recommendations.symptoms} emptyText={isHealthy ? t("result.healthySymptoms") : t("result.symptomsUnavailable")} />
          <KnowledgeSection icon="sprout" title={t("result.treatment")} value={isHealthy ? t("result.healthyTreatment") : recommendations.treatment} emptyText={isHealthy ? t("result.healthyTreatment") : t("common.notDocumented")} />
          <KnowledgeSection icon="check" title={t("result.prevention")} value={recommendations.prevention} emptyText={t("common.notDocumented")} />
          <KnowledgeSection icon="leaf" title={t("result.practices")} value={recommendations.recommended_practices} emptyText={t("result.practicesUnavailable")} />
          <KnowledgeSection icon="sprout" title={t("result.organic")} value={recommendations.organic_options} emptyText={t("common.notDocumented")} />
          {!isHealthy && recommendations.severity && <KnowledgeSection icon="info" title={t("result.severity")} value={recommendations.severity} emptyText={t("common.notDocumented")} />}
        </div>
      </section>
      <div className="disclaimer-card"><Icon name="info" size={19} /><span>{recommendations.disclaimer || t("result.disclaimer")}</span></div>
      <div className="result-actions"><Link className="button button-primary" to="/detect">{t("result.newAnalysis")}<Icon name="arrow" size={17} /></Link></div>
    </div>
  );
}
