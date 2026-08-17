"""
preprocessing.py — Computer Vision preprocessing pipeline (Phase 3)

Raw physical scans are noisy: low resolution, harsh shadows, textured
backgrounds and skew all inflate OCR error rates. This module executes the
mandatory preprocessing sequence before Tesseract runs:

    1. Decode the uploaded byte buffer into a NumPy-backed OpenCV matrix.
    2. Blur safeguard — Laplacian variance on the grayscale image. A variance
       below ``BLUR_THRESHOLD`` (50.0) classifies the frame as excessively
       blurry and the payload is rejected before any OCR cost is incurred.
    3. Resolution enhancement — bicubic (INTER_CUBIC) upscaling to double
       width/height (~300 DPI baseline).
    4. Gaussian blur (3x3 kernel) to suppress high-frequency sensor noise.
    5. Adaptive Gaussian thresholding (block size 11, constant C=2) to
       binarize text against dynamically lit backgrounds.
"""

from __future__ import annotations

import io
from typing import List

import cv2
import numpy as np
from pdf2image import convert_from_bytes

# ── Tunable pipeline constants ────────────────────────────────────────────
BLUR_THRESHOLD = 50.0        # minimum Laplacian variance for a "sharp" frame
UPSCALE_FACTOR = 2.0         # double dimensions → ~300 DPI baseline
GAUSSIAN_KERNEL = (3, 3)     # mild noise-suppression kernel
ADAPTIVE_BLOCK_SIZE = 11     # local window for threshold computation (odd)
ADAPTIVE_C = 2               # constant subtracted from the local mean
BINARY_THRESHOLD_MAX = 255


class InvalidImageError(ValueError):
    """Raised when the byte buffer cannot be decoded into an image."""


class BlurryDocumentError(ValueError):
    """Raised when the Laplacian variance falls below the sharpness floor."""


# ── Decoding ──────────────────────────────────────────────────────────────

def bytes_to_image(file_bytes: bytes) -> np.ndarray:
    """
    Decode raw uploaded bytes into a BGR OpenCV image matrix.

    Args:
        file_bytes: Raw file payload (JPEG/PNG/TIFF...).

    Returns:
        OpenCV image matrix (H, W, 3).

    Raises:
        InvalidImageError: if the buffer is empty, truncated or corrupt.
    """
    if not file_bytes:
        raise InvalidImageError("Uploaded file is empty")

    buffer = np.frombuffer(file_bytes, dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)

    if image is None:
        raise InvalidImageError(
            "Could not decode the uploaded buffer into an image — the file "
            "may be corrupt or in an unsupported format"
        )
    return image


# ── Blur detection ────────────────────────────────────────────────────────

def detect_blur(image: np.ndarray) -> float:
    """
    Measure image sharpness via the variance of the Laplacian.

    The Laplacian approximates the second derivative of the image, which
    responds strongly to edges. A low variance indicates few sharp edges →
    the frame is blurred (motion blur, misfocus, low light).

    Args:
        image: BGR image matrix.

    Returns:
        Variance of the Laplacian (higher = sharper). Below 50.0 the
        document is rejected by the endpoint.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def assert_sharp(image: np.ndarray) -> float:
    """
    Run the blur safeguard; raises :class:`BlurryDocumentError` when the
    Laplacian variance is strictly below ``BLUR_THRESHOLD``.

    Returns the measured variance for logging.
    """
    variance = detect_blur(image)
    if variance < BLUR_THRESHOLD:
        raise BlurryDocumentError(
            f"Document is too blurry for processing (Laplacian variance "
            f"{variance:.2f} < {BLUR_THRESHOLD:.1f}). Please re-capture with "
            f"steady lighting and focus."
        )
    return variance


# ── Preprocessing pipeline ────────────────────────────────────────────────

def preprocess_image(image: np.ndarray) -> np.ndarray:
    """
    Transform a decoded image into an OCR-optimized binary matrix.

    Steps:
        1. Bicubic upscale to 2× dimensions (≈300 DPI baseline).
        2. Convert BGR → grayscale (drop colour channels).
        3. 3×3 Gaussian blur to damp sensor noise / JPEG artifacts.
        4. Adaptive Gaussian thresholding → pure black & white.

    Args:
        image: BGR image matrix.

    Returns:
        Single-channel binary matrix (H*2, W*2), values 0 or 255.
    """
    # 1. Resolution enhancement — INTER_CUBIC is slow but produces the
    #    smoothest upscales, ideal for feeding an LSTM OCR engine.
    upscaled = cv2.resize(
        image,
        None,
        fx=UPSCALE_FACTOR,
        fy=UPSCALE_FACTOR,
        interpolation=cv2.INTER_CUBIC,
    )

    # 2. Drop colour: morphology operates on intensity only.
    gray = cv2.cvtColor(upscaled, cv2.COLOR_BGR2GRAY)

    # 3. Mild Gaussian blur — removes high-frequency pepper noise that
    #    would otherwise be binarized into phantom characters.
    denoised = cv2.GaussianBlur(gray, GAUSSIAN_KERNEL, 0)

    # 4. Adaptive Gaussian thresholding — computes a local weighted mean
    #    per 11×11 neighbourhood, compensating for uneven illumination.
    binary = cv2.adaptiveThreshold(
        denoised,
        BINARY_THRESHOLD_MAX,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        ADAPTIVE_BLOCK_SIZE,
        ADAPTIVE_C,
    )
    return binary


# ── PDF support ───────────────────────────────────────────────────────────

def pdf_bytes_to_matrices(file_bytes: bytes) -> List[np.ndarray]:
    """
    Rasterize every page of a PDF into OpenCV BGR matrices via pdf2image.

    Args:
        file_bytes: Raw PDF payload.

    Returns:
        List of BGR matrices, one per page (300 DPI rendering).

    Raises:
        InvalidImageError: if the PDF yields no readable pages.
    """
    try:
        pil_pages = convert_from_bytes(file_bytes, dpi=300)
    except Exception as exc:  # pdf2image raises various poppler errors
        raise InvalidImageError(f"Could not parse PDF: {exc}") from exc

    if not pil_pages:
        raise InvalidImageError("PDF contains no readable pages")

    # PIL RGB → OpenCV BGR: np.asarray gives RGB; cv2.cvtColor converts.
    matrices = []
    for page in pil_pages:
        rgb = np.asarray(page)
        matrices.append(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
    return matrices
