# AgroVision Codebase Guide

This guide documents the checked-out AgroVision implementation: its main files, runtime flow, configuration, model contract, data handling, and known gaps. It reflects the repository reviewed on 2026-09-24.
~~~

The tree omits ignored or generated content. The local final model and sidecars are in **backend/models/** but ignored by Git. Other local-only paths include environment files and **backend/storage/images/**.

## Backend

### Entrypoint and application assembly

- **backend/main.py** exposes the ASGI app from **backend.app.main** and is the Uvicorn entrypoint (**backend.main:app**).
- **backend/app/main.py** creates the FastAPI app, configures middleware and routers, and initializes and closes runtime services.
- **backend/app/config.py** reads environment variables and resolves paths relative to the project root.
- **backend/app/database.py** manages MongoDB access, startup ping, and index creation.
- **backend/app/dependencies.py** resolves authenticated users from bearer tokens and database records.
- **backend/app/schemas.py** defines API request and response structures.
- **backend/app/security.py** implements password hashing and JWT creation and validation.
- **backend/app/routers/** contains the auth, health, and prediction route handlers.
- **backend/app/services/** contains image decoding, model inference, and disease recommendation logic.

At startup the app initializes the database, model runtime, recommendation data, and authentication readiness. **GET /api/health** reports their component states. A running server process by itself does not guarantee that all components are ready.

### HTTP API

All routes in this table are mounted under **/api**, except the root endpoint and FastAPI documentation pages.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | **/** | Public | Basic service identity. |
| GET | **/api/health** | Public | Model, database, recommendations, and authentication readiness. |
| POST | **/api/auth/register** | Public | Create an account; success returns HTTP 201. |
| POST | **/api/auth/login** | Public | Authenticate and return a bearer token and user data. |
| GET | **/api/auth/me** | Bearer token | Return the current user. |
| POST | **/api/predictions/analyze** | Bearer token | Accept multipart **file** and optional **language** query parameter, run inference, and persist a prediction. |
| GET | **/api/predictions/history** | Bearer token | List the current user's predictions. Supports **page** (default 1), **limit** (default 12, max 50), and **language** (default en). |
| GET | **/api/predictions/{prediction_id}** | Bearer token | Get a prediction owned by the current user; supports **language**. |
| GET | **/api/predictions/{prediction_id}/image** | Bearer token | Return its saved preview after checking ownership. |
| DELETE | **/api/predictions/{prediction_id}** | Bearer token | Delete the prediction and its local image. |

FastAPI also exposes **/docs**, **/redoc**, and **/openapi.json**.

The analysis endpoint accepts JPEG, PNG, and WebP files. The configured upload limit is 8 MiB. Images smaller than 32 Ã— 32 pixels or larger than 25 million pixels are rejected. Successful persistence requires MongoDB availability.

### Authentication and authorization

- Registration trims and lowercases email addresses and applies a basic email-format check.
- Passwords must be 12â€“128 characters and at most 128 UTF-8 bytes.
- Password hashes use scrypt with N=2^14, r=8, p=1, a random 16-byte salt, and a 32-byte derived key. Hash checks use a constant-time comparison.
- Tokens use HS256. The JWT secret must contain at least 32 UTF-8 bytes. The default expiration is 60 minutes; code enforces a five-minute minimum.
- Protected requests resolve the token subject to an existing MongoDB user record.
- The frontend stores its token in sessionStorage. Signing out removes it in the browser.
- The current flow does not implement email verification, password reset, refresh tokens, or server-side token revocation.

These notes describe the implementation and are not a production security review.

### MongoDB persistence

The default URI is **mongodb://127.0.0.1:27017** and the default database is **agrovision**. The application uses **users** and **predictions** collections. Startup creates a unique email index, a descending user/creation-time index for history, and a unique user/prediction index. MongoDB is pinged before its health component is marked ready.

Prediction metadata and a relative image path are stored in MongoDB; image bytes are kept on local disk rather than in the database.

### Image processing and model inference

The work is divided across:

- **backend/app/services/image_processing.py** validates and decodes images, converts them to RGB, and resizes them.
- **backend/app/services/model_runtime.py** loads the Keras model and sidecars, checks the model contract, performs inference, and formats class probabilities.
- **backend/app/routers/predictions.py** authenticates requests, calls inference, persists results, and serves history and image records.
- **backend/app/services/recommendations.py** loads disease guidance and maps a predicted class and language to advice.

The live pipeline accepts JPEG, PNG, and WebP. JPEG decoding uses TensorFlow; PNG and WebP decoding use Pillow. Images are converted to RGB, resized bilinearly to 224 Ã— 224 without antialiasing, and supplied to the model as float32 pixels in the 0â€“255 range.

Preprocessing and rescaling are inside the model graph, so the backend does not apply a second external normalization step. Inference calls the model with **training=False**, leaving training-only augmentation inactive. The runtime expects input shape 224 Ã— 224 Ã— 3 and 38 output classes.

By default the runtime loads:

- **backend/models/final_efficientnetv2b0_eca.keras**
- **backend/models/class_labels.json**
- **backend/models/preprocessing_config.json**

It checks safe-mode model loading, output/label dimensions, preprocessing sidecar consistency, and finite normalized outputs. The local model file observed in this review was 53,324,860 bytes. These files are Git-ignored and must be provisioned separately for a fresh clone.

The inspected model configuration contains an EfficientNetV2B0 backbone, an ECA channel-attention layer before the classification head, global average pooling, batch normalization, a 256-unit ReLU dense layer, dropout, and a 38-unit softmax layer. The notebook includes an ECA/no-attention control. No separate project-authored ESA, SE, residual, or depthwise-separable head blocks were found in the final configuration. EfficientNet's own internal backbone layers are still part of the architecture.

### Prediction decisions and image storage

The runtime returns class probabilities and top-three suggestions. The configured uncertainty rules flag a prediction if the top probability is below 0.60 or the gap between the top two probabilities is below 0.03. A non-uncertain label ending in **___healthy** is presented as healthy; other accepted labels are presented as diseased. Uncertain output is handled separately.

The backend writes an optimized JPEG preview at quality 88 under **backend/storage/images/<user-id>/<prediction_uuid>.jpg**. MongoDB records store a relative path. Image reads check prediction ownership and ensure the resolved path remains under the configured image directory. If inserting a prediction fails, the newly written preview is cleaned up. Deletion removes the record and its image.

### Disease guidance

**backend/disease_database.json** contains 38 class records with English (**en**) and Telugu (**te**) content. Each language record includes description, organic guidance, prevention, and treatment fields. The recommendation service returns symptoms, recommended practices, and severity as null when those fields are not present in the data. Responses include a bilingual guidance disclaimer. The implementation uses this local knowledge base and does not call an LLM or external recommendation service.

### CORS

CORS uses an explicit origin list, enables credentials, and allows GET, POST, DELETE, and OPTIONS with Authorization and Content-Type headers. It does not use a wildcard origin.

The root **.env.example** includes **http://localhost:5174** and the 5173 localhost origins. The code's fallback list contains only the 5173 origins. Set **CORS_ORIGINS** to include the exact frontend scheme, host, and port if Vite runs on a different origin.

### Backend tests

**backend/tests/test_api.py** contains seven unittest cases. They use a fake model, in-memory repository behavior, and temporary files. They do not test inference against the production Keras model or connectivity to a live MongoDB instance.

## Frontend

### App structure and routes

- **frontend/src/main.jsx** mounts React and its providers.
- **frontend/src/App.jsx** defines the route tree.
- **frontend/src/contexts/** contains authentication and language providers and hooks.
- **frontend/src/pages/** contains sign-in/sign-up, dashboard, detection, history, result, and about pages.
- **frontend/src/components/** contains the shared shell and reusable visual components.
- **frontend/src/translations.js** provides English and Telugu UI strings.
- **frontend/src/index.css** defines the app styles and responsive behavior.

Routes are **/signin**, **/**, **/detect**, **/history**, **/result/:predictionId**, and **/about**. Main workspace routes are protected; unknown paths are redirected. The camera flow requests the environment-facing camera, captures a JPEG through a canvas, and stops camera tracks. A file input provides a fallback. **ProtectedImage** retrieves prediction images through the authenticated API client.

The UI includes responsive breakpoints at 1120, 850, and 620 pixels and reduced-motion handling. Telugu strings are present in source. The font stack names DM Sans, Manrope, Noto Sans Telugu, and system fallbacks; no font files are bundled. **framer-motion** is declared as a dependency but is not imported by the inspected source.

### API client and Vite configuration

**frontend/src/api.js** centralizes HTTP calls and uses **import.meta.env.VITE_API_BASE_URL**, falling back to **http://localhost:8000**. Endpoint URLs are composed through this client.

**frontend/.env.example** sets **VITE_API_BASE_URL=http://localhost:8000**. Vite environment values are public build-time configuration and must not contain secrets. The local development frontend used port 5174. The frontend's **frontend/README.md** remains the stock Vite starter text; project-specific instructions are in the root **README.md**.

## Machine learning

### Dataset and split

The audit report **ml/reports/plantvillage_audit.json** describes 54,303 RGB JPEG images, 256 Ã— 256 pixels, in 38 classes. **ml/splits/plantvillage_seed42.csv** records 37,991 training, 8,158 validation, and 8,154 test samples. It uses seed 42 and grouping intended to keep duplicate-image groups isolated across partitions. The dataset archive is not included; the local archive's provenance and license were not established by the inspected repository files.

### Colab notebooks and protocol

- **ml/notebooks/train_baseline_mobilenetv2_colab.ipynb** defines the MobileNetV2 baseline.
- **ml/notebooks/train_enhanced_efficientnetv2b0_colab.ipynb** defines the EfficientNetV2B0 + ECA experiment and ECA/no-attention control.

The baseline notebook uses the fixed split and has settings for 224-pixel input, batch size 16, an eight-epoch classifier-head stage, a 15-epoch fine-tuning stage, learning rates 1e-3 and 1e-5, dropout 0.5, seed 42, upper 30% backbone fine-tuning, and patience 4. The enhanced notebook reads shared settings from a baseline config on Google Drive. Both workflows reserve the test partition for final evaluation after validation-based checkpoint selection. The enhanced notebook's validation-ablation mode does not construct a test dataset. Its final path evaluates the selected enhanced model and reads the baseline report for comparison only after enhanced evaluation.

The notebooks save models and generated reports to Google Drive. Executed notebook outputs are not checked in. Their configured Drive directories include **My Drive/AgroVision/models/baseline_mobilenetv2/** and **My Drive/AgroVision/models/enhanced_efficientnetv2b0/**.

### Reported metrics and auditability

The project owner supplied these final test summaries:

| Experiment | Test samples | Accuracy | Top-3 accuracy |
|---|---:|---:|---:|
| MobileNetV2 baseline | 8,154 | 97.15% | 99.77% |
| EfficientNetV2B0 + ECA | 8,154 | 97.82% | 99.85% |

The supplied baseline summary also reports macro precision 97.65%, macro recall 97.41%, macro F1 97.34%, weighted precision 97.99%, weighted recall 97.92%, and weighted F1 97.88%. No enhanced macro or weighted values are stated here because the final-model brief did not supply them.

These are owner-reported Colab results, not reproduced measurements from this checkout. Neither notebook contains saved execution output, and no baseline or enhanced metric JSON/CSV was found under **ml/reports/** during review. The checked-in JSON there is a dataset audit, not a model-evaluation report. The metric values therefore cannot be checked against generated reports in this repository.

### Experiment registry discrepancy

**ml/configs/experiments.json** still describes the plan as design-only and says training has not run. Its design protocol lists five head epochs and up to 25 fine-tuning epochs, which differ from the baseline notebook's eight and 15 epoch settings. It also lists an **EfficientNetV2B0_ECA_spatial** candidate, but the enhanced notebook implements an ECA/no-attention control; no spatial-attention switch was found. Treat the registry as stale planning metadata until reconciled with completed Colab runs. No results are inferred for planned candidates.

## Configuration reference

### Backend variables

The root **.env.example** provides these settings:

| Variable | Template value | Purpose |
|---|---|---|
| **JWT_SECRET** | Blank | Needed for authenticated operation; set a private random value of at least 32 UTF-8 bytes. |
| **JWT_EXPIRE_MINUTES** | 60 | Token lifetime; code enforces a five-minute minimum. |
| **MONGODB_URI** | mongodb://127.0.0.1:27017 | MongoDB connection. |
| **MONGODB_DATABASE** | agrovision | Database name. |
| **AGROVISION_MODEL_PATH** | backend/models/final_efficientnetv2b0_eca.keras | Keras model path. |
| **AGROVISION_MODEL_LABELS_PATH** | backend/models/class_labels.json | Model label sidecar. |
| **AGROVISION_PREPROCESSING_CONFIG** | backend/models/preprocessing_config.json | Preprocessing sidecar. |
| **AGROVISION_MODEL_VERSION** | efficientnetv2b0-eca-final | Version identifier reported by the app. |
| **CORS_ORIGINS** | localhost and 127.0.0.1 origins on ports 5173 and 5174 | Comma-separated browser origins. |
| **MAX_UPLOAD_BYTES** | 8388608 | Maximum upload size, 8 MiB. |
| **MAX_IMAGE_PIXELS** | 25000000 | Maximum decoded pixel count. |
| **UNCERTAINTY_THRESHOLD** | 0.60 | Minimum top-class probability for confidence. |
| **UNCERTAINTY_MARGIN** | 0.03 | Minimum difference between the top two probabilities. |

Code also supports path overrides **AGROVISION_CLASS_LABELS_PATH**, **AGROVISION_DISEASE_DATABASE_PATH**, and **AGROVISION_IMAGE_STORAGE_DIR**. These are not listed in the root example file. Configuration provides defaults for many values, but a private JWT secret and reachable MongoDB are needed for the complete authenticated service.

### Frontend variable

| Variable | Template/default | Purpose |
|---|---|---|
| **VITE_API_BASE_URL** | http://localhost:8000 | Backend origin used by the frontend API client. |

Only public, non-secret values belong in Vite variables.

## Local run and health check

The root [README.md](README.md) contains full setup commands and dependency notes. At a high level:

1. Create a private root **.env** from **.env.example** and configure a JWT secret.
2. Provision the ignored model and sidecars under **backend/models/**.
3. Start MongoDB.
4. Install backend requirements in Python 3.10â€“3.12 and run Uvicorn with **backend.main:app**.
5. Install frontend packages and start Vite.
6. Check **/api/health** and confirm every component reports ready before using authenticated features.

The frontend example uses **http://localhost:8000** for the backend. CORS must include the frontend's exact scheme, host, and port.

## Storage, generated files, and version control

- Root **.gitignore** excludes local environment files, model artifacts, and runtime image storage. The final Keras model and sidecars are locally present but not tracked.
- **frontend/.gitignore** excludes local Vite environment files, **node_modules**, and build output such as **dist**.
- User image previews are runtime data under **backend/storage/images/**, not source assets.
- The PlantVillage archive is absent; the Colab workflows expect it and model/report outputs to be available via Google Drive.
- No Dockerfile, Compose configuration, deployment manifest, project license file, or screenshots were found in the reviewed tree.
- The documented setup targets local development; no production deployment configuration was found.

Do not commit secrets, private dataset content, generated model binaries, runtime uploads, or user data.

## Known gaps and boundaries

- Completed-run notebook outputs and generated metric reports are missing from Git, so reported metrics cannot be audited from this checkout.
- The experiment registry remains in design-only state and differs from the notebook protocol.
- Dataset archive provenance and licensing evidence are not checked in.
- The final model is required for inference but ignored by Git; a fresh clone needs a separately managed artifact delivery step.
- Tests use fakes and temporary storage; they do not verify a real model or live MongoDB.
- Disease guidance is static bilingual content, not certified agronomic or chemical-use advice. Follow local agricultural guidance and product labels.

For the concise project overview, setup commands, and feature summary, see [README.md](README.md).
