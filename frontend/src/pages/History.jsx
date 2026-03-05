
// import { useContext } from "react";
// import { LanguageContext } from "../context/LanguageContext";
// import { translations } from "../translations";

// const History = () => {

//   const { language } = useContext(LanguageContext);
//   const t = translations[language];

//   const history = JSON.parse(localStorage.getItem("history")) || [];

//   return (

//     <div>

//       <h2 style={{marginBottom:"20px", color:"white"}}>
//         {t.history.title}
//       </h2>

//       {history.length === 0 && <p>{t.history.empty}</p>}

//       {history.map((item,index)=>(

//         <div key={index} style={styles.card}>

//           {item.image && (
//             <img src={item.image} style={styles.image} alt="leaf"/>
//           )}

//           <h3>{item.disease}</h3>

//           <p><b>{t.result.confidence}:</b> {item.confidence}</p>

//           <h4>{t.result.description}</h4>
//           <p>{item.description}</p>

//           <h4>{t.result.prevention}</h4>
//           <p>{item.prevention}</p>

//           <h4>{t.result.treatment}</h4>
//           <p>{item.treatment}</p>

//           <h4>{t.result.organic}</h4>
//           <p>{item.organic}</p>

//           <p><b>Date:</b> {item.date}</p>

//         </div>

//       ))}

//     </div>

//   );
// };

// const styles = {

// card:{
// background:"white",
// padding:"20px",
// borderRadius:"20px",
// marginBottom:"25px"
// },

// image:{
// width:"120px",
// borderRadius:"10px",
// marginBottom:"10px"
// }

// };

// export default History;





// import { useContext, useState, useEffect } from "react";
// import { LanguageContext } from "../context/LanguageContext";
// import { translations } from "../translations";

// const History = () => {

//   const { language } = useContext(LanguageContext);
//   const t = translations[language];

//   const [history,setHistory] = useState([]);

//   // Load history + remove items older than 14 days
//   useEffect(()=>{

//     const stored = JSON.parse(localStorage.getItem("history")) || [];

//     const filtered = stored.filter(item => {

//       const scanDate = new Date(item.date);
//       const now = new Date();

//       const diffDays = (now - scanDate) / (1000 * 60 * 60 * 24);

//       return diffDays <= 14;

//     });

//     setHistory(filtered);
//     localStorage.setItem("history",JSON.stringify(filtered));

//   },[]);

//   // delete single scan
//   // const deleteScan = (index) => {

//   //   const updated = history.filter((_,i)=>i!==index);

//   //   setHistory(updated);

//   //   localStorage.setItem("history",JSON.stringify(updated));

//   // };


//   const deleteScan = (index) => {

//   const confirmDelete = window.confirm(
//     language === "en"
//       ? "Do you really want to delete this scan?"
//       : "ఈ స్కాన్‌ను నిజంగా తొలగించాలనుకుంటున్నారా?"
//   );

//   if(!confirmDelete) return;

//   const updated = history.filter((_,i)=>i!==index);

//   setHistory(updated);

//   localStorage.setItem("history",JSON.stringify(updated));

//   alert(
//     language === "en"
//       ? "Scan removed successfully"
//       : "స్కాన్ విజయవంతంగా తొలగించబడింది"
//   );
// };

//   return (

//     <div>

//       <h2 style={{marginBottom:"20px",color:"white"}}>
//         {t.history.title}
//       </h2>

//       {history.length===0 && <p>{t.history.empty}</p>}

//       {history.map((item,index)=>(

//         <div key={index} style={styles.card}>

//           {item.image && (
//             <img src={item.image} style={styles.image} alt="leaf"/>
//           )}

//           <h3>{item.disease}</h3>

//           <p><b>{t.result.confidence}:</b> {item.confidence}</p>

//           <h4>{t.result.description}</h4>
//           <p>{item.description}</p>

//           <h4>{t.result.prevention}</h4>
//           <p>{item.prevention}</p>

//           <h4>{t.result.treatment}</h4>
//           <p>{item.treatment}</p>

//           <h4>{t.result.organic}</h4>
//           <p>{item.organic}</p>

//           <p><b>Date:</b> {item.date}</p>

//           <button
//             style={styles.deleteBtn}
//             onClick={()=>deleteScan(index)}
//           >
//             🗑 Delete
//           </button>

//         </div>

//       ))}

//     </div>

//   );
// };

// const styles = {

// card:{
// background:"white",
// padding:"20px",
// borderRadius:"20px",
// marginBottom:"25px"
// },

// image:{
// width:"120px",
// borderRadius:"10px",
// marginBottom:"10px"
// },

// deleteBtn:{
// marginTop:"10px",
// padding:"8px 15px",
// border:"none",
// borderRadius:"20px",
// background:"#ef4444",
// color:"white",
// cursor:"pointer"
// }

// };

// export default History;











import { useContext, useState, useEffect } from "react";
import { LanguageContext } from "../context/LanguageContext";
import { translations } from "../translations";

const History = () => {

  const { language } = useContext(LanguageContext);
  const t = translations[language];

  const [history,setHistory] = useState([]);

  useEffect(()=>{

    const stored = JSON.parse(localStorage.getItem("history")) || [];

    const now = new Date();

    const filtered = stored.filter(item => {

      const scanDate = new Date(item.date);

      const diffDays =
        (now - scanDate) / (1000 * 60 * 60 * 24);

      return diffDays <= 14;

    });

    setHistory(filtered);

    localStorage.setItem("history",JSON.stringify(filtered));

  },[]);


  const deleteScan = (index) => {

    const confirmDelete = window.confirm(
      language === "en"
        ? "Do you really want to delete this scan?"
        : "ఈ స్కాన్‌ను నిజంగా తొలగించాలనుకుంటున్నారా?"
    );

    if(!confirmDelete) return;

    const updated = history.filter((_,i)=>i!==index);

    setHistory(updated);

    localStorage.setItem("history",JSON.stringify(updated));

    alert(
      language === "en"
        ? "Scan removed successfully"
        : "స్కాన్ విజయవంతంగా తొలగించబడింది"
    );

  };


  return (

    <div>

      <h2 style={{marginBottom:"10px",color:"white"}}>
        {t.history.title}
      </h2>

      <p style={styles.disclaimer}>
        {language==="en"
          ? "Note: Scan history is stored locally and will be deleted after 14 days."
          : "గమనిక: స్కాన్ చరిత్ర 14 రోజుల తర్వాత స్వయంచాలకంగా తొలగించబడుతుంది."}
      </p>

      {history.length===0 && <p>{t.history.empty}</p>}

      {history.map((item,index)=>{

        const now = new Date();
        const scanDate = new Date(item.date);

        const diffDays = Math.floor(
          (now - scanDate) / (1000*60*60*24)
        );

        const remaining = 14 - diffDays;

        return(

          <div key={index} style={styles.card}>

            {item.image && (
              <img src={item.image} style={styles.image} alt="leaf"/>
            )}

            <h3>{item.disease}</h3>

            <p><b>{t.result.confidence}:</b> {item.confidence}</p>

            <h4>{t.result.description}</h4>
            <p>{item.description}</p>

            <h4>{t.result.prevention}</h4>
            <p>{item.prevention}</p>

            <h4>{t.result.treatment}</h4>
            <p>{item.treatment}</p>

            <h4>{t.result.organic}</h4>
            <p>{item.organic}</p>

            {/* Fixed date display */}
            <p>
              <b>Date:</b> {new Date(item.date).toLocaleDateString()}
            </p>

            <p style={styles.expiry}>
              {language==="en"
                ? `This scan will be deleted in ${remaining} days`
                : `ఈ స్కాన్ ${remaining} రోజుల్లో తొలగించబడుతుంది`}
            </p>

            <button
              style={styles.deleteBtn}
              onClick={()=>deleteScan(index)}
            >
              🗑 Delete
            </button>

          </div>

        );

      })}

    </div>

  );
};

const styles = {

card:{
background:"white",
padding:"20px",
borderRadius:"20px",
marginBottom:"25px"
},

image:{
width:"120px",
borderRadius:"10px",
marginBottom:"10px"
},

deleteBtn:{
marginTop:"10px",
padding:"8px 15px",
border:"none",
borderRadius:"20px",
background:"#ef4444",
color:"white",
cursor:"pointer"
},

expiry:{
marginTop:"10px",
fontSize:"13px",
color:"#6b7280"
},

disclaimer:{
color:"#facc15",
marginBottom:"20px",
fontSize:"14px"
}

};

export default History;