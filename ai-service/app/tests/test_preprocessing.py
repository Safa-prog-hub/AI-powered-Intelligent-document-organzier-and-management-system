"""
Unit tests for the Phase 3 CV preprocessing module and Phase 6 semantic math.

Run:  python -m pytest app/tests/test_preprocessing.py -v
"""

import numpy as np
import pytest

from app.preprocessing import (
    BLUR_THRESHOLD,
    BlurryDocumentError,
    InvalidImageError,
    assert_sharp,
    bytes_to_image,
    detect_blur,
    preprocess_image,
)
from app.semantic import (
    calculate_cosine_similarity,
    cluster_tag,
    dbscan_cluster,
    generate_embedding,
    generate_filename,
)


# ── decoding ──────────────────────────────────────────────────────────────

def test_bytes_to_image_roundtrip():
    # Encode a synthetic image with cv2, decode it back.
    image = np.full((100, 100, 3), 255, dtype=np.uint8)
    ok, buffer = cv2_imencode(image)
    assert ok
    decoded = bytes_to_image(buffer.tobytes())
    assert decoded.shape == (100, 100, 3)


def test_bytes_to_image_rejects_garbage():
    with pytest.raises(InvalidImageError):
        bytes_to_image(b"this is not an image")


def test_bytes_to_image_rejects_empty():
    with pytest.raises(InvalidImageError):
        bytes_to_image(b"")


# ── blur detection ────────────────────────────────────────────────────────

def test_sharp_image_passes_blur_threshold():
    rng = np.random.default_rng(42)
    # High-frequency checkerboard → large Laplacian variance.
    image = np.tile(
        (np.indices((64, 64)).sum(axis=0) % 2) * 255, (3, 1, 1)
    ).transpose(1, 2, 0).astype(np.uint8)
    variance = detect_blur(image)
    assert variance >= BLUR_THRESHOLD
    assert assert_sharp(image) == variance


def test_blurry_image_fails_blur_threshold():
    # A constant (or near-constant) frame has ~zero Laplacian variance.
    image = np.full((100, 100, 3), 128, dtype=np.uint8)
    assert detect_blur(image) < BLUR_THRESHOLD
    with pytest.raises(BlurryDocumentError):
        assert_sharp(image)


# ── preprocessing pipeline ────────────────────────────────────────────────

def test_preprocess_image_doubles_dimensions_and_binarizes():
    image = np.full((100, 80, 3), 200, dtype=np.uint8)
    image[20:60, 20:60] = (30, 30, 30)  # dark block
    binary = preprocess_image(image)
    assert binary.shape == (200, 160)  # 2× both dimensions
    assert binary.dtype == np.uint8
    unique = np.unique(binary)
    assert set(unique.tolist()) <= {0, 255}  # pure black / pure white


# ── semantic math ─────────────────────────────────────────────────────────

def test_cosine_similarity_identical_and_orthogonal():
    assert calculate_cosine_similarity([1, 0, 0], [1, 0, 0]) == pytest.approx(1.0)
    assert calculate_cosine_similarity([1, 0, 0], [0, 1, 0]) == pytest.approx(0.0)
    assert calculate_cosine_similarity([0, 0, 0], [1, 1, 1]) == 0.0


def test_embedding_generation_shape_and_normalization():
    emb = generate_embedding("Income Tax Department Permanent Account Number")
    assert len(emb) > 0
    norm = float(np.linalg.norm(np.asarray(emb)))
    assert norm == pytest.approx(1.0, abs=1e-4)


def test_cluster_tag_join_and_seed():
    existing = [
        {"_id": "1", "embedding": generate_embedding("insurance policy premium"), "tag": "finance"},
        {"_id": "2", "embedding": generate_embedding("medical prescription"), "tag": "health"},
    ]
    tag, score = cluster_tag(generate_embedding("insurance policy premium payment"), existing)
    assert tag == "finance"
    assert score > 0.5

    tag, score = cluster_tag(generate_embedding("completely unrelated kitchen recipe"), existing)
    assert tag is None
    assert score < 0.5


def test_dbscan_cluster_groups_nearby_vectors():
    vectors = [
        generate_embedding("insurance policy premium"),
        generate_embedding("insurance claim document"),
        generate_embedding("health insurance renewal"),
        generate_embedding("vegetable curry recipe"),
    ]
    labels = dbscan_cluster(vectors, eps=0.35, min_samples=2)
    assert labels[0] == labels[1]  # clustered together
    assert labels[3] == -1  # outlier


# ── filename generation ───────────────────────────────────────────────────

def test_generate_filename_standardized():
    name = generate_filename(
        {"Document_Type": "Aadhaar", "Name": "Rahul Sharma", "extension": "jpg"}
    )
    assert name.startswith("Aadhaar_Rahul_Sharma_")
    assert name.endswith(".jpg")
    assert " " not in name


def test_generate_filename_sanitizes_unsafe_chars():
    name = generate_filename(
        {"Document_Type": "PAN", "Name": "Vikram/ Singh!", "extension": "PNG"}
    )
    assert name.endswith(".png")
    assert " " not in name and "/" not in name and "!" not in name


def cv2_imencode(image):
    import cv2

    return cv2.imencode(".png", image)
