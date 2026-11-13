"""
export_onnx.py — Export Keras DL models to ONNX runtime format
==============================================================
Models converted:
  1. models/ffnn_pre.keras   -> models/ffnn_pre.onnx    (Input: [None, 10])
  2. models/ffnn_post.keras  -> models/ffnn_post.onnx   (Input: [None, 12])
  3. models/lstm_live.keras  -> models/lstm_live.onnx   (Input: [None, 20, 7])

This script validates numerical parity (tolerance < 1e-4) between
Keras predictions and ONNX Runtime predictions on identical inputs,
and exports models/onnx_parity_report.json.
"""

import os
import sys
import json
import datetime
import numpy as np

# Set environment variables for clean operation
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

def export_all():
    try:
        import tensorflow as tf
        import tf2onnx
        import onnx
        import onnxruntime as ort
    except ImportError as e:
        print(f"[EXPORT ERROR] Missing required conversion packages: {e}")
        print("Please install: pip install tensorflow tf2onnx onnx onnxruntime")
        return False

    models_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(models_dir, exist_ok=True)

    conversions = [
        {
            "id": "ffnn_pre",
            "name": "FFNN Pre-Toss",
            "keras_path": os.path.join(models_dir, "ffnn_pre.keras"),
            "onnx_path": os.path.join(models_dir, "ffnn_pre.onnx"),
            "input_shape": (None, 10),
            "test_shape": (100, 10),
            "input_name": "input_layer"
        },
        {
            "id": "ffnn_post",
            "name": "FFNN Post-Toss",
            "keras_path": os.path.join(models_dir, "ffnn_post.keras"),
            "onnx_path": os.path.join(models_dir, "ffnn_post.onnx"),
            "input_shape": (None, 12),
            "test_shape": (100, 12),
            "input_name": "input_layer_post"
        },
        {
            "id": "lstm_live",
            "name": "LSTM Live Match Sequence",
            "keras_path": os.path.join(models_dir, "lstm_live.keras"),
            "onnx_path": os.path.join(models_dir, "lstm_live.onnx"),
            "input_shape": (None, 20, 7),
            "test_shape": (100, 20, 7),
            "input_name": "input_layer_lstm"
        }
    ]

    all_passed = True
    report = {
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "environment": {
            "python_version": sys.version,
            "tensorflow_version": tf.__version__,
            "tf2onnx_version": tf2onnx.__version__,
            "onnx_version": onnx.__version__,
            "onnxruntime_version": ort.__version__
        },
        "tolerance": 1e-4,
        "models": {}
    }

    for item in conversions:
        name = item["name"]
        keras_path = item["keras_path"]
        onnx_path = item["onnx_path"]
        input_name = item["input_name"]
        input_shape = item["input_shape"]
        test_shape = item["test_shape"]

        print(f"\nProcessing {name}...")
        if not os.path.exists(keras_path):
            print(f"  [ERROR] Keras model not found at {keras_path}")
            all_passed = False
            continue

        # 1. Load Keras model
        model = tf.keras.models.load_model(keras_path)
        print(f"  Loaded Keras model: {name} (input_shape={model.input_shape}, output_shape={model.output_shape})")

        # 2. Convert to ONNX using tf2onnx concrete serving function
        @tf.function
        def serving_fn(x):
            return model(x)

        input_signature = [tf.TensorSpec(input_shape, tf.float32, name=input_name)]
        model_proto, _ = tf2onnx.convert.from_function(
            serving_fn,
            input_signature=input_signature,
            opset=13,
            output_path=onnx_path
        )
        print(f"  Exported ONNX model to {onnx_path} ({os.path.getsize(onnx_path):,} bytes)")

        # Validate with onnx.checker
        onnx_model = onnx.load(onnx_path)
        onnx.checker.check_model(onnx_model)
        print(f"  ONNX Checker: VALID")

        # 3. Test numerical parity on test batch
        np.random.seed(42)
        test_input = np.random.randn(*test_shape).astype(np.float32)

        # For LSTM, ensure reasonable values for cricket match sequences
        if len(test_shape) == 3:
            # Over sequences: current_score, wickets, rrr, crr, balls_remaining, runs_needed, target
            test_input = np.abs(test_input)

        # Keras prediction
        keras_pred = model.predict(test_input, verbose=0).flatten()

        # ONNX Runtime prediction
        session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
        actual_input_name = session.get_inputs()[0].name
        onnx_pred = session.run(None, {actual_input_name: test_input})[0].flatten()

        diffs = np.abs(keras_pred - onnx_pred)
        max_diff = float(np.max(diffs))
        mean_diff = float(np.mean(diffs))
        std_diff = float(np.std(diffs))

        # Pearson correlation
        corr = float(np.corrcoef(keras_pred, onnx_pred)[0, 1])

        passed = max_diff < 1e-4
        if not passed:
            all_passed = False

        status = "PASSED" if passed else "FAILED"
        print(f"  Parity Evaluation ({test_shape[0]} samples):")
        print(f"    Max Absolute Diff:  {max_diff:.6e}")
        print(f"    Mean Absolute Diff: {mean_diff:.6e}")
        print(f"    Correlation:        {corr:.6f}")
        print(f"    Status:             {status}")

        report["models"][item["id"]] = {
            "name": name,
            "keras_path": keras_path,
            "onnx_path": onnx_path,
            "onnx_size_bytes": os.path.getsize(onnx_path),
            "input_name": actual_input_name,
            "input_shape": [list(dim.shape) if hasattr(dim, 'shape') else str(dim) for dim in session.get_inputs()],
            "output_name": session.get_outputs()[0].name,
            "samples_tested": test_shape[0],
            "max_absolute_difference": max_diff,
            "mean_absolute_difference": mean_diff,
            "std_absolute_difference": std_diff,
            "pearson_correlation": corr,
            "parity_check": status
        }

    report_path = os.path.join(models_dir, "onnx_parity_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"\nParity report saved to {report_path}")

    return all_passed

if __name__ == "__main__":
    success = export_all()
    sys.exit(0 if success else 1)
