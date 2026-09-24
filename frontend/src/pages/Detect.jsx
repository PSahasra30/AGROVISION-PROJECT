import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErrorKey } from "../api";
import Icon from "../components/Icon";
import { useLanguage, useT } from "../context/useLanguage";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxBytes = 8 * 1024 * 1024;
const maxPixels = 25_000_000;

export default function Detect() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = useT();

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    setPreview("");
    return undefined;
  }, [file]);

  useEffect(() => {
    if (videoRef.current && cameraStream) videoRef.current.srcObject = cameraStream;
  }, [cameraStream]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraStream(null);
  };

  const validateFile = async (candidate) => {
    if (!candidate || !acceptedTypes.includes(candidate.type)) throw new Error("detect.unsupported");
    if (candidate.size > maxBytes) throw new Error("detect.tooLarge");
    try {
      const image = await createImageBitmap(candidate);
      const { width, height } = image;
      image.close();
      if (width < 32 || height < 32) throw new Error("detect.tooSmall");
      if (width * height > maxPixels) throw new Error("detect.tooManyPixels");
    } catch (cause) {
      if (cause instanceof Error && cause.message.startsWith("detect.")) throw cause;
      throw new Error("detect.corrupt");
    }
    return candidate;
  };

  const chooseFile = async (candidate) => {
    setError("");
    if (!candidate) return;
    try {
      await validateFile(candidate);
      setFile(candidate);
      stopCamera();
    } catch (validationError) {
      setError(validationError.message.startsWith("detect.") ? t(validationError.message) : t("detect.corrupt"));
    }
  };

  const startCamera = async () => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t("detect.cameraUnsupported"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      setCameraStream(stream);
    } catch {
      setCameraError(t("detect.cameraDenied"));
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) { setError(t("detect.corrupt")); return; }
      void chooseFile(new File([blob], `leaf-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };

  const submit = async () => {
    if (!file) { setError(t("detect.needImage")); return; }
    setAnalyzing(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const { data } = await api.post(`/api/predictions/analyze?language=${language}`, form);
      navigate(`/result/${data.prediction_id}`, { state: { prediction: data } });
    } catch (requestError) {
      setError(t(apiErrorKey(requestError)));
    } finally {
      setAnalyzing(false);
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    void chooseFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="page-stack narrow-page">
      <header className="page-heading"><div className="eyebrow"><span className="eyebrow-dot" />{t("detect.eyebrow")}</div><h1>{t("detect.title")}</h1><p>{t("detect.subtitle")}</p></header>
      <div className="detect-grid">
        <section className="detect-main panel">
          {!file ? <div className="drop-area" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
            <span className="drop-icon"><Icon name="upload" size={25} /></span>
            <h2>{t("detect.dropTitle")}</h2><p>{t("detect.dropHint")}</p>
            <div className="drop-actions">
              <button className="button button-primary" type="button" onClick={() => inputRef.current?.click()}><Icon name="upload" size={17} />{t("detect.browse")}</button>
              <button className="button button-secondary" type="button" onClick={() => void startCamera()}><Icon name="camera" size={17} />{t("detect.useCamera")}</button>
            </div>
            <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { void chooseFile(event.target.files?.[0]); event.target.value = ""; }} />
          </div> : <div className={`preview-stage ${analyzing ? "preview-stage--analyzing" : ""}`}>
            <img className="leaf-preview" src={preview} alt={t("detect.preview")} />
            {analyzing && <div className="scan-overlay"><span className="scan-line" /><span className="scan-corners" /></div>}
            {!analyzing && <div className="preview-tools"><span className="preview-badge"><Icon name="check" size={15} />{t("detect.preview")}</span><div>
              <button className="icon-button icon-button--light" type="button" onClick={() => inputRef.current?.click()} aria-label={t("detect.replace")}><Icon name="upload" size={16} /></button>
              <button className="icon-button icon-button--light" type="button" onClick={() => { setFile(null); setError(""); }} aria-label={t("detect.remove")}><Icon name="close" size={16} /></button>
            </div></div>}
            <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { void chooseFile(event.target.files?.[0]); event.target.value = ""; }} />
          </div>}

          {cameraStream && !file && <div className="camera-panel">
            <div className="camera-panel-heading"><div><h2>{t("detect.cameraTitle")}</h2><p>{t("detect.cameraHint")}</p></div><button className="icon-button" type="button" onClick={stopCamera} aria-label={t("detect.stopCamera")}><Icon name="close" size={18} /></button></div>
            <div className="camera-view"><video ref={videoRef} autoPlay muted playsInline /><span className="camera-frame" /></div>
            <button className="button button-primary button-wide" type="button" onClick={capturePhoto}><Icon name="camera" size={18} />{t("detect.capture")}</button>
          </div>}
          <canvas ref={canvasRef} className="sr-only" />
          {cameraError && <div className="inline-alert inline-alert--soft" role="status">{cameraError}</div>}
          {error && <div className="inline-alert" role="alert">{error}</div>}
          {file && <div className="analysis-footer">
            {analyzing ? <div className="analyzing-copy"><span className="loading-orbit" /><span><strong>{t("detect.analyzing")}</strong><small>{t("detect.scanCopy")}</small></span></div>
              : <span className="file-detail"><Icon name="check" size={16} />{(file.size / (1024 * 1024)).toFixed(2)} MB</span>}
            <button className="button button-primary" type="button" onClick={submit} disabled={analyzing}>
              {analyzing ? t("detect.analyzing") : t("detect.analyze")} {!analyzing && <Icon name="arrow" size={17} />}
            </button>
          </div>}
        </section>
        <aside className="detect-aside">
          <div className="tips-card"><div className="tips-icon"><Icon name="info" size={18} /></div><h3>{t("detect.preview")}</h3><p>{t("detect.subtitle")}</p><ul><li>{t("detect.dropHint")}</li><li>{t("result.disclaimer")}</li></ul></div>
          <div className="privacy-card"><Icon name="shield" size={18} /><span>{t("auth.privacy")}</span></div>
        </aside>
      </div>
    </div>
  );
}
