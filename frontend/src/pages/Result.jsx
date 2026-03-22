import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { LanguageContext } from "../context/LanguageContext";
import { translations } from "../translations";

const Result = () => {

  const navigate = useNavigate();

  const { language } = useContext(LanguageContext);
  const t = translations[language];

  const result = JSON.parse(localStorage.getItem("latestResult"));

  if(!result) return <p>No result available</p>;

  return(

    <div style={styles.wrapper}>

      <div style={styles.card}>

        <h2>{result.disease}</h2>

        <p><b>{t.result.confidence}:</b> {result.confidence}</p>

        <h4>{t.result.description}</h4>
        <p>{result.description}</p>

        <h4>{t.result.prevention}</h4>
        <p>{result.prevention}</p>

        <h4>{t.result.treatment}</h4>
        <p>{result.treatment}</p>

        <h4>{t.result.organic}</h4>
        <p>{result.organic}</p>

        <div style={styles.buttons}>

          <button
            style={styles.backBtn}
            onClick={()=>navigate("/detect")}
          >
            ← {t.buttons.back}
          </button>

          <button
            style={styles.nextBtn}
            onClick={()=>navigate("/history")}
          >
            {t.buttons.next} →
          </button>

        </div>

      </div>

    </div>

  );
};

const styles={
wrapper:{
display:"flex",
justifyContent:"center",
alignItems:"center",
height:"100%"
},

card:{
background:"white",
padding:"30px",
borderRadius:"20px",
width:"650px"
},

buttons:{
display:"flex",
gap:"20px",
marginTop:"20px",
justifyContent:"center"
},

backBtn:{
padding:"10px 20px",
borderRadius:"30px",
border:"none",
background:"#065f46",
color:"white",
cursor:"pointer"
},

nextBtn:{
padding:"10px 20px",
borderRadius:"30px",
border:"none",
background:"#22c55e",
color:"white",
cursor:"pointer"
}
};

export default Result;