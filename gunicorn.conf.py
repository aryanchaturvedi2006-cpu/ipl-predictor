import os

# Gunicorn configuration optimized for Render Free Tier (512 MB RAM limit)
port = os.environ.get("PORT", "5001")
bind = f"0.0.0.0:{port}"
workers = 1
threads = 2
timeout = 120
keepalive = 5
capture_output = True
preload_app = False

