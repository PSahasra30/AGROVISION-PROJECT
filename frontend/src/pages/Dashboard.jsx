import { motion } from "framer-motion";
import { useContext } from "react";
import { LanguageContext } from "../context/LanguageContext";
import { translations } from "../translations";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {

  const { language, setLanguage } = useContext(LanguageContext);
  const t = translations[language];
  const navigate = useNavigate();

  return (
    <div style={styles.wrapper}>

      {/* 🎥 VIDEO BACKGROUND */}
      <video
        autoPlay
        loop
        muted
        playsInline
        // preload="auto"
        preload="metadata"
        style={styles.video}
      >
        {/* <source src="/videos/farm.mp4" type="video/mp4" /> */}
        {/* <source src="https://res.cloudinary.com/dm35faajj/video/upload/v1774167743/farm_1_wptx1s.mp4" type="video/mp4" /> */}
        <source src="https://res.cloudinary.com/dm35faajj/video/upload/v1774169544/farm_1_1_lmwcsv.mp4" type="video/mp4" />
      </video>

      {/* 🌑 Dark Overlay */}
      <div style={styles.overlay}></div>

      {/* 🌍 Language Toggle */}
      <div style={styles.langSwitch}>
        <button onClick={() => setLanguage("en")} style={styles.langBtn}>
          EN
        </button>
        <button onClick={() => setLanguage("te")} style={styles.langBtn}>
          తెలుగు
        </button>
      </div>

      {/* 🚀 Hero Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={styles.hero}
      >

        <h1 style={styles.title}>🌿 {t.hero.title}</h1>

        <p style={styles.subtitle}>{t.hero.subtitle}</p>

        <div style={styles.badges}>
          <span style={styles.badge}>{t.badges.ai}</span>
          <span style={styles.badge}>{t.badges.crops}</span>
          <span style={styles.badge}>{t.badges.multi}</span>
          <span style={styles.badge}>{t.badges.realtime}</span>
        </div>

        <button
          style={styles.cta}
          onClick={() => navigate("/detect")}
        >
          🚀 {t.hero.start}
        </button>

      </motion.div>

    </div>
  );
};

const styles = {
  wrapper: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 0
  },

  video: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    objectFit: "cover",
    zIndex: -2
  },

  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.6)",
    zIndex: -1
  },

  langSwitch: {
    position: "absolute",
    top: 20,
    right: 30,
    display: "flex",
    gap: "10px",
    zIndex: 10
  },

  langBtn: {
    padding: "6px 12px",
    borderRadius: "20px",
    border: "1px solid white",
    background: "transparent",
    color: "white",
    cursor: "pointer"
  },

  hero: {
    backdropFilter: "blur(20px)",
    background: "rgba(255,255,255,0.1)",
    padding: "60px",
    borderRadius: "30px",
    textAlign: "center",
    color: "white",
    width: "90%",
    maxWidth: "900px",
    boxShadow: "0 25px 60px rgba(0,0,0,0.4)"
  },

  title: {
    fontSize: "50px",
    marginBottom: "20px"
  },

  subtitle: {
    fontSize: "20px",
    marginBottom: "30px",
    opacity: 0.9
  },

  badges: {
    display: "flex",
    justifyContent: "center",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "40px"
  },

  badge: {
    padding: "8px 18px",
    borderRadius: "30px",
    background: "rgba(255,255,255,0.2)",
    fontSize: "14px"
  },

  cta: {
    padding: "16px 40px",
    borderRadius: "40px",
    border: "none",
    fontSize: "18px",
    fontWeight: "bold",
    cursor: "pointer",
    background: "white",
    color: "#065f46"
  }
};

export default Dashboard;