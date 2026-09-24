import Icon from "../components/Icon";
import { useT } from "../context/useLanguage";

export default function About() {
  const t = useT();
  const stats = [["97.82%", "home.accuracy"], ["99.85%", "home.top3"], ["8,154", "home.testSamples"]];
  return (
    <div className="page-stack narrow-page">
      <header className="page-heading"><div className="eyebrow"><span className="eyebrow-dot" />{t("about.eyebrow")}</div><h1>{t("about.title")}</h1><p>{t("about.intro")}</p></header>
      <section className="about-metrics panel">
        <div className="section-kicker">{t("about.evaluationTitle")}</div>
        <div className="about-stat-grid">{stats.map(([number, label]) => <div key={label}><strong>{number}</strong><span>{t(label)}</span></div>)}</div>
        <p className="muted">{t("about.dataset")}</p>
      </section>
      <div className="about-grid">
        {[["leaf", "about.modelTitle", "about.modelCopy"], ["scan", "about.baselineTitle", "about.baselineCopy"], ["sprout", "about.guideTitle", "about.guideCopy"], ["shield", "about.privacyTitle", "about.privacyCopy"], ["info", "about.limitationsTitle", "about.limitationsCopy"]].map(([icon, title, body]) => <article className="about-card" key={title}>
          <span className="about-icon"><Icon name={icon} size={19} /></span><h2>{t(title)}</h2><p>{t(body)}</p>
        </article>)}
      </div>
      <div className="disclaimer-card"><Icon name="info" size={19} /><span>{t("about.support")}</span></div>
    </div>
  );
}
