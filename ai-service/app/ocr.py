"""
ocr.py — Tesseract LSTM OCR integration (Phase 4)

Feeds the optimized binary matrix into Tesseract 4/5's LSTM neural network:

    • OEM 1  — force the neural-net LSTM engine (abandons legacy
               pattern-matching engines).
    • PSM 6  — assume a single uniform text block (ideal for cropped
               identity cards / fixed-layout government documents).
    • lang='eng+hin' — joint English + Hindi probability evaluation for
               Indian government documents (Aadhaar, PAN, etc.).

The CPU-bound Tesseract invocation is wrapped in ``asyncio.to_thread`` so
the FastAPI ASGI event loop is never blocked during OCR.
"""

from __future__ import annotations

import asyncio

import numpy as np
import pytesseract
from PIL import Image

# LSTM-only engine mode, single uniform block segmentation.
TESSERACT_CONFIG = "--oem 1 --psm 6"
# English + Hindi script models (requires tesseract-ocr-eng/-hin traineddata).
OCR_LANGUAGE = "eng+hin"


def configure_tesseract(path: str | None = None) -> None:
    """
    Point pytesseract at the Tesseract executable when it is not on PATH.

    Args:
        path: Absolute path to the tesseract binary, e.g. '/usr/bin/tesseract'.
    """
    if path:
        pytesseract.pytesseract.tesseract_cmd = path


def _run_tesseract(image_matrix: np.ndarray) -> str:
    """
    Synchronous Tesseract invocation — runs inside a worker thread.

    Args:
        image_matrix: Preprocessed (ideally binary) image matrix.

    Returns:
        Raw OCR string, possibly mixing English and Hindi scripts.
    """
    pil_image = Image.fromarray(image_matrix)
    return pytesseract.image_to_string(
        pil_image,
        lang=OCR_LANGUAGE,
        config=TESSERACT_CONFIG,
    )


async def extract_text(image_matrix: np.ndarray) -> str:
    """
    Asynchronously extract text from a preprocessed image matrix.

    Runs the blocking Tesseract call in the default thread pool so the
    ASGI event loop stays responsive to concurrent health checks and
    other in-flight requests.

    Args:
        image_matrix: Preprocessed image matrix (from preprocessing.py).

    Returns:
        Raw OCR text string.
    """
    return await asyncio.to_thread(_run_tesseract, image_matrix)


async def extract_text_from_pages(pages: list[np.ndarray]) -> str:
    """
    Run OCR across multiple pages (PDFs) concurrently.

    Args:
        pages: List of preprocessed matrices, one per PDF page.

    Returns:
        Concatenated raw text with page separators.
    """
    results = await asyncio.gather(*(extract_text(page) for page in pages))
    return "\n\n".join(results)
