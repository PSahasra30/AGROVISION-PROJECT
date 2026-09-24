import { useNavigate } from "react-router-dom";
import Icon from "./Icon";
import ProtectedImage from "./ProtectedImage";
import { useLanguage, useT } from "../context/useLanguage";

function prettyLabel(value) {
  return String(value || "").replace("___", " · ").replaceAll("_", " ").replaceAll(",", "").replace(/\s+/g, " ").trim();
}

export default function PredictionCard({ item, onDelete, deleting = false }) {
  const t = useT();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const status = item.status === "healthy" ? "result.healthy" : item.status === "uncertain" ? "result.uncertain" : "result.diseased";
  const time = new Intl.DateTimeFormat(language === "te" ? "te-IN" : "en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at));
  const [cropLabel, diseaseLabel] = String(item.disease || "").split("___");
  return (
    <article className="history-card">
      <button className="history-card-main" type="button" onClick={() => navigate(`/result/${item.prediction_id}`)}>
        <ProtectedImage path={item.image_url} alt={t("result.crop")} className="history-thumb" />
        <span className="history-card-copy">
          <span className={`status-dot status-dot--${item.status}`} />
          <strong>{prettyLabel(diseaseLabel || item.disease)}</strong>
          <span className="history-card-context">{prettyLabel(item.recommendations?.crop || cropLabel)} · {item.model_version}</span>
          <span className="history-card-meta">{time}</span>
        </span>
        <span className="history-card-score"><b>{Math.round(item.confidence * 100)}%</b><small>{t("result.confidence")}</small></span>
        <span className={`status-pill status-pill--${item.status}`}>{t(status)}</span>
        <Icon className="history-chevron" name="arrow" size={18} />
      </button>
      {onDelete && <button className="icon-button history-delete" type="button" onClick={() => onDelete(item)} disabled={deleting} aria-label={t("history.remove")}><Icon name="trash" size={17} /></button>}
    </article>
  );
}
