from fastapi import FastAPI, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
import numpy as np
from PIL import Image
import json
import io

app = FastAPI()

# -----------------------------
# Enable CORS
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Load Model
# -----------------------------
model = tf.keras.models.load_model("agrovision_model.h5")

# -----------------------------
# Load Class Labels
# -----------------------------
with open("class_labels.json", "r") as f:
    class_labels = json.load(f)

# -----------------------------
# Load Disease Database
# -----------------------------
with open("disease_database.json", "r", encoding="utf-8") as f:
    disease_database = json.load(f)


print("Total diseases loaded:", len(disease_database))

# -----------------------------
# Image Preprocessing
# -----------------------------
def preprocess_image(image):
    image = image.resize((224, 224))
    image = np.array(image) / 255.0
    image = np.expand_dims(image, axis=0)
    return image


# -----------------------------
# Routes
# -----------------------------
@app.get("/")
def home():
    return {"message": "🌿 AgroVision AI Backend Running Successfully"}


@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    language: str = Query("en")
):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        processed_image = preprocess_image(image)

        predictions = model.predict(processed_image)[0]

        top_index = np.argmax(predictions)
        confidence = float(predictions[top_index])

        # Direct mapping (NO normalization)
        disease_name = class_labels[str(top_index)]

        # Convert language input safely
        language_key = "te" if language.lower() == "te" else "en"

        # Fetch disease details
        disease_info = disease_database.get(disease_name)

        if disease_info:
            details = disease_info.get(language_key, disease_info["en"])
        else:
            details = {
                "description": "Information not available.",
                "prevention": "",
                "treatment": "",
                "organic": ""
            }

        # Format display name for frontend
        display_name = disease_name.replace("___", " - ").replace("_", " ")

        # Low confidence handling
        if confidence < 0.6:
            return {
                "status": "uncertain",
                "predicted_disease": display_name,
                "confidence": round(confidence, 4),
                "details": details,
                "message": "Model confidence is low. Please upload a clearer leaf image."
            }

        return {
            "status": "success",
            "predicted_disease": display_name,
            "confidence": round(confidence, 4),
            "details": details
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }