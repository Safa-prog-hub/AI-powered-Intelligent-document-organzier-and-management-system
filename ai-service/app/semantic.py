"""
semantic.py — Semantic similarity, grouping & automation (Phase 6)

This module maps unstructured OCR text into a cognitive, semantic
framework:

    • ``generate_embedding``      — dense vector via a pre-trained
                                    sentence-transformer (all-MiniLM-L6-v2).
    • ``calculate_cosine_similarity`` — spatial proximity between vectors.
    • ``cluster_tag``             — join the nearest existing semantic
                                    cluster (threshold-based).
    • ``dbscan_cluster``          — density-based grouping utility for
                                    batch clustering of whole collections.
    • ``generate_filename``       — standardized, human-readable filenames
                                    (e.g. ``Aadhaar_Card_Rahul_2026-08-17.jpg``).

Model loading is lazy: the heavy sentence-transformers dependency is only
imported on first use. If the package is unavailable (constrained
environments), a deterministic hashing fallback keeps the service
functional while a warning is logged.
"""

from __future__ import annotations

import hashlib
import logging
import re
from datetime import datetime
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

logger = logging.getLogger("semantic")

MODEL_NAME = "all-MiniLM-L6-v2"
# Cosine similarity floor for joining an existing semantic cluster.
CLUSTER_JOIN_THRESHOLD = 0.72
# Fallback embedding dimensionality when the transformer is unavailable.
FALLBACK_DIM = 384

_model = None
_model_available = True


# ── Embedding generation ──────────────────────────────────────────────────

def _load_model():
    """Lazily load the sentence-transformer model (cached process-wide)."""
    global _model, _model_available
    if _model is not None:
        return _model
    if not _model_available:
        return None
    try:
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer(MODEL_NAME)
        logger.info("Loaded embedding model %s", MODEL_NAME)
    except Exception as exc:  # noqa: BLE001 — degrade gracefully
        _model_available = False
        logger.warning(
            "sentence-transformers unavailable (%s) — falling back to "
            "deterministic hashing embeddings. Install the dependency for "
            "production-grade semantic grouping.",
            exc,
        )
    return _model


def _fallback_embedding(text: str) -> List[float]:
    """
    Deterministic hashing-based fallback: splits the text into word n-grams,
    hashes each into a fixed-dimension bag, and L2-normalizes. This keeps
    the pipeline runnable without torch/sentence-transformers.
    """
    vector = np.zeros(FALLBACK_DIM, dtype=np.float32)
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    for token in tokens:
        digest = hashlib.blake2b(token.encode("utf-8"), digest_size=16).digest()
        index = int.from_bytes(digest[:4], "little") % FALLBACK_DIM
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector /= norm
    return vector.tolist()


def generate_embedding(text: str) -> List[float]:
    """
    Return the dense vector representation of the cleaned OCR text.

    Args:
        text: Cleaned OCR text (lines joined by spaces).

    Returns:
        Normalized embedding vector (list of floats).
    """
    model = _load_model()
    if model is None:
        return _fallback_embedding(text)
    return model.encode([text], normalize_embeddings=True)[0].tolist()


# ── Similarity mathematics ────────────────────────────────────────────────

def calculate_cosine_similarity(vec1: Sequence[float], vec2: Sequence[float]) -> float:
    """
    Cosine similarity between two embedding vectors.

    Args:
        vec1, vec2: Embedding vectors (any equal length).

    Returns:
        Score in [-1, 1]; 0 when either vector is zero-length.
    """
    a = np.asarray(vec1, dtype=np.float32)
    b = np.asarray(vec2, dtype=np.float32)
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0.0:
        return 0.0
    return float(np.dot(a, b) / denom)


# ── Semantic clustering ───────────────────────────────────────────────────

def cluster_tag(
    embedding: Sequence[float],
    existing: Sequence[Dict],
    threshold: float = CLUSTER_JOIN_THRESHOLD,
) -> Tuple[Optional[str], float]:
    """
    Join the closest existing semantic cluster (Phase 6 grouping).

    Args:
        embedding: Vector of the newly ingested document.
        existing: Records with shape ``[{'_id': str, 'embedding': [...],
                  'tag': str|null}, ...]``.
        threshold: Minimum cosine similarity required to join a cluster.

    Returns:
        ``(cluster_tag, best_score)`` — ``cluster_tag`` is None when no
        cluster is close enough (the caller then seeds a new cluster).
    """
    best_tag: Optional[str] = None
    best_score = -1.0
    for record in existing:
        record_embedding = record.get("embedding")
        if not record_embedding:
            continue
        score = calculate_cosine_similarity(embedding, record_embedding)
        if score > best_score:
            best_score = score
            best_tag = record.get("tag")

    if best_score >= threshold and best_tag:
        return best_tag, best_score
    return None, best_score


def dbscan_cluster(
    embeddings: List[Sequence[float]],
    eps: float = 0.25,
    min_samples: int = 2,
) -> List[int]:
    """
    Density-based clustering (DBSCAN flavour) over cosine distances.

    Pure-NumPy implementation: points within ``eps`` cosine distance of
    ``min_samples`` neighbours form a cluster; outliers are labelled -1.

    Args:
        embeddings: List of document vectors.
        eps: Maximum cosine distance for neighbourhood membership.
        min_samples: Minimum neighbours (incl. self) to be a core point.

    Returns:
        Cluster label per input vector (-1 = noise).
    """
    n = len(embeddings)
    if n == 0:
        return []
    matrix = np.asarray(embeddings, dtype=np.float32)
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    normalized = matrix / norms
    # Cosine distance = 1 - cosine similarity.
    distance = 1.0 - normalized @ normalized.T
    np.fill_diagonal(distance, 0.0)

    neighbours = [set(np.where(distance[i] <= eps)[0].tolist()) for i in range(n)]
    core = {i for i in range(n) if len(neighbours[i]) >= min_samples}

    labels: List[int] = [-1] * n
    cluster_id = 0
    for point in core:
        if labels[point] != -1:
            continue
        # BFS expansion through core-point neighbourhoods.
        seeds = set(neighbours[point])
        labels[point] = cluster_id
        while seeds:
            q = seeds.pop()
            if labels[q] == -1:
                labels[q] = cluster_id
            if labels[q] == cluster_id and q in core:
                seeds |= neighbours[q]
        cluster_id += 1
    return labels


# ── Filename automation ───────────────────────────────────────────────────

def generate_filename(metadata: Dict) -> str:
    """
    Synthesize a standardized, human-readable filename.

    Pattern: ``<Document_Type>_<Name>_<YYYY-MM-DD>.<ext>`` where spaces are
    replaced with underscores and unsafe characters are stripped.

    Args:
        metadata: Extraction dict — uses ``Document_Type`` /
                  ``documentCategory``, ``Name`` and ``extension``.

    Returns:
        e.g. ``Aadhaar_Card_Rahul_Sharma_2026-08-17.jpg``
    """
    doc_type = (
        metadata.get("Document_Type")
        or metadata.get("documentCategory")
        or "Document"
    )
    name = metadata.get("Name") or metadata.get("name") or "Untitled"
    extension = metadata.get("extension") or "jpg"

    raw = f"{doc_type}_{name}_{datetime.now().strftime('%Y-%m-%d')}"
    # Replace whitespace runs with underscores, then strip unsafe chars.
    sanitized = re.sub(r"\s+", "_", raw.strip())
    sanitized = re.sub(r"[^A-Za-z0-9_.\-]", "", sanitized)
    sanitized = sanitized[:200].strip("_")
    return f"{sanitized}.{extension.lstrip('.').lower()}"
