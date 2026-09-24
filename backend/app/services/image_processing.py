from __future__ import annotations

import io
import warnings
from dataclasses import dataclass

import numpy as np
import tensorflow as tf
from PIL import Image


ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


class InvalidImageError(ValueError):
    pass


@dataclass(frozen=True)
class ProcessedUpload:
    model_input: np.ndarray
    preview_bytes: bytes
    width: int
    height: int
    image_format: str


def decode_and_preprocess(
    contents: bytes,
    max_image_pixels: int,
    target_size: int = 224,
) -> ProcessedUpload:
    if not contents:
        raise InvalidImageError("The uploaded file is empty.")

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            probe = Image.open(io.BytesIO(contents))
            image_format = (probe.format or "").upper()
            width, height = probe.size
            if image_format not in ALLOWED_IMAGE_FORMATS:
                raise InvalidImageError("Use a JPEG, PNG, or WebP image.")
            if width < 32 or height < 32:
                raise InvalidImageError("The image is too small to analyze.")
            if width * height > max_image_pixels:
                raise InvalidImageError("The image dimensions exceed the supported limit.")
            probe.verify()

            image = Image.open(io.BytesIO(contents)).convert("RGB")
            image.load()
    except InvalidImageError:
        raise
    except Exception as exc:
        raise InvalidImageError("The image is corrupt or could not be decoded.") from exc

    # PlantVillage training used tf.io.decode_jpeg(channels=3) followed by this exact resize.
    # Keep JPEG inference on that same TensorFlow decoder and use 8-bit RGB for other formats.
    if image_format == "JPEG":
        decoded = tf.io.decode_jpeg(contents, channels=3)
    else:
        # PNG/WebP inputs are not part of the JPEG training set. Pillow has validated and
        # converted these uploads to 8-bit RGB, avoiding uint16 PNGs exceeding the raw range.
        decoded = tf.convert_to_tensor(np.asarray(image, dtype=np.uint8))
    # Model-side layers perform (x / 255) * 2 - 1; do not normalize outside the model.
    resized = tf.image.resize(
        tf.cast(decoded, tf.float32),
        [target_size, target_size],
        method="bilinear",
        antialias=False,
    )
    model_input = tf.expand_dims(resized, axis=0).numpy().astype(np.float32, copy=False)

    preview = io.BytesIO()
    image.save(preview, format="JPEG", quality=88, optimize=True)
    return ProcessedUpload(
        model_input=model_input,
        preview_bytes=preview.getvalue(),
        width=width,
        height=height,
        image_format=image_format,
    )
