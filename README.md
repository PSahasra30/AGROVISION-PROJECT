# AgroVision - AI Crop Disease Detection & Recommendation Platform

AgroVision is a bilingual web application for reviewing crop-leaf images with a 38-class classifier and a controlled disease-information guide. A React interface sends an uploaded or camera-captured image to a FastAPI service. The service validates and resizes the image, runs the final EfficientNetV2B0 + ECA model, returns ranked classes and confidence, and stores authenticated results in MongoDB.

## Problem and approach

Plant-health decisions often begin with a visual inspection, but a photograph alone can be hard to interpret. AgroVision provides an initial image classification and relevant, prewritten disease information in English or Telugu. The classifier identifies a class; the knowledge base supplies the corresponding information. The application does not dynamically generate treatment advice.

## Features

- 38-class PlantVillage leaf classification with the final EfficientNetV2B0 + ECA model.
- Image upload or browser camera capture, client-side preview, and JPEG, PNG, and WebP validation.
- Confidence threshold and top-two margin checks that can mark an output as uncertain.
- Three ranked class predictions and a model version in each prediction response.
- English and Telugu application text and knowledge-base content.
- Account registration and login with scrypt password hashes and signed JWTs.
- MongoDB-backed, user-scoped prediction history, saved-image retrieval, pagination, and deletion.
- FastAPI health/readiness endpoint and input validation on both client and server.

## Model and reported evaluation

The deployed artifact is an ImageNet-pretrained EfficientNetV2B0 backbone with one ECA channel-attention layer before global average pooling, followed by a classification head. The earlier baseline uses MobileNetV2. The training notebooks reference the same seed-42 split manifest at `ml/splits/plantvillage_seed42.csv`.

| Experiment | Reported test accuracy | Reported top-3 accuracy | Test images | Classes |
| --- | ---: | ---: | ---: | ---: |
| MobileNetV2 baseline | 97.15% | 99.77% | 8,154 | 38 |
| EfficientNetV2B0 + ECA | 97.82% | 99.85% | 8,154 | 38 |

These are the Colab results supplied for this project, not metrics recomputed by the application. The repository currently contains the dataset audit but not the generated `baseline_report.json`, `enhanced_report.json`, or metric CSV files, so the reported numbers cannot be independently checked against those run reports here. The split manifest contains 37,991 training rows, 8,158 validation rows, and 8,154 test rows.

The results are PlantVillage held-out test-set metrics. PlantVillage images are controlled and do not establish real-world farm accuracy. Performance can differ with field backgrounds, lighting, camera quality, cultivars, and disease severity. The confidence score is a model probability subject to configured uncertainty thresholds; it is not a calibrated field-risk estimate.

The final model graph uses ECA as its project-added attention component. The notebook does not add a separate ESA or SE module, nor custom residual or depthwise-separable blocks.

The local artifact and sidecars are expected at:

~~~text
backend/models/final_efficientnetv2b0_eca.keras
backend/models/class_labels.json
backend/models/preprocessing_config.json
~~~

The `backend/models/` directory is Git-ignored. Obtain the model and matching sidecars separately before expecting model readiness. The runtime checks the class order, preprocessing metadata, model input/output shapes, ECA layer, and a startup output probe. It does not fall back to a historical H5 model.

## Architecture

~~~mermaid
flowchart TD
    User[User] --> UI[React and Vite frontend]
    UI -->|JWT-authenticated upload or query| API[FastAPI]
    UI -->|register or login| Auth[Authentication routes]
    Auth --> Users[(MongoDB users)]
    API --> Validate[Image validation and RGB resize]
    Validate --> Model[EfficientNetV2B0 plus ECA]
    Model --> Classify[Class, confidence, and top 3]
    Classify --> Guide[Controlled English and Telugu knowledge base]
    Classify --> Store[(MongoDB prediction history)]
    Classify --> Images[User-scoped JPEG image storage]
    Guide --> Response[Prediction response]
    Store --> Response
    Images --> Response
    Response --> UI
    UI -->|history, detail, delete| API
~~~

## Application workflow

1. Register or sign in.
2. Upload a leaf image or capture one with the browser camera.
3. Preview the image and submit it for analysis.
4. FastAPI validates the encoded image, converts it to RGB, and resizes it to 224 Ã— 224.
5. The model returns 38 class probabilities. The API selects the top three and applies the configured confidence and margin thresholds.
6. The predicted class is matched to the canonical labels and the controlled disease guide.
7. The backend saves a JPEG preview and an owner-scoped MongoDB record, then returns the result.
8. The result page displays the classification, confidence, top-three list, available guide fields, and disclaimer. The history page lists, opens, and deletes the signed-in user's saved results.

## Recommendations and bilingual support

`backend/disease_database.json` contains one canonical record per model class with English and Telugu sections. The model supplies a class; the guide supplies any available description, prevention, treatment, and organic-option text. Symptoms, recommended practices, and severity are returned as undocumented when the source does not provide them. No LLM generates treatments or medication advice. This information is educational; consult a local agricultural expert for serious treatment decisions.

The frontend keeps interface translations in `frontend/src/translations.js`. `LanguageProvider` persists the selected `en` or `te` locale in local storage and updates the document language and title. The selected locale is also sent to result and history endpoints. Disease class identifiers remain the canonical model labels; the interface formats those labels rather than translating the class taxonomy.

## Technology stack

| Area | Technologies in use |
| --- | --- |
| Frontend | React 19, React Router, Axios, Vite 7, CSS |
| Backend | Python, FastAPI, Uvicorn, Pydantic, Pillow |
| ML and image processing | TensorFlow, Keras, NumPy, Pillow; scikit-learn, pandas, and TensorFlow in the Colab notebooks |
| Database | MongoDB through PyMongo |
| Authentication | JWT via python-jose; password hashing with Python `hashlib.scrypt` |
| Development and checks | ESLint, Python `unittest`, FastAPI TestClient / HTTPX, Google Colab notebooks |

The lockfile requires Node.js `^20.19.0` or `>=22.12.0` for its Vite version. Backend dependencies are declared in `backend/requirements.txt`.

`CODEBASE.md` describes the implementation and data flows in more detail. The tree omits `.env`, `.git`, dependencies, caches, and generated build output. Model files, local image storage, and the dataset archive are not committed.

## Local setup

### Prerequisites

- Python 3.10â€“3.12 with a TensorFlow-compatible environment.
- Node.js `^20.19.0` or `>=22.12.0`, plus npm.
- A reachable MongoDB server. The default local URI is `mongodb://127.0.0.1:27017`.
- The final `.keras` model and its matching sidecars in `backend/models/`.

### Backend

From the repository root, create and activate the backend virtual environment and install declared dependencies:

~~~powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
Copy-Item .env.example .env
~~~

Generate a private secret locally with a cryptographically secure generator, then put its output in the ignored `.env` file as the value of `JWT_SECRET`. Do not place the generated value in `.env.example` or commit `.env`.

~~~powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
~~~

Copy the exact final model and sidecars into `backend/models/`, then start the API from the repository root:

~~~powershell
uvicorn backend.main:app --reload
~~~

Check `http://127.0.0.1:8000/api/health` and open `http://127.0.0.1:8000/docs` for the generated API reference. A missing model or MongoDB connection leaves the process running in a degraded state; readiness reports the unavailable component and protected functionality returns an error.

### Frontend

In a separate terminal:

~~~powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
~~~

The Vite example sets `VITE_API_BASE_URL` to `http://localhost:8000`; the API client uses the same fallback if no Vite value is supplied. Vite may choose another port if 5173 is occupied. Add the exact browser origin to `CORS_ORIGINS` and restart the backend if the dev server uses a different port. Vite reads environment files at startup, so restart it after changing `.env.local`.

### Environment variables

The backend template is `.env.example`. All backend settings have code defaults, but authenticated operation requires a non-empty `JWT_SECRET` of at least 32 UTF-8 bytes. A working MongoDB service, model, and sidecars are required for a fully ready inference service.

| Variable | Template/default | Purpose |
| --- | --- | --- |
| `JWT_SECRET` | Blank in the example; set privately | Signs and verifies HS256 access tokens; at least 32 UTF-8 bytes for authentication |
| `JWT_EXPIRE_MINUTES` | `60` | Access-token lifetime; backend clamps values below 5 to 5 |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017` | MongoDB connection URI |
| `MONGODB_DATABASE` | `agrovision` | Database name |
| `AGROVISION_MODEL_PATH` | `backend/models/final_efficientnetv2b0_eca.keras` | Final model file |
| `AGROVISION_MODEL_LABELS_PATH` | `backend/models/class_labels.json` | Model-label sidecar |
| `AGROVISION_PREPROCESSING_CONFIG` | `backend/models/preprocessing_config.json` | Model-preprocessing sidecar |
| `AGROVISION_MODEL_VERSION` | `efficientnetv2b0-eca-final` | Version string returned by the API |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174` | Comma-separated browser origins |
| `MAX_UPLOAD_BYTES` | `8388608` | Upload byte limit (8 MiB) |
| `MAX_IMAGE_PIXELS` | `25000000` | Decoded image pixel limit |
| `UNCERTAINTY_THRESHOLD` | `0.60` | Minimum top-class probability |
| `UNCERTAINTY_MARGIN` | `0.03` | Minimum difference between the top two probabilities |

Additional optional backend overrides recognized in `backend/app/config.py` but omitted from the example are `AGROVISION_CLASS_LABELS_PATH` (default `backend/class_labels.json`), `AGROVISION_DISEASE_DATABASE_PATH` (default `backend/disease_database.json`), and `AGROVISION_IMAGE_STORAGE_DIR` (default `backend/storage/images`). Paths may be absolute or relative to the repository root.

The frontend setting `VITE_API_BASE_URL` is in `frontend/.env.example`; its fallback is `http://localhost:8000`. The root example allows localhost ports 5173 and 5174 plus 127.0.0.1 port 5173. The fallback in `backend/app/config.py` allows only the two port-5173 origins; configure `.env` explicitly when using another origin.

## API overview

| Method | Route | Purpose | Authentication |
| --- | --- | --- | --- |
| `GET` | `/` | Service and documentation links | No |
| `GET` | `/api/health` | Component readiness and model version | No |
| `POST` | `/api/auth/register` | Create an account and issue a token | No |
| `POST` | `/api/auth/login` | Verify credentials and issue a token | No |
| `GET` | `/api/auth/me` | Return the token owner's account | Bearer JWT |
| `POST` | `/api/predictions/analyze` | Validate, classify, guide, and save an uploaded image | Bearer JWT |
| `GET` | `/api/predictions/history` | Paginated user-scoped history | Bearer JWT |
| `GET` | `/api/predictions/{prediction_id}` | Retrieve one saved result | Bearer JWT |
| `GET` | `/api/predictions/{prediction_id}/image` | Retrieve its protected JPEG | Bearer JWT |
| `DELETE` | `/api/predictions/{prediction_id}` | Delete the result and saved image | Bearer JWT |

The analysis endpoint accepts multipart field `file` and optional query parameter `language=en|te`. The response includes the class, confidence, `healthy`/`diseased`/`uncertain` status, three predictions, model version, saved-image URL, and available localized guide fields. See `CODEBASE.md` for request and response details.

## Testing and validation

The backend test suite contains seven tests. It uses an injected fake model and in-memory repository for endpoint behavior; it does not load the real model or connect to MongoDB. Commands declared by the project:

~~~powershell
python -m unittest discover -s backend/tests -v
python -m compileall -q backend
cd frontend
npm run lint
npm run build
~~~

Verified in this workspace on 2026-09-24: all seven backend tests passed, Python compilation completed, ESLint passed, and the Vite production build completed. A separate live health check returned `status: ok` with model, database, recommendations, and authentication ready. The model's startup loader checks the real artifact and sidecars; the unit tests use fakes.

## Security, limitations, and future work

Implemented protections include scrypt password hashing, HS256 JWTs, token-protected routes, owner-scoped history and image access, image-format/dimension/size validation, a path-containment check for stored images, configured CORS origins, and environment-based secrets. The browser keeps the bearer token in `sessionStorage`; production deployments should account for script-injection risk, use HTTPS, and review the production origin list. There are no account-recovery, token-refresh, or server-side token-revocation routes.

PlantVillage is controlled laboratory-style imagery; field accuracy is unknown. Recommendations are informational, and some guide fields are intentionally absent. Camera use depends on browser support, device availability, permissions, and a secure browser context such as localhost or HTTPS. Local development requires MongoDB, and model/data assets are separate from source control. The repository does not contain a deployment configuration or a `LICENSE` file.

Future work could add a separately evaluated field-image test set, calibrated uncertainty thresholds, broader agronomic review of guide content, model/data provenance records, deployment automation, rate limiting, observability, and account recovery. These are proposals, not current features.
---

For module responsibilities, data contracts, exact model and preprocessing behavior, and design limitations, see [CODEBASE.md](CODEBASE.md).
