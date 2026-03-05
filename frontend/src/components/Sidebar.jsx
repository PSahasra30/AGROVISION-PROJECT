
// import { NavLink } from "react-router-dom";
// import { useContext } from "react";
// import { LanguageContext } from "../context/LanguageContext";
// import { translations } from "../translations";

// const Sidebar = () => {

//   const { language } = useContext(LanguageContext);
//   const t = translations[language];

//   return (
//     <div style={styles.sidebar}>
//       <div style={styles.logo}>🌿 AgroVision</div>

//       <nav style={styles.nav}>
//         <NavLink to="/" style={styles.link}>
//           {t.sidebar.dashboard}
//         </NavLink>

//         <NavLink to="/detect" style={styles.link}>
//           {t.sidebar.detection}
//         </NavLink>

//         <NavLink to="/history" style={styles.link}>
//           {t.sidebar.history}
//         </NavLink>

//         <NavLink to="/about" style={styles.link}>
//           {t.sidebar.about}
//         </NavLink>
//       </nav>
//     </div>
//   );
// };

// const styles = {
//   sidebar: {
//     width: "230px",
//     height: "100vh",
//     position: "fixed",
//     top: 0,
//     left: 0,
//     background: "#022c22",
//     padding: "30px 20px",
//     display: "flex",
//     flexDirection: "column"
//   },

//   logo: {
//     fontSize: "22px",
//     fontWeight: "bold",
//     color: "white",
//     marginBottom: "40px"
//   },

//   nav: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "15px"
//   },

//   link: {
//     textDecoration: "none",
//     color: "#e2e8f0",
//     fontSize: "16px",
//     padding: "12px 16px",
//     borderRadius: "10px"
//   }
// };

// export default Sidebar;



import { NavLink } from "react-router-dom";
import { useContext } from "react";
import { LanguageContext } from "../context/LanguageContext";
import { translations } from "../translations";

const Sidebar = () => {

  const { language } = useContext(LanguageContext);
  const t = translations[language];

  const getLinkStyle = ({ isActive }) => ({
    ...styles.link,
    background: isActive ? "#065f46" : "transparent",
    color: isActive ? "white" : "#e2e8f0"
  });

  return (
    <div style={styles.sidebar}>

      <div style={styles.logo}>🌿 AgroVision</div>

      <nav style={styles.nav}>

        <NavLink to="/" style={getLinkStyle}>
          {t.sidebar.dashboard}
        </NavLink>

        <NavLink to="/detect" style={getLinkStyle}>
          {t.sidebar.detection}
        </NavLink>

        <NavLink to="/history" style={getLinkStyle}>
          {t.sidebar.history}
        </NavLink>

        <NavLink to="/about" style={getLinkStyle}>
          {t.sidebar.about}
        </NavLink>

      </nav>

    </div>
  );
};

const styles = {

sidebar:{
width:"230px",
height:"100vh",
position:"fixed",
top:0,
left:0,
background:"#022c22",
padding:"30px 20px",
display:"flex",
flexDirection:"column"
},

logo:{
fontSize:"22px",
fontWeight:"bold",
color:"white",
marginBottom:"40px"
},

nav:{
display:"flex",
flexDirection:"column",
gap:"15px"
},

link:{
textDecoration:"none",
fontSize:"16px",
padding:"12px 16px",
borderRadius:"10px",
transition:"0.2s"
}

};

export default Sidebar;