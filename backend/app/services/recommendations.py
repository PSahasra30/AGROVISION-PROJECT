from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


DISCLAIMER = {
    "en": "This information is educational and is not a substitute for advice from a local agricultural expert or authority.",
    "te": "ఈ సమాచారం విద్యాపరమైనది మాత్రమే. తీవ్రమైన పంట సమస్యలపై స్థానిక వ్యవసాయ నిపుణుడు లేదా అధికారిని సంప్రదించండి.",
}


def load_knowledge_base(path: Path, class_labels: dict[int, str]) -> dict[str, dict[str, Any]]:
    with Path(path).open("r", encoding="utf-8") as stream:
        source = json.load(stream)
    normalized: dict[str, dict[str, Any]] = {}
    for class_id, label in class_labels.items():
        record = source.get(label)
        if not isinstance(record, dict):
            raise ValueError(f"Knowledge base has no canonical record for model class {class_id}: {label}")
        if not all(isinstance(record.get(locale), dict) for locale in ("en", "te")):
            raise ValueError(f"Knowledge record {label} must contain English and Telugu fields.")
        normalized[label] = record
    if set(source) != set(class_labels.values()):
        extra = sorted(set(source) - set(class_labels.values()))
        raise ValueError(f"Knowledge base contains non-canonical or extra disease keys: {extra}")
    return normalized


def _display_component(value: str) -> str:
    value = re.sub(r"[_(),]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def localized_recommendation(
    label: str,
    language: str,
    knowledge_base: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    locale = "te" if language == "te" else "en"
    try:
        source = knowledge_base[label][locale]
    except KeyError as exc:
        raise ValueError(f"No {locale} knowledge entry for canonical class {label}") from exc

    crop_part, _, disease_part = label.partition("___")
    return {
        "disease_id": label,
        "crop": _display_component(crop_part),
        "disease": _display_component(disease_part),
        "description": source.get("description") or None,
        "symptoms": source.get("symptoms") or None,
        "prevention": source.get("prevention") or None,
        "recommended_practices": source.get("recommended_practices") or None,
        "treatment": source.get("treatment") or None,
        "organic_options": source.get("organic") or None,
        "severity": source.get("severity") or None,
        "disclaimer": DISCLAIMER[locale],
    }
