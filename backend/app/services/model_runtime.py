from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any

import numpy as np
import tensorflow as tf

from ..config import Settings


@tf.keras.utils.register_keras_serializable(package="AgroVision")
class ECAChannelAttention(tf.keras.layers.Layer):
    """The registered custom layer used by the final Colab model."""

    def __init__(self, kernel_size: int = 3, **kwargs: Any):
        super().__init__(**kwargs)
        self.kernel_size = int(kernel_size)
        self.channel_conv = tf.keras.layers.Conv1D(
            filters=1,
            kernel_size=self.kernel_size,
            padding="same",
            use_bias=False,
            name="local_channel_interaction",
        )

    def build(self, input_shape: tf.TensorShape) -> None:
        channels = input_shape[-1]
        if channels is None:
            raise ValueError("ECA requires a statically known feature-channel count.")
        # Build the child Conv1D explicitly so Keras can restore its weights reliably.
        self.channel_conv.build((input_shape[0], channels, 1))
        super().build(input_shape)

    def call(self, inputs: tf.Tensor) -> tf.Tensor:
        descriptor = tf.reduce_mean(inputs, axis=[1, 2])
        gates = tf.sigmoid(
            tf.squeeze(self.channel_conv(tf.expand_dims(descriptor, axis=-1)), axis=-1)
        )
        return inputs * gates[:, None, None, :]

    def get_config(self) -> dict[str, Any]:
        config = super().get_config()
        config.update({"kernel_size": self.kernel_size})
        return config


class ModelService:
    def __init__(self, model: tf.keras.Model, class_labels: dict[int, str], model_version: str):
        self.model = model
        self.class_labels = class_labels
        self.model_version = model_version
        self._predict_lock = threading.Lock()

    @classmethod
    def load(cls, settings: Settings) -> "ModelService":
        model_path = Path(settings.model_path)
        if not model_path.is_file():
            raise FileNotFoundError(
                f"Final EfficientNetV2B0+ECA model is missing: {model_path}. "
                "Place the final Colab best_model.keras there; the historical H5 is not used."
            )
        for sidecar in (settings.model_labels_path, settings.model_preprocessing_path):
            if not Path(sidecar).is_file():
                raise FileNotFoundError(f"Required final-model sidecar is missing: {sidecar}")

        with Path(settings.model_labels_path).open(encoding="utf-8") as stream:
            artifact_labels = json.load(stream)
        with Path(settings.class_labels_path).open(encoding="utf-8") as stream:
            canonical = json.load(stream)
        with Path(settings.model_preprocessing_path).open(encoding="utf-8") as stream:
            preprocessing = json.load(stream)

        labels = {int(class_id): str(label) for class_id, label in artifact_labels.items()}
        expected = {int(class_id): str(label) for class_id, label in canonical.items()}
        if labels != expected or sorted(labels) != list(range(38)):
            raise ValueError("Final-model labels do not exactly match the canonical 38-class order.")
        if preprocessing.get("input_shape") != [224, 224, 3]:
            raise ValueError("Final-model preprocessing must use 224x224 RGB inputs.")
        if preprocessing.get("color_order") != "RGB" or preprocessing.get("input_dtype") != "float32":
            raise ValueError("Final-model preprocessing metadata must specify RGB float32 inputs.")
        if preprocessing.get("raw_input_range") != [0.0, 255.0]:
            raise ValueError("Final model expects raw pixels in [0, 255]; external normalization is forbidden.")
        if preprocessing.get("efficientnetv2_include_preprocessing") is not False:
            raise ValueError("Expected EfficientNetV2 internal preprocessing to be disabled.")

        model = tf.keras.models.load_model(
            model_path,
            custom_objects={
                "ECAChannelAttention": ECAChannelAttention,
                "AgroVision>ECAChannelAttention": ECAChannelAttention,
            },
            compile=False,
            safe_mode=True,
        )
        input_shape = tuple(model.input_shape[1:])
        output_shape = tuple(model.output_shape[1:])
        if input_shape != (224, 224, 3) or output_shape != (38,):
            raise ValueError(
                f"Unexpected final-model shape: input={input_shape}, output={output_shape}; "
                "expected (224, 224, 3) -> (38,)."
            )
        try:
            model.get_layer("eca_channel_attention")
        except ValueError as exc:
            raise ValueError("The configured final model is missing its ECA attention layer.") from exc

        probe = np.zeros((1, 224, 224, 3), dtype=np.float32)
        output = np.asarray(model(probe, training=False))
        if output.shape != (1, 38) or not np.isfinite(output).all():
            raise ValueError("Final model failed its startup output validation.")
        if np.any(output < 0) or not np.allclose(output.sum(axis=1), 1.0, atol=1e-3):
            raise ValueError("Final model output must be a finite 38-class probability distribution.")
        return cls(model, labels, settings.model_version)

    def predict(self, batch: np.ndarray) -> np.ndarray:
        with self._predict_lock:
            result = self.model(batch, training=False)
        probabilities = np.asarray(result, dtype=np.float32)
        if probabilities.shape != (1, 38) or not np.isfinite(probabilities).all():
            raise RuntimeError("The model returned invalid inference output.")
        return probabilities[0]
