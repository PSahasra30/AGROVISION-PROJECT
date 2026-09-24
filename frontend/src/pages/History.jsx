import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorKey } from "../api";
import Icon from "../components/Icon";
import PredictionCard from "../components/PredictionCard";
import { useLanguage, useT } from "../context/useLanguage";

export default function History() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const { language } = useLanguage();
  const t = useT();
  const limit = 12;

  useEffect(() => {
    let active = true;
    api.get("/api/predictions/history", { params: { page, limit, language } })
      .then(({ data }) => { if (active) { setItems(data.items); setTotal(data.total); setError(""); } })
      .catch((requestError) => { if (active) setError(t(apiErrorKey(requestError))); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, language, refreshKey, t]);

  const remove = async (item) => {
    if (!window.confirm(t("history.deleteConfirm"))) return;
    setDeleting(item.prediction_id);
    setError("");
    try {
      await api.delete(`/api/predictions/${item.prediction_id}`);
      const nextItems = items.filter((record) => record.prediction_id !== item.prediction_id);
      setItems(nextItems);
      setTotal((value) => Math.max(0, value - 1));
      if (nextItems.length === 0 && page > 1) setPage((value) => value - 1);
    } catch (requestError) {
      setError(t(apiErrorKey(requestError)));
    } finally {
      setDeleting("");
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="page-stack">
      <header className="page-heading page-heading--row"><div><div className="eyebrow"><span className="eyebrow-dot" />{t("history.eyebrow")}</div><h1>{t("history.title")}</h1><p>{t("history.subtitle")}</p></div><Link className="button button-primary" to="/detect">{t("home.start")}<Icon name="arrow" size={17} /></Link></header>
      {error && <div className="inline-alert" role="alert">{error}<button className="text-button" type="button" onClick={() => { setLoading(true); setRefreshKey((value) => value + 1); }}>{t("common.retry")}</button></div>}
      {loading ? <div className="state-panel"><span className="loading-orbit" />{t("common.loading")}</div>
        : items.length === 0 && !error ? <div className="empty-panel"><span className="empty-icon"><Icon name="history" size={26} /></span><h2>{t("history.emptyTitle")}</h2><p>{t("history.emptyCopy")}</p><Link className="button button-primary" to="/detect">{t("history.start")}<Icon name="arrow" size={17} /></Link></div>
          : <div className="history-list">{items.map((item) => <PredictionCard key={item.prediction_id} item={item} onDelete={remove} deleting={deleting === item.prediction_id} />)}</div>}
      {!loading && total > limit && <div className="pagination">
        <button className="button button-secondary" type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><Icon name="back" size={16} />{t("common.back")}</button>
        <span>{t("common.page")} {page} {t("common.of")} {pages}</span>
        <button className="button button-secondary" type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>{t("common.next")}<Icon name="arrow" size={16} /></button>
      </div>}
    </div>
  );
}
