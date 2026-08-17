# ── Python AI microservice (Phase 8) ─────────────────────────────────────
# python:3.10-slim + OS-level Tesseract + OpenCV runtime libraries.
#
# CRITICAL: OpenCV and Tesseract depend on low-level C++/system binaries
# that pip cannot provide — apt-get installs them BEFORE the Python
# requirements so the whole chain resolves in one layer.

FROM python:3.10-slim

WORKDIR /app

# 1. OS-level dependencies:
#    • tesseract-ocr (+ eng/hin language packs for bilingual OCR)
#    • libgl1-mesa-glx libsm6 libxext6 (OpenCV matrix/imaging runtime)
#    • poppler-utils (pdf2image page rasterization)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    libgl1-mesa-glx \
    libsm6 \
    libxext6 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# 2. Python dependencies (installed after system libs so pip builds link
#    against the freshly installed Tesseract/OpenCV runtimes).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. Application code.
COPY app ./app

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
