"""
extractor.py — NLP sanitization, classification & entity extraction (Phase 5)

Raw Tesseract output is noisy: character misclassifications are systematic
(8→B, 0→D, 6→G, 1→I), encodings break, and layout artifacts pollute lines.
This module:

    1. ``clean_text``          — repairs encoding with ftfy, normalizes lines.
    2. ``classify_document``   — heuristic keyword classification (PAN/Aadhaar).
    3. ``extract_pan``         — OCR-error-corrected regex extraction.
    4. ``extract_aadhaar``     — 12-digit biometric identifier extraction.
    5. ``extract_dates``       — DOB / temporal extraction.
    6. ``extract_expiry_date`` — keyword-adjacent expiry parsing (Phase 6).
    7. ``extract_name``        — card-holder name heuristic.
    8. ``extract_entities``    — aggregation entry point.

Every function is pure and unit-testable (see tests/test_extractor.py).
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional

import ftfy

# ── Document classification ───────────────────────────────────────────────
DOCUMENT_PAN = "PAN"
DOCUMENT_AADHAAR = "Aadhaar"
DOCUMENT_UNKNOWN = "Unknown"

# ── Regex vocabulary ──────────────────────────────────────────────────────
# PAN: 5 uppercase letters, 4 digits, 1 uppercase letter.
PAN_STRICT_REGEX = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
# PAN candidates: any 10-char alphanumeric run (embedded in a line).
PAN_CANDIDATE_REGEX = re.compile(r"(?<![A-Z0-9])[A-Z0-9]{10}(?![A-Z0-9])")
# Aadhaar: 12 digits in 4-4-4 groups with optional single spaces.
AADHAAR_REGEX = re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")
# Dates: DD/MM/YYYY or DD-MM-YYYY (also accepts 2-digit years).
DATE_REGEX = re.compile(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b")
# Expiry keywords followed by an optional label + date (Phase 6).
EXPIRY_PATTERNS = [
    re.compile(
        r"(?<![A-Za-z0-9])(?:expiry|expires?|expiration|valid\s+(?:till|until|upto|through|to))"
        r"\s*(?:date)?\s*[:=\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        re.IGNORECASE,
    ),
]
# Issue keywords → issueDate (best-effort metadata enrichment).
ISSUE_PATTERNS = [
    re.compile(
        r"(?<![A-Za-z0-9])(?:issue|issued|date\s+of\s+issue|issuance)"
        r"\s*(?:date)?\s*[:=\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        re.IGNORECASE,
    ),
]
# Name label patterns: "Name : Rahul Sharma", "Name-RAHUL SHARMA", ...
NAME_LABEL_REGEX = re.compile(
    r"^\s*name\s*[:.\-]\s*(.+?)\s*$", re.IGNORECASE
)
# Words that disqualify a line from being a proper name.
NAME_STOPWORDS = {
    "government", "uidai", "male", "female", "address", "phone", "dob",
    "father", "mother", "husband", "wife", "signature", "date", "place",
    "india", "income", "tax", "department", "permanent", "account", "number",
    "card", "valid", "aadhaar", "pan", "enrolment", "enrollment",
}


# ── 1. Text sanitization ──────────────────────────────────────────────────

def clean_text(raw_text: str) -> List[str]:
    """
    Repair encoding corruption and normalize the OCR output into lines.

    Args:
        raw_text: Raw string produced by Tesseract.

    Returns:
        List of non-empty, whitespace-trimmed lines.
    """
    if not raw_text:
        return []

    # ftfy repairs mojibake / broken UTF-8 (e.g. double-encoded characters).
    fixed = ftfy.fix_text(raw_text)
    lines = [line.strip() for line in fixed.splitlines()]
    return [line for line in lines if line]


# ── 2. Document classification ────────────────────────────────────────────

def classify_document(text_lines: List[str]) -> str:
    """
    Classify the document type from keyword presence.

    Args:
        text_lines: Cleaned OCR lines.

    Returns:
        'PAN', 'Aadhaar' or 'Unknown'.
    """
    joined = " ".join(text_lines).lower()

    if "income tax" in joined or "tax" in joined:
        return DOCUMENT_PAN
    if "uidai" in joined or "male" in joined or "female" in joined:
        return DOCUMENT_AADHAAR
    return DOCUMENT_UNKNOWN


# ── 3. PAN extraction with OCR error correction ───────────────────────────

# OCR misread dictionaries (Phase 5): digits read as letters inside the
# alphabetic prefix; letters read as digits inside the numeric suffix.
_ALPHA_SLOT_FIXES = {"8": "B", "0": "D"}
_NUMERIC_SLOT_FIXES = {"I": "1", "S": "5", "O": "0"}
# Final character must be a letter — if OCR rendered a digit, the most
# visually plausible letter for that digit is tried first.
_LAST_LETTER_BY_DIGIT = {"0": "O", "1": "I", "5": "S", "8": "B"}
_LAST_LETTER_FALLBACK = ("O", "B", "S", "I")


def _correct_pan_candidate(candidate: str) -> List[str]:
    """
    Apply the localized OCR correction dictionaries to a 10-char candidate
    and return every plausible corrected form (deterministic ordering).

    Corrections (Phase 5 spec):
      • positions 1-5 (letters):   "8"→"B", "0"→"D"
      • positions 6-9 (digits):    "I"→"1", "S"→"5", "O"→"0"
      • position 10 (letter):      "0"→"O", "8"→"B", "5"→"S", "1"→"I"
    """
    candidate = candidate.upper()
    if len(candidate) != 10:
        return []

    prefix = "".join(_ALPHA_SLOT_FIXES.get(ch, ch) for ch in candidate[:5])
    numeric = "".join(_NUMERIC_SLOT_FIXES.get(ch, ch) for ch in candidate[5:9])
    last = candidate[9]

    # If the last char already is a letter, that is the single candidate.
    if last.isalpha():
        return [f"{prefix}{numeric}{last}"]

    # Otherwise try each plausible letter substitution — the digit's most
    # likely misread first, then the remaining fallbacks.
    primary = _LAST_LETTER_BY_DIGIT.get(last)
    order = (primary,) + tuple(f for f in _LAST_LETTER_FALLBACK if f != primary)
    return [f"{prefix}{numeric}{fix}" for fix in order]


def extract_pan(text_lines: List[str]) -> Optional[str]:
    """
    Locate a valid PAN number in the OCR lines.

    Strategy: scan each line for 10-character alphanumeric runs, apply the
    OCR correction dictionaries, and validate against the strict PAN regex
    ``^[A-Z]{5}[0-9]{4}[A-Z]$``.

    Args:
        text_lines: Cleaned OCR lines.

    Returns:
        The validated PAN string (with spaces stripped), or None.
    """
    for line in text_lines:
        compact = line.upper().replace(" ", "").replace("-", "")
        for candidate in PAN_CANDIDATE_REGEX.findall(compact):
            for corrected in _correct_pan_candidate(candidate):
                if PAN_STRICT_REGEX.match(corrected):
                    return corrected
    return None


# ── 4. Aadhaar extraction ─────────────────────────────────────────────────

def extract_aadhaar(text_lines: List[str]) -> Optional[str]:
    """
    Capture the 12-digit Aadhaar sequence, tolerating spacing variations.

    Args:
        text_lines: Cleaned OCR lines.

    Returns:
        The 12-digit Aadhaar number (spaces preserved as found), or None.
    """
    for line in text_lines:
        match = AADHAAR_REGEX.search(line)
        if match:
            return match.group(0)
    return None


# ── 5. Date extraction ────────────────────────────────────────────────────

def _parse_date(day: str, month: str, year: str) -> Optional[datetime]:
    """Safely parse DD/MM/YYYY components; 2-digit years map to 20xx."""
    try:
        y = int(year)
        if y < 100:
            y += 2000
        return datetime(y, int(month), int(day))
    except ValueError:
        return None


def extract_dates(text_lines: List[str]) -> List[datetime]:
    """
    Find every valid date in DD/MM/YYYY or DD-MM-YYYY format.

    Args:
        text_lines: Cleaned OCR lines.

    Returns:
        Chronologically sorted list of parsed dates.
    """
    found: List[datetime] = []
    for line in text_lines:
        for day, month, year in DATE_REGEX.findall(line):
            parsed = _parse_date(day, month, year)
            if parsed is not None:
                found.append(parsed)
    found.sort()
    return found


# ── 6. Expiry date extraction (Phase 6 — powers Expiry Alerts) ────────────

def extract_expiry_date(text_lines: List[str]) -> Optional[str]:
    """
    Extract the date immediately following expiry keywords such as
    "Expiry", "Valid Till", "Valid Upto", "Valid Until".

    Uses regex lookbehinds so only *adjacent* dates are captured, then
    normalizes the result to ISO 8601 (YYYY-MM-DD).

    Args:
        text_lines: Cleaned OCR lines.

    Returns:
        ISO 8601 date string, or None.
    """
    for line in text_lines:
        for pattern in EXPIRY_PATTERNS:
            match = pattern.search(line)
            if not match:
                continue
            day, month, year = re.split(r"[/-]", match.group(1))
            parsed = _parse_date(day, month, year)
            if parsed is not None:
                return parsed.date().isoformat()
    return None


# ── 7. Issue date extraction (best-effort metadata enrichment) ────────────

def extract_issue_date(text_lines: List[str]) -> Optional[str]:
    """
    Extract the date adjacent to issue keywords ("Issue", "Date of Issue").

    Args:
        text_lines: Cleaned OCR lines.

    Returns:
        ISO 8601 date string, or None.
    """
    for line in text_lines:
        for pattern in ISSUE_PATTERNS:
            match = pattern.search(line)
            if not match:
                continue
            day, month, year = re.split(r"[/-]", match.group(1))
            parsed = _parse_date(day, month, year)
            if parsed is not None:
                return parsed.date().isoformat()
    return None


# ── 8. Name extraction heuristic ──────────────────────────────────────────

def _is_plausible_name(line: str) -> bool:
    words = line.split()
    if not (2 <= len(words) <= 6):
        return False
    if any(any(ch.isdigit() for ch in word) for word in words):
        return False
    if not all(word[0].isupper() for word in words if word):
        return False
    lowered = line.lower()
    if any(stop in lowered for stop in NAME_STOPWORDS):
        return False
    return True


def extract_name(text_lines: List[str]) -> Optional[str]:
    """
    Heuristically locate the card-holder name.

    Priority:
        1. A line explicitly labelled "Name : ...".
        2. A Title-Case multi-word line (no digits, no stopwords) — works
           for Aadhaar cards where the name precedes the DOB block.
    """
    for line in text_lines:
        match = NAME_LABEL_REGEX.match(line)
        if match:
            name = match.group(1).strip().strip('".')
            if name and not any(ch.isdigit() for ch in name):
                return " ".join(name.split())
    for line in text_lines:
        if _is_plausible_name(line):
            return " ".join(line.split())
    return None


# ── 9. Aggregation entry point ────────────────────────────────────────────

def extract_entities(raw_text: str) -> dict:
    """
    Full pipeline: sanitize → classify → extract → aggregate.

    Args:
        raw_text: Raw OCR string.

    Returns:
        Dictionary with keys:
            Document_Type, ID_Number, Date_of_Birth, Name,
            Expiry_Date, Issue_Date, Cleaned_Text_Array
    """
    text_lines = clean_text(raw_text)
    doc_type = classify_document(text_lines)
    dates = extract_dates(text_lines)

    id_number = None
    if doc_type == DOCUMENT_PAN:
        id_number = extract_pan(text_lines)
    elif doc_type == DOCUMENT_AADHAAR:
        id_number = extract_aadhaar(text_lines)

    return {
        "Document_Type": doc_type,
        "ID_Number": id_number,
        "Date_of_Birth": dates[0].date().isoformat() if dates else None,
        "Name": extract_name(text_lines),
        "Expiry_Date": extract_expiry_date(text_lines),
        "Issue_Date": extract_issue_date(text_lines),
        "Cleaned_Text_Array": text_lines,
    }
