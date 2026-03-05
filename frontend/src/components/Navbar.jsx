import { useContext } from "react";
import { LanguageContext } from "../context/LanguageContext";

const Navbar = () => {
  const { language, setLanguage } = useContext(LanguageContext);

  return (
    <div style={styles.navbar}>
      <div style={styles.title}>AgroVision AI</div>

      <div style={styles.langToggle}>
        <button
          style={language === "en" ? styles.activeBtn : styles.langBtn}
          onClick={() => setLanguage("en")}
        >
          EN
        </button>

        <button
          style={language === "te" ? styles.activeBtn : styles.langBtn}
          onClick={() => setLanguage("te")}
        >
          తెలుగు
        </button>
      </div>
    </div>
  );
};

const styles = {
  navbar: {
    position: "fixed",
    top: 0,
    left: "230px",
    width: "calc(100% - 230px)",
    height: "70px",
    background: "#065f46",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 30px",
    zIndex: 1000
  },

  title: {
    fontSize: "20px",
    fontWeight: "600"
  },

  langToggle: {
    display: "flex",
    gap: "10px"
  },

  langBtn: {
    padding: "6px 14px",
    borderRadius: "20px",
    border: "none",
    background: "rgba(255,255,255,0.2)",
    color: "white",
    cursor: "pointer"
  },

  activeBtn: {
    padding: "6px 14px",
    borderRadius: "20px",
    border: "none",
    background: "#22c55e",
    color: "white",
    cursor: "pointer"
  }
};

export default Navbar;