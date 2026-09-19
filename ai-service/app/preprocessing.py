"""
preprocessing.py — Computer Vision preprocessing pipeline (Phase 3)

Raw physical scans are noisy: low resolution, harsh shadows, textured
backgrounds and skew all inflate OCR error rates. This module executes the
preprocessing sequence before Tesseract runs:

    1. Decode the uploaded byte buffer into a NumPy-backed OpenCV matrix.
    2. Blur safeguard — Laplacian variance on the grayscale image. A variance
       below ``BLUR_THRESHOLD`` (50.0) classifies the frame as excessively
       blurry and the payload is rejected before any OCR cost is incurred.
    3. Resolution enhancement — bicubic (INTER_CUBIC) upscaling to double
       width/height (~300 DPI baseline).
    4. Gaussian blur (3x3 kernel) to suppress high-frequency sensor noise.
    5. Otsu thresholding to convert the image into a clean binary image.
"""

from __future__ import annotations

from typing import List

import cv2
import numpy as np
from pdf2image import convert_from_bytes
import pymupdf


# ── Tunable pipeline constants ────────────────────────────────────────────

BLUR_THRESHOLD = 50.0
UPSCALE_FACTOR = 2.0
GAUSSIAN_KERNEL = (3, 3)
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
    responds strongly to edges. A low variance indicates few sharp edges.

    Args:
        image: BGR image matrix.

    Returns:
        Variance of the Laplacian. Higher values generally indicate a sharper
        image.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def assert_sharp(image: np.ndarray) -> float:
    """
    Run the blur safeguard.

    Raises:
        BlurryDocumentError: when the Laplacian variance is below the
        configured sharpness threshold.

    Returns:
        The measured Laplacian variance.
    """
    variance = detect_blur(image)

    if variance < BLUR_THRESHOLD:
        raise BlurryDocumentError(
            f"Document is too blurry for processing "
            f"(Laplacian variance {variance:.2f} < "
            f"{BLUR_THRESHOLD:.1f}). Please re-capture with "
            f"steady lighting and focus."
        )

    return variance


# ── Preprocessing pipeline ────────────────────────────────────────────────


def preprocess_image(image: np.ndarray) -> np.ndarray:
    """
    Transform a decoded image into an OCR-optimized binary matrix.

    Steps:
        1. Bicubic upscale to 2× dimensions.
        2. Convert BGR → grayscale.
        3. Apply mild 3×3 Gaussian blur.
        4. Apply Otsu thresholding to produce a binary image.

    Args:
        image: BGR image matrix.

    Returns:
        Single-channel binary matrix (H*2, W*2), values 0 or 255.
    """

    # 1. Resolution enhancement — double the image dimensions.
    upscaled = cv2.resize(
        image,
        None,
        fx=UPSCALE_FACTOR,
        fy=UPSCALE_FACTOR,
        interpolation=cv2.INTER_CUBIC,
    )

    # 2. Convert BGR image to grayscale.
    gray = cv2.cvtColor(upscaled, cv2.COLOR_BGR2GRAY)

    # 3. Mild Gaussian blur to reduce high-frequency noise.
    denoised = cv2.GaussianBlur(
        gray,
        GAUSSIAN_KERNEL,
        0,
    )

    # 4. Otsu thresholding automatically determines a suitable
    #    global threshold and produces a clean binary image.
    _, binary = cv2.threshold(
        denoised,
        0,
        BINARY_THRESHOLD_MAX,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU,
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

    except Exception as exc:
        raise InvalidImageError(
            f"Could not parse PDF: {exc}"
        ) from exc

    if not pil_pages:
        raise InvalidImageError(
            "PDF contains no readable pages"
        )

    # PIL RGB → OpenCV BGR.
    matrices = []

    for page in pil_pages:
        rgb = np.asarray(page)
        matrices.append(
            cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        )

    return matrices