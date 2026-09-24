import { useEffect, useState } from "react";
import { fetchProtectedImage } from "../api";
import Icon from "./Icon";

export default function ProtectedImage({ path, alt, className = "" }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    fetchProtectedImage(path)
      .then((url) => { objectUrl = url; if (active) setSrc(url); else URL.revokeObjectURL(url); })
      .catch(() => { if (active) setSrc(""); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path]);
  return src ? <img className={className} src={src} alt={alt} /> : <div className={`${className} image-placeholder`} aria-label={alt}><Icon name="leaf" size={22} /></div>;
}
