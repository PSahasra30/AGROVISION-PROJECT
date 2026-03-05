



// import { useState, useRef, useContext } from "react";
// import { motion } from "framer-motion";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";
// import { LanguageContext } from "../context/LanguageContext";

// const UploadCard = () => {

//   const { language } = useContext(LanguageContext);
//   const navigate = useNavigate();

//   const [image,setImage] = useState(null);
//   const [preview,setPreview] = useState(null);
//   const [loading,setLoading] = useState(false);

//   const fileInputRef = useRef();

//   const handleFile = (file) => {
//     if(!file) return;

//     setImage(file);
//     setPreview(URL.createObjectURL(file));
//   };

//   const handleAnalyze = async () => {

//     if(!image) return;

//     setLoading(true);

//     const formData = new FormData();
//     formData.append("file",image);

//     try{

//       const response = await axios.post(
//         `http://localhost:8000/predict?language=${language}`,
//         formData
//       );

//       const data = response.data;

//       const result = {
//         disease: data.predicted_disease,
//         confidence: data.confidence,
//         description: data.details?.description,
//         prevention: data.details?.prevention,
//         treatment: data.details?.treatment,
//         organic: data.details?.organic,
//         image: preview,
//         date: new Date().toLocaleString()
//       };

//       localStorage.setItem("latestResult",JSON.stringify(result));

//       const history = JSON.parse(localStorage.getItem("history")) || [];

//       history.unshift(result);

//       localStorage.setItem("history",JSON.stringify(history));

//       navigate("/result");

//     }
//     catch(error){
//       console.log(error);
//     }

//     setLoading(false);
//   };

//   return (

//     <div style={styles.wrapper}>

//       <div style={styles.background}></div>
//       <div style={styles.overlay}></div>

//       <div style={styles.center}>

//         {!preview && (
//           <>
//             <motion.button
//               whileHover={{scale:1.05}}
//               style={styles.cameraBtn}
//               onClick={()=>fileInputRef.current.click()}
//             >
//               📷 Take Photo
//             </motion.button>

//             <motion.button
//               whileHover={{scale:1.05}}
//               style={styles.uploadBtn}
//               onClick={()=>fileInputRef.current.click()}
//             >
//               📂 Upload Image
//             </motion.button>

//             <input
//               ref={fileInputRef}
//               type="file"
//               accept="image/*"
//               hidden
//               onChange={(e)=>handleFile(e.target.files[0])}
//             />
//           </>
//         )}

//         {preview && (
//           <div style={styles.imageContainer}>

//             <img src={preview} alt="preview" style={styles.image}/>

//             {/* AI SCANNING LINE */}
//             {loading && (
//               <motion.div
//                 style={styles.scanLine}
//                 initial={{top:0}}
//                 animate={{top:"100%"}}
//                 transition={{
//                   duration:1.5,
//                   repeat:Infinity,
//                   ease:"linear"
//                 }}
//               />
//             )}

//             <button
//               style={styles.analyzeBtn}
//               onClick={handleAnalyze}
//               disabled={loading}
//             >
//               {loading ? "Analyzing..." : "🔍 Analyze with AI"}
//             </button>

//           </div>
//         )}

//       </div>

//     </div>
//   );
// };

// const styles = {

// wrapper:{
// position:"relative",
// width:"100%",
// height:"100%",
// display:"flex",
// alignItems:"center",
// justifyContent:"center",
// overflow:"hidden"
// },

// background:{
// position:"absolute",
// inset:0,
// backgroundImage:"url('/images/bg.jpg')",
// backgroundSize:"cover",
// backgroundPosition:"center",
// filter:"blur(10px) brightness(0.6)",
// zIndex:0
// },

// overlay:{
// position:"absolute",
// inset:0,
// background:"rgba(0,0,0,0.45)",
// zIndex:1
// },

// center:{
// position:"relative",
// zIndex:2,
// display:"flex",
// flexDirection:"column",
// alignItems:"center",
// gap:"25px"
// },

// imageContainer:{
// position:"relative",
// display:"flex",
// flexDirection:"column",
// alignItems:"center",
// gap:"20px"
// },

// image:{
// maxWidth:"90vw",
// maxHeight:"60vh",
// borderRadius:"20px",
// objectFit:"contain"
// },

// scanLine:{
// position:"absolute",
// left:0,
// right:0,
// height:"4px",
// background:"#22c55e",
// boxShadow:"0 0 20px #22c55e",
// opacity:0.9
// },

// analyzeBtn:{
// padding:"14px 30px",
// borderRadius:"40px",
// background:"#22c55e",
// color:"white",
// border:"none",
// cursor:"pointer",
// fontWeight:"bold"
// },

// cameraBtn:{
// padding:"16px 40px",
// borderRadius:"40px",
// background:"#22c55e",
// color:"white",
// border:"none",
// cursor:"pointer",
// fontWeight:"600",
// fontSize:"16px",
// boxShadow:"0 6px 20px rgba(0,0,0,0.3)"
// },

// uploadBtn:{
// padding:"16px 40px",
// borderRadius:"40px",
// background:"white",
// color:"#065f46",
// border:"none",
// cursor:"pointer",
// fontWeight:"600",
// fontSize:"16px",
// boxShadow:"0 6px 20px rgba(0,0,0,0.3)"
// }

// };

// export default UploadCard;




import { useState, useRef, useContext } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { LanguageContext } from "../context/LanguageContext";
import { translations } from "../translations";

const UploadCard = () => {

  const { language } = useContext(LanguageContext);
  const t = translations[language];

  const navigate = useNavigate();

  const [image,setImage] = useState(null);
  const [preview,setPreview] = useState(null);
  const [loading,setLoading] = useState(false);

  const fileInputRef = useRef();

  const handleFile = (file) => {
    if(!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleAnalyze = async () => {

    if(!image) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file",image);

    try{

      const response = await axios.post(
        `http://localhost:8000/predict?language=${language}`,
        formData
      );

      const data = response.data;

      const result = {
        disease: data.predicted_disease,
        confidence: data.confidence,
        description: data.details?.description,
        prevention: data.details?.prevention,
        treatment: data.details?.treatment,
        organic: data.details?.organic,
        image: preview,
        date: new Date().toISOString()
      };

      localStorage.setItem("latestResult",JSON.stringify(result));

      const history = JSON.parse(localStorage.getItem("history")) || [];

      history.unshift(result);

      localStorage.setItem("history",JSON.stringify(history));

      navigate("/result");

    }
    catch(error){
      console.log(error);
    }

    setLoading(false);
  };

  return (

    <div style={styles.wrapper}>

      <div style={styles.background}></div>
      <div style={styles.overlay}></div>

      <div style={styles.center}>

        {!preview && (
          <>
            <motion.button
              whileHover={{scale:1.05}}
              style={styles.cameraBtn}
              onClick={()=>fileInputRef.current.click()}
            >
              📷 {t.buttons.camera}
            </motion.button>

            <motion.button
              whileHover={{scale:1.05}}
              style={styles.uploadBtn}
              onClick={()=>fileInputRef.current.click()}
            >
              📂 {t.buttons.upload}
            </motion.button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e)=>handleFile(e.target.files[0])}
            />
          </>
        )}

        {preview && (
          <div style={styles.imageContainer}>

            <img src={preview} alt="preview" style={styles.image}/>

            {/* AI SCANNING LINE */}
            {loading && (
              <motion.div
                style={styles.scanLine}
                initial={{top:0}}
                animate={{top:"100%"}}
                transition={{
                  duration:1.5,
                  repeat:Infinity,
                  ease:"linear"
                }}
              />
            )}

            <button
              style={styles.analyzeBtn}
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? "Analyzing..." : `🔍 ${t.buttons.analyze}`}
            </button>

          </div>
        )}

      </div>

    </div>
  );
};

const styles = {

wrapper:{
position:"relative",
top:0,
left:0,
right:0,
bottom:0,
width:"100%",
height:"100%",
display:"flex",
alignItems:"center",
justifyContent:"center",
overflow:"hidden"
},

background:{
position:"absolute",
inset:0,
backgroundImage:"url('/images/bg.jpg')",
backgroundSize:"cover",
backgroundPosition:"center",
backgroundRepeat:"no-repeat",
filter:"blur(10px) brightness(0.55)",
zIndex:0
},

overlay:{
position:"absolute",
inset:0,
background:"rgba(0,0,0,0.45)",
zIndex:1
},

center:{
position:"relative",
zIndex:2,
display:"flex",
flexDirection:"column",
alignItems:"center",
gap:"25px"
},

imageContainer:{
position:"relative",
display:"flex",
flexDirection:"column",
alignItems:"center",
gap:"20px"
},

image:{
maxWidth:"90vw",
maxHeight:"60vh",
borderRadius:"20px",
objectFit:"contain"
},

scanLine:{
position:"absolute",
left:0,
right:0,
height:"4px",
background:"#22c55e",
boxShadow:"0 0 20px #22c55e",
opacity:0.9
},

analyzeBtn:{
padding:"14px 30px",
borderRadius:"40px",
background:"#22c55e",
color:"white",
border:"none",
cursor:"pointer",
fontWeight:"bold"
},

cameraBtn:{
padding:"16px 40px",
borderRadius:"40px",
background:"#22c55e",
color:"white",
border:"none",
cursor:"pointer",
fontWeight:"600",
fontSize:"16px",
boxShadow:"0 6px 20px rgba(0,0,0,0.3)"
},

uploadBtn:{
padding:"16px 40px",
borderRadius:"40px",
background:"white",
color:"#065f46",
border:"none",
cursor:"pointer",
fontWeight:"600",
fontSize:"16px",
boxShadow:"0 6px 20px rgba(0,0,0,0.3)"
}

};

export default UploadCard;







