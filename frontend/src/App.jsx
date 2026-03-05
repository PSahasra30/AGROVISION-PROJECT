import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

import Dashboard from "./pages/Dashboard";
import UploadCard from "./components/UploadCard";
import Result from "./pages/Result";
import History from "./pages/History";
import About from "./pages/About";

import "./index.css";

function Layout() {

  const location = useLocation();

  const hideLayout = location.pathname === "/";

  return (
    <div className="app">

      {!hideLayout && <Sidebar />}

      <div className={hideLayout ? "full" : "main"}>

        {!hideLayout && <Navbar />}

        <div className={hideLayout ? "landing-content" : "content"}>

          <Routes>

            <Route path="/" element={<Dashboard />} />

            <Route path="/detect" element={<UploadCard />} />

            <Route path="/result" element={<Result />} />

            <Route path="/history" element={<History />} />

            <Route path="/about" element={<About />} />

          </Routes>

        </div>

      </div>

    </div>
  );
}

function App(){
  return(
    <Router>
      <Layout/>
    </Router>
  )
}

export default App;