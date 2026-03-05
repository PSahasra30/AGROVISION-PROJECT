// const About = () => {
//   return <h1>About Model</h1>;
// };

// export default About;



import { useContext } from "react";
import { LanguageContext } from "../context/LanguageContext";
import { translations } from "../translations";

const About = () => {

  const { language } = useContext(LanguageContext);
  const t = translations[language];

  return (

    <div style={styles.wrapper}>

      <h1 style={styles.title}>{t.about.title}</h1>

      <p style={styles.text}>{t.about.intro}</p>

      <h2 style={styles.section}>{t.about.howTitle}</h2>
      <p style={styles.text}>{t.about.how}</p>

      <h2 style={styles.section}>{t.about.featuresTitle}</h2>

      <ul style={styles.list}>
        <li>{t.about.f1}</li>
        <li>{t.about.f2}</li>
        <li>{t.about.f3}</li>
        <li>{t.about.f4}</li>
        <li>{t.about.f5}</li>
      </ul>

      <h2 style={styles.section}>{t.about.techTitle}</h2>
      <p style={styles.text}>{t.about.tech}</p>

      <h2 style={styles.section}>{t.about.goalTitle}</h2>
      <p style={styles.text}>{t.about.goal}</p>

    </div>
  );
};

const styles = {

wrapper:{
padding:"40px",
color:"white",
maxWidth:"900px"
},

title:{
fontSize:"32px",
marginBottom:"20px"
},

section:{
marginTop:"25px",
marginBottom:"10px"
},

text:{
lineHeight:"1.7",
fontSize:"16px"
},

list:{
lineHeight:"1.8",
paddingLeft:"20px"
}

};

export default About;