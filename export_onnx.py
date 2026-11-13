"""
export_onnx.py — Export Keras DL models to ONNX runtime format
==============================================================
Models converted:
  1. models/ffnn_pre.keras   -> models/ffnn_pre.onnx    (Input: [None, 10])
  2. models/ffnn_post.keras  -> models/ffnn_post.onnx   (Input: [None, 12])
  3. models/lstm_live.keras  -> models/lstm_live.onnx   (Input: [None, 20, 7])

This script validates numerical parity (tolerance < 1e-4) between
Keras predictions and ONNX Runtime predictions on identical inputs.
"""

import os
import sys
import numpy as np

def export_all():
    try:
        import tensorflow as tf
        from tensorflow.keras.models import load_model
        import tf2onnx
        import onnx
        import onnxruntime as ort
    except ImportError as e:
        print(f"[EXPORT ERROR] Missing required conversion packages: {e}")
        print("Please install: pip install tensorflow tf2onnx onnx onnxruntime")
        return False

    models_dir = os.path.join(os.path.dirname(__file__), "models")
    
    conversions = [
        {
            "name": "FFNN Pre-Toss",
            "keras_path": os.path.join(models_dir, "ffnn_pre.keras"),
            "onnx_path": os.path.join(models_dir, "ffnn_pre.onnx"),
            "input_shape": (1, 10),
            "input_spec": tf.TensorSpec((None, 10), tf.float32, name="input_layer")
        },
        {
            "name": "FFNN Post-Toss",
            "keras_path": os.path.join(models_dir, "ffnn_post.keras"),
            "onnx_path": os.path.join(models_dir, "ffnn_post.onnx"),
            "input_shape": (1, 12),
            "input_spec": tf.TensorSpec((None, 12), tf.float32, name="input_layer_1")
        },
        {
            "name": "LSTM Live",
            "keras_path": os.path.join(models_dir, "lstm_live.keras"),
            "onnx_path": os.path.join(models_dir, "lstm_live.onnx"),
            "input_shape": (1, 20, 7),
            "input_spec": tf.TensorSpec((None, 20, 7), tf.float32, name="input_layer_2")
        }
    ]

    all_passed = True

    for item in conversions:
        name = item["name"]
        keras_path = item["keras_path"]
        onnx_path = item["onnx_path"]
        
        print(f"\nProcessing {name}...")
        if not os.path.exists(keras_path):
            print(f"  [ERROR] Keras model not found at {keras_path}")
            all_passed = False
            continue

        # 1. Load Keras model
        model = load_model(keras_path)
        print(f"  Loaded Keras model: {name}")

        # 2. Convert to ONNX
        model_proto, _ = tf2onnx.convert.from_keras(
            model,
            input_signature=[item["input_spec"]],
            opset=13,
            output_path=onnx_path
        )
        print(f"  Exported ONNX model to {onnx_path}")

        # 3. Test numerical parity
        np.random.seed(42)
        dummy_input = np.random.randn(*item["input_shape"]).astype(np.float32)
        
        # Keras prediction
        keras_pred = model.predict(dummy_input, verbose=0).flatten()

        # ONNX Runtime prediction
        session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
        input_name = session.get_inputs()[0].name
        onnx_pred = session.run(None, {input_name: dummy_input})[0].flatten()

        diff = np.max(np.abs(keras_pred - onnx_pred))
        print(f"  Keras Prediction: {keras_pred}")
        print(f"  ONNX Prediction:  {onnx_pred}")
        print(f"  Max Absolute Difference: {diff:.6e}")

        if diff < 1e-4:
            print(f"  PARITY CHECK PASSED for {name} (diff < 1e-4)")
        else:
            print(f"  [WARNING] Parity check failed for {name} (diff = {diff})")
            all_passed = False

    return all_passed

if __name__ == "__main__":
    success = export_all()
    sys.exit(0 if success else 1)

