"""
extractor.py — NLP sanitization, classification & entity extraction (Phase 5)

This module:

    1. clean_text
        Repairs encoding issues and normalizes OCR lines.

    2. classify_document
        Classifies common Indian documents using multiple clues.

    3. extract_pan
        Extracts PAN numbers with OCR-error correction.

    4. extract_aadhaar
        Extracts 12-digit Aadhaar numbers with limited OCR correction.

    5. extract_driving_licence
        Extracts Indian Driving Licence numbers.

    6. extract_dates
        Extracts valid dates.

    7. extract_expiry_date
        Extracts expiry / validity dates.

    8. extract_issue_date
        Extracts issue dates.

    9. extract_name
        Extracts a likely document-holder name.

    10. extract_entities
        Main aggregation entry point.

All functions are pure and unit-testable.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional

import ftfy


# ─────────────────────────────────────────────────────────────────────────────
# Document classification constants
# ─────────────────────────────────────────────────────────────────────────────

DOCUMENT_PAN = "PAN"
DOCUMENT_AADHAAR = "Aadhaar"
DOCUMENT_DRIVING_LICENCE = "Driving Licence"
DOCUMENT_PASSPORT = "Passport"
DOCUMENT_VOTER_ID = "Voter ID"
DOCUMENT_MARKSHEET = "Marksheet"
DOCUMENT_BANK_STATEMENT = "Bank Statement"
DOCUMENT_INSURANCE = "Insurance"
DOCUMENT_SALARY_SLIP = "Salary Slip"
DOCUMENT_INVOICE = "Invoice"
DOCUMENT_UNKNOWN = "Unknown"


# ─────────────────────────────────────────────────────────────────────────────
# Regex vocabulary
# ─────────────────────────────────────────────────────────────────────────────

# PAN:
# 5 uppercase letters + 4 digits + 1 uppercase letter

PAN_STRICT_REGEX = re.compile(
    r"^[A-Z]{5}[0-9]{4}[A-Z]$"
)


# PAN candidates:
# Any isolated 10-character alphanumeric sequence.

PAN_CANDIDATE_REGEX = re.compile(
    r"(?<![A-Z0-9])[A-Z0-9]{10}(?![A-Z0-9])",
    re.IGNORECASE,
)


# Aadhaar:
# 12 digits in 4-4-4 groups with optional spaces.

AADHAAR_REGEX = re.compile(
    r"\b\d{4}\s?\d{4}\s?\d{4}\b"
)


# Limited OCR-tolerant Aadhaar pattern.
#
# Characters such as O/0, I/1, S/5, B/8 and G/6
# can occasionally be confused by OCR.

AADHAAR_FUZZY_REGEX = re.compile(
    r"(?<![A-Z0-9])"
    r"([0-9OQDILSBG]{4})\s*"
    r"([0-9OQDILSBG]{4})\s*"
    r"([0-9OQDILSBG]{4})"
    r"(?![A-Z0-9])",
    re.IGNORECASE,
)


# Driving Licence number.
#
# Common Indian format:
# XX00 2025 1234567
#
# Also allows the groups to be separated by spaces.

DRIVING_LICENCE_REGEX = re.compile(
    r"\b[A-Z]{2}\s*\d{2}\s*\d{4}\s*\d{5,8}\b",
    re.IGNORECASE,
)


# Dates:
# DD/MM/YYYY
# DD-MM-YYYY
# Also accepts single-digit day/month and 2-digit years.

DATE_REGEX = re.compile(
    r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b"
)


# Expiry keywords followed by a date.

EXPIRY_PATTERNS = [
    re.compile(
        r"(?<![A-Za-z0-9])"
        r"(?:expiry|expires?|expiration|"
        r"valid\s+(?:till|until|upto|up\s+to|through|to))"
        r"\s*(?:date)?\s*[:=\-]?\s*"
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        re.IGNORECASE,
    ),
]


# Issue-date keywords followed by a date.

ISSUE_PATTERNS = [
    re.compile(
        r"(?<![A-Za-z0-9])"
        r"(?:issue|issued|date\s+of\s+issue|issuance)"
        r"\s*(?:date)?\s*[:=\-]?\s*"
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        re.IGNORECASE,
    ),
]


# Name labels.
#
# Examples:
#   Name: Rahul Sharma
#   Name - Rahul Sharma
#   Full Name: Rahul Sharma
#   Holder Name: Rahul Sharma

NAME_LABEL_REGEX = re.compile(
    r"^\s*"
    r"(?:name|full\s+name|holder\s+name|"
    r"account\s+holder\s+name|policyholder\s+name|"
    r"policy\s*holder\s+name|insured\s+name|"
    r"employee\s+name|given\s+name(?:s)?|"
    r"applicant\s+name)"
    r"\s*[:.\-]?\s*(.*?)\s*$",
    re.IGNORECASE,
)


# A line containing only a name label.

NAME_ONLY_LABEL_REGEX = re.compile(
    r"^\s*"
    r"(?:name|full\s+name|holder\s+name|"
    r"account\s+holder\s+name|policyholder\s+name|"
    r"policy\s*holder\s+name|insured\s+name|"
    r"employee\s+name|given\s+name(?:s)?|"
    r"applicant\s+name)"
    r"\s*[:.\-]?\s*$",
    re.IGNORECASE,
)


# ─────────────────────────────────────────────────────────────────────────────
# Name filtering vocabulary
# ─────────────────────────────────────────────────────────────────────────────

NAME_STOPWORDS = {
    "government",
    "uidai",
    "male",
    "female",
    "address",
    "phone",
    "mobile",
    "dob",
    "birth",
    "father",
    "mother",
    "husband",
    "wife",
    "son",
    "daughter",
    "signature",
    "date",
    "place",
    "india",
    "income",
    "tax",
    "department",
    "permanent",
    "account",
    "number",
    "card",
    "valid",
    "aadhaar",
    "aadhar",
    "pan",
    "enrolment",
    "enrollment",
    "driving",
    "licence",
    "license",
    "passport",
    "voter",
    "election",
    "commission",
    "marksheet",
    "university",
    "college",
    "school",
    "bank",
    "statement",
    "insurance",
    "policy",
    "premium",
    "salary",
    "employee",
    "earnings",
    "deductions",
    "invoice",
    "subtotal",
    "total",
    "amount",
    "gstin",
}


# ─────────────────────────────────────────────────────────────────────────────
# 1. Text sanitization
# ─────────────────────────────────────────────────────────────────────────────

def clean_text(raw_text: str) -> List[str]:
    """
    Repair encoding corruption and normalize OCR output into lines.

    Args:
        raw_text: Raw string produced by Tesseract.

    Returns:
        List of non-empty, whitespace-trimmed lines.
    """

    if not raw_text:
        return []

    fixed = ftfy.fix_text(raw_text)

    lines = [
        line.strip()
        for line in fixed.splitlines()
    ]

    return [
        line
        for line in lines
        if line
    ]


# ─────────────────────────────────────────────────────────────────────────────
# 2. Document classification
# ─────────────────────────────────────────────────────────────────────────────

def classify_document(text_lines: List[str]) -> str:
    """
    Classify the document using multiple independent clues.

    Strong document-specific phrases receive higher scores than
    generic words. This helps prevent false classifications such
    as treating every document containing "tax" as a PAN card.

    Returns:
        One of the supported document-type constants.
    """

    joined = " ".join(text_lines).lower()

    scores = {
        DOCUMENT_PAN: 0,
        DOCUMENT_AADHAAR: 0,
        DOCUMENT_DRIVING_LICENCE: 0,
        DOCUMENT_PASSPORT: 0,
        DOCUMENT_VOTER_ID: 0,
        DOCUMENT_MARKSHEET: 0,
        DOCUMENT_BANK_STATEMENT: 0,
        DOCUMENT_INSURANCE: 0,
        DOCUMENT_SALARY_SLIP: 0,
        DOCUMENT_INVOICE: 0,
    }


    # ─────────────────────────────────────────────────────────
    # DRIVING LICENCE
    # ─────────────────────────────────────────────────────────

    if "driving licence" in joined:
        scores[DOCUMENT_DRIVING_LICENCE] += 8

    if "driving license" in joined:
        scores[DOCUMENT_DRIVING_LICENCE] += 8

    if "dl no" in joined or "dl number" in joined:
        scores[DOCUMENT_DRIVING_LICENCE] += 7

    if "licence number" in joined or "license number" in joined:
        scores[DOCUMENT_DRIVING_LICENCE] += 5

    if DRIVING_LICENCE_REGEX.search(joined):
        scores[DOCUMENT_DRIVING_LICENCE] += 6


    # ─────────────────────────────────────────────────────────
    # PAN
    # ─────────────────────────────────────────────────────────

    if "income tax department" in joined:
        scores[DOCUMENT_PAN] += 8

    elif "income tax" in joined:
        scores[DOCUMENT_PAN] += 6

    if "permanent account number" in joined:
        scores[DOCUMENT_PAN] += 8

    if "pan card" in joined:
        scores[DOCUMENT_PAN] += 7

    if "pan no" in joined or "pan number" in joined:
        scores[DOCUMENT_PAN] += 6

    # A valid PAN-shaped candidate is supporting evidence.

    for line in text_lines:

        compact = re.sub(
            r"[^A-Za-z0-9]",
            "",
            line,
        ).upper()

        if PAN_STRICT_REGEX.fullmatch(compact):
            scores[DOCUMENT_PAN] += 4
            break

    # IMPORTANT:
    # We intentionally DO NOT use "tax" alone as PAN evidence.
    #
    # A bank statement, invoice or other financial document
    # may also contain the word "tax".


    # ─────────────────────────────────────────────────────────
    # AADHAAR
    # ─────────────────────────────────────────────────────────

    if "aadhaar" in joined:
        scores[DOCUMENT_AADHAAR] += 8

    if "aadhar" in joined:
        scores[DOCUMENT_AADHAAR] += 7

    if "uidai" in joined:
        scores[DOCUMENT_AADHAAR] += 8

    if "unique identification authority" in joined:
        scores[DOCUMENT_AADHAAR] += 8

    if "enrolment no" in joined or "enrollment no" in joined:
        scores[DOCUMENT_AADHAAR] += 6

    # If OCR missed "Aadhaar", a 12-digit number plus
    # Aadhaar-like contextual clues can still help.

    if AADHAAR_REGEX.search(joined):

        if any(
            clue in joined
            for clue in (
                "date of birth",
                "dob",
                "male",
                "female",
                "address",
                "government of india",
            )
        ):
            scores[DOCUMENT_AADHAAR] += 5


    # ─────────────────────────────────────────────────────────
    # PASSPORT
    # ─────────────────────────────────────────────────────────

    if "passport" in joined:
        scores[DOCUMENT_PASSPORT] += 8

    if "passport no" in joined:
        scores[DOCUMENT_PASSPORT] += 5

    if "passport number" in joined:
        scores[DOCUMENT_PASSPORT] += 5

    if "republic of india" in joined:
        scores[DOCUMENT_PASSPORT] += 4

    if "nationality" in joined and "india" in joined:
        scores[DOCUMENT_PASSPORT] += 3


    # ─────────────────────────────────────────────────────────
    # VOTER ID
    # ─────────────────────────────────────────────────────────

    if "voter" in joined:
        scores[DOCUMENT_VOTER_ID] += 6

    if "voter id" in joined:
        scores[DOCUMENT_VOTER_ID] += 7

    if "elector" in joined:
        scores[DOCUMENT_VOTER_ID] += 5

    if "election commission" in joined:
        scores[DOCUMENT_VOTER_ID] += 7

    if "epic no" in joined or "epic number" in joined:
        scores[DOCUMENT_VOTER_ID] += 7


    # ─────────────────────────────────────────────────────────
    # MARKSHEET / EDUCATION
    # ─────────────────────────────────────────────────────────

    if "marksheet" in joined:
        scores[DOCUMENT_MARKSHEET] += 8

    if "mark sheet" in joined:
        scores[DOCUMENT_MARKSHEET] += 8

    # School report cards may not contain the word "marksheet".
    if "report card" in joined:
        scores[DOCUMENT_MARKSHEET] += 8

    if "statement of marks" in joined:
        scores[DOCUMENT_MARKSHEET] += 7

    if "marks statement" in joined:
        scores[DOCUMENT_MARKSHEET] += 7

    if "academic performance" in joined:
        scores[DOCUMENT_MARKSHEET] += 4

    if "marks obtained" in joined:
        scores[DOCUMENT_MARKSHEET] += 4

    if "scholastic areas" in joined:
        scores[DOCUMENT_MARKSHEET] += 4

    if "examination" in joined:
        scores[DOCUMENT_MARKSHEET] += 3

    if "semester" in joined:
        scores[DOCUMENT_MARKSHEET] += 3

    if "cgpa" in joined:
        scores[DOCUMENT_MARKSHEET] += 4

    if "percentage" in joined:
        scores[DOCUMENT_MARKSHEET] += 3

    if "university" in joined and (
        "marks" in joined
        or "result" in joined
        or "semester" in joined
    ):
        scores[DOCUMENT_MARKSHEET] += 4


    # ─────────────────────────────────────────────────────────
    # BANK STATEMENT
    # ─────────────────────────────────────────────────────────

    if "bank statement" in joined:
        scores[DOCUMENT_BANK_STATEMENT] += 8

    if "account statement" in joined:
        scores[DOCUMENT_BANK_STATEMENT] += 7

    if "account number" in joined:
        scores[DOCUMENT_BANK_STATEMENT] += 3

    if "ifsc" in joined:
        scores[DOCUMENT_BANK_STATEMENT] += 4

    if "transaction" in joined:
        scores[DOCUMENT_BANK_STATEMENT] += 3

    if "opening balance" in joined:
        scores[DOCUMENT_BANK_STATEMENT] += 4

    if "closing balance" in joined:
        scores[DOCUMENT_BANK_STATEMENT] += 4


    # ─────────────────────────────────────────────────────────
    # INSURANCE
    # ─────────────────────────────────────────────────────────

    if "insurance" in joined:
        scores[DOCUMENT_INSURANCE] += 7

    if "policy number" in joined:
        scores[DOCUMENT_INSURANCE] += 6

    if "policy no" in joined:
        scores[DOCUMENT_INSURANCE] += 6

    if "policyholder" in joined:
        scores[DOCUMENT_INSURANCE] += 6

    if "policy holder" in joined:
        scores[DOCUMENT_INSURANCE] += 6

    if "insured" in joined:
        scores[DOCUMENT_INSURANCE] += 4

    if "premium" in joined:
        scores[DOCUMENT_INSURANCE] += 4

    if "sum assured" in joined:
        scores[DOCUMENT_INSURANCE] += 5


    # ─────────────────────────────────────────────────────────
    # SALARY SLIP
    # ─────────────────────────────────────────────────────────

    if "salary slip" in joined:
        scores[DOCUMENT_SALARY_SLIP] += 8

    if "salary statement" in joined:
        scores[DOCUMENT_SALARY_SLIP] += 7

    if "payslip" in joined:
        scores[DOCUMENT_SALARY_SLIP] += 8

    if "pay slip" in joined:
        scores[DOCUMENT_SALARY_SLIP] += 8

    if "gross salary" in joined:
        scores[DOCUMENT_SALARY_SLIP] += 5

    if "net salary" in joined:
        scores[DOCUMENT_SALARY_SLIP] += 5

    if "deductions" in joined and "earnings" in joined:
        scores[DOCUMENT_SALARY_SLIP] += 5

    if "employee id" in joined and "salary" in joined:
        scores[DOCUMENT_SALARY_SLIP] += 5


    # ─────────────────────────────────────────────────────────
    # INVOICE
    # ─────────────────────────────────────────────────────────

    if "tax invoice" in joined:
        scores[DOCUMENT_INVOICE] += 8

    if "invoice" in joined:
        scores[DOCUMENT_INVOICE] += 7

    if "invoice no" in joined:
        scores[DOCUMENT_INVOICE] += 6

    if "invoice number" in joined:
        scores[DOCUMENT_INVOICE] += 6

    if "bill to" in joined:
        scores[DOCUMENT_INVOICE] += 4

    if "subtotal" in joined:
        scores[DOCUMENT_INVOICE] += 3

    if "total amount" in joined:
        scores[DOCUMENT_INVOICE] += 3

    if "gstin" in joined:
        scores[DOCUMENT_INVOICE] += 5


    # ─────────────────────────────────────────────────────────
    # Select strongest classification
    # ─────────────────────────────────────────────────────────

    best_type = max(
        scores,
        key=scores.get,
    )

    best_score = scores[best_type]

    # Require meaningful evidence.

    if best_score < 3:
        return DOCUMENT_UNKNOWN

    return best_type


# ─────────────────────────────────────────────────────────────────────────────
# 3. PAN extraction with OCR correction
# ─────────────────────────────────────────────────────────────────────────────

# OCR correction dictionaries.

_ALPHA_SLOT_FIXES = {
    "8": "B",
    "0": "D",
}

_NUMERIC_SLOT_FIXES = {
    "I": "1",
    "S": "5",
    "O": "0",
}

_LAST_LETTER_BY_DIGIT = {
    "0": "O",
    "1": "I",
    "5": "S",
    "8": "B",
}

_LAST_LETTER_FALLBACK = (
    "O",
    "B",
    "S",
    "I",
)


def _correct_pan_candidate(
    candidate: str,
) -> List[str]:
    """
    Apply localized OCR corrections to a 10-character PAN candidate.

    PAN structure:

        positions 1-5  -> letters
        positions 6-9  -> digits
        position 10    -> letter
    """

    candidate = candidate.upper()

    if len(candidate) != 10:
        return []

    prefix = "".join(
        _ALPHA_SLOT_FIXES.get(ch, ch)
        for ch in candidate[:5]
    )

    numeric = "".join(
        _NUMERIC_SLOT_FIXES.get(ch, ch)
        for ch in candidate[5:9]
    )

    last = candidate[9]

    # Last character is already a letter.
    if last.isalpha():
        return [
            f"{prefix}{numeric}{last}"
        ]

    # Otherwise try plausible OCR corrections.

    primary = _LAST_LETTER_BY_DIGIT.get(last)

    if primary is None:
        order = _LAST_LETTER_FALLBACK
    else:
        order = (
            primary,
            *(
                fix
                for fix in _LAST_LETTER_FALLBACK
                if fix != primary
            ),
        )

    return [
        f"{prefix}{numeric}{fix}"
        for fix in order
    ]


def extract_pan(
    text_lines: List[str],
) -> Optional[str]:
    """
    Locate a valid PAN number in OCR lines.

    Returns:
        Validated PAN string or None.
    """

    for line in text_lines:

        compact = (
            line.upper()
            .replace(" ", "")
            .replace("-", "")
        )

        for candidate in PAN_CANDIDATE_REGEX.findall(
            compact
        ):

            for corrected in _correct_pan_candidate(
                candidate
            ):

                if PAN_STRICT_REGEX.fullmatch(
                    corrected
                ):
                    return corrected

    return None


# ─────────────────────────────────────────────────────────────────────────────
# 4. Aadhaar extraction
# ─────────────────────────────────────────────────────────────────────────────

_AADHAAR_OCR_FIXES = str.maketrans(
    {
        "O": "0",
        "Q": "0",
        "D": "0",
        "I": "1",
        "L": "1",
        "S": "5",
        "B": "8",
        "G": "6",
    }
)


def _normalize_aadhaar_candidate(
    groups: tuple[str, str, str],
) -> Optional[str]:
    """
    Normalize a fuzzy OCR Aadhaar candidate.

    Returns:
        12-digit Aadhaar number or None.
    """

    combined = "".join(groups).upper()

    corrected = combined.translate(
        _AADHAAR_OCR_FIXES
    )

    if len(corrected) != 12:
        return None

    if not corrected.isdigit():
        return None

    return corrected


def extract_aadhaar(
    text_lines: List[str],
) -> Optional[str]:
    """
    Extract a 12-digit Aadhaar number.

    First tries an exact 12-digit pattern.

    Then tries limited OCR correction for common character
    substitutions.

    Returns:
        Aadhaar number in XXXX XXXX XXXX format, or None.
    """

    # First: exact extraction.

    for line in text_lines:

        match = AADHAAR_REGEX.search(line)

        if match:

            digits = re.sub(
                r"\s+",
                "",
                match.group(0),
            )

            if len(digits) == 12:

                return (
                    f"{digits[:4]} "
                    f"{digits[4:8]} "
                    f"{digits[8:12]}"
                )


    # Second: limited OCR-tolerant extraction.

    for line in text_lines:

        match = AADHAAR_FUZZY_REGEX.search(line)

        if not match:
            continue

        candidate = _normalize_aadhaar_candidate(
            (
                match.group(1),
                match.group(2),
                match.group(3),
            )
        )

        if candidate:

            digits = re.sub(
                r"\s+",
                "",
                candidate,
            )

            if len(digits) == 12:

                return (
                    f"{digits[:4]} "
                    f"{digits[4:8]} "
                    f"{digits[8:12]}"
                )

    return None


# ─────────────────────────────────────────────────────────────────────────────
# 5. Driving Licence extraction
# ─────────────────────────────────────────────────────────────────────────────

def extract_driving_licence(
    text_lines: List[str],
) -> Optional[str]:
    """
    Locate a Driving Licence number.

    Example:
        XX00 2025 1234567

    Returns:
        Driving Licence number with spaces removed,
        or None.
    """

    for line in text_lines:

        match = DRIVING_LICENCE_REGEX.search(
            line
        )

        if match:

            return re.sub(
                r"\s+",
                "",
                match.group(0),
            ).upper()

    return None


# ─────────────────────────────────────────────────────────────────────────────
# 6. Date extraction
# ─────────────────────────────────────────────────────────────────────────────

def _parse_date(
    day: str,
    month: str,
    year: str,
) -> Optional[datetime]:
    """
    Safely parse DD/MM/YYYY components.

    Two-digit years are interpreted as 20xx.
    """

    try:

        y = int(year)

        if y < 100:
            y += 2000

        return datetime(
            y,
            int(month),
            int(day),
        )

    except ValueError:
        return None


def extract_dates(
    text_lines: List[str],
) -> List[datetime]:
    """
    Find every valid date in DD/MM/YYYY or DD-MM-YYYY.

    Returns:
        Chronologically sorted list of dates.
    """

    found: List[datetime] = []

    for line in text_lines:

        for day, month, year in DATE_REGEX.findall(
            line
        ):

            parsed = _parse_date(
                day,
                month,
                year,
            )

            if parsed is not None:
                found.append(parsed)

    found.sort()

    return found


# ─────────────────────────────────────────────────────────────────────────────
# 7. Expiry date extraction
# ─────────────────────────────────────────────────────────────────────────────

def extract_expiry_date(
    text_lines: List[str],
) -> Optional[str]:
    """
    Extract the date following expiry keywords.

    Examples:
        Expiry
        Expires
        Valid Till
        Valid Upto
        Valid Until

    Returns:
        ISO date string or None.
    """

    for line in text_lines:

        for pattern in EXPIRY_PATTERNS:

            match = pattern.search(line)

            if not match:
                continue

            day, month, year = re.split(
                r"[/-]",
                match.group(1),
            )

            parsed = _parse_date(
                day,
                month,
                year,
            )

            if parsed is not None:
                return parsed.date().isoformat()

    return None


# ─────────────────────────────────────────────────────────────────────────────
# 8. Issue date extraction
# ─────────────────────────────────────────────────────────────────────────────

def extract_issue_date(
    text_lines: List[str],
) -> Optional[str]:
    """
    Extract the date adjacent to issue keywords.

    Returns:
        ISO date string or None.
    """

    for line in text_lines:

        for pattern in ISSUE_PATTERNS:

            match = pattern.search(line)

            if not match:
                continue

            day, month, year = re.split(
                r"[/-]",
                match.group(1),
            )

            parsed = _parse_date(
                day,
                month,
                year,
            )

            if parsed is not None:
                return parsed.date().isoformat()

    return None


# ─────────────────────────────────────────────────────────────────────────────
# 9. Name extraction
# ─────────────────────────────────────────────────────────────────────────────

def _clean_name_candidate(
    name: str,
) -> str:
    """
    Clean OCR noise from a possible document-holder name.

    Keeps normal name characters while removing harmless OCR
    punctuation/noise such as brackets and stray symbols.
    """

    name = name.strip()

    # Remove common OCR punctuation/noise.

    name = re.sub(
        r"[^A-Za-z.' -]",
        " ",
        name,
    )

    # Collapse repeated whitespace.

    name = " ".join(
        name.split()
    )

    # Remove stray apostrophes/hyphens
    # from the beginning/end.

    name = name.strip(
        "' -."
    )

    return name


def _is_plausible_name(
    line: str,
) -> bool:
    """
    Check whether a line looks like a person's name.

    Accepts both:
        Rahul Sharma
        RAHUL SHARMA

    because OCR commonly converts all text to uppercase.
    """

    line = _clean_name_candidate(line)

    words = line.split()

    # Name should contain 2-6 words.

    if not (
        2 <= len(words) <= 6
    ):
        return False

    # Names should not contain digits.

    if any(
        any(
            ch.isdigit()
            for ch in word
        )
        for word in words
    ):
        return False

    # Remove punctuation for validation.

    normalized_words = []

    for word in words:

        cleaned = re.sub(
            r"[^A-Za-z.'-]",
            "",
            word,
        )

        if not cleaned:
            return False

        normalized_words.append(
            cleaned
        )

    # Every word should start with a letter.

    if not all(
        word[0].isalpha()
        for word in normalized_words
    ):
        return False

    lowered = line.lower()

    # Reject document/system terms.

    if any(
        stop in lowered
        for stop in NAME_STOPWORDS
    ):
        return False

    # Reject lines that are obviously too long.

    if len(line) > 80:
        return False

    return True


def extract_name(
    text_lines: List[str],
    document_type: str = DOCUMENT_UNKNOWN,
) -> Optional[str]:
    """
    Locate the document-holder name.

    Uses document-specific strategies first, followed by
    the existing generic fallback.
    """

    # ------------------------------------------------------------
    # 1. Explicit Name: Rahul Sharma
    # ------------------------------------------------------------

    for line in text_lines:

        match = NAME_LABEL_REGEX.match(line)

        if not match:
            continue

        name = _clean_name_candidate(
            match.group(1)
        )

        if name and _is_plausible_name(name):
            return name


    # ------------------------------------------------------------
    # 2. Name: on one line, actual name on next line
    # ------------------------------------------------------------

    for index, line in enumerate(
        text_lines
    ):

        if not NAME_ONLY_LABEL_REGEX.match(
            line
        ):
            continue

        for next_index in (
            index + 1,
            index + 2,
        ):

            if next_index >= len(
                text_lines
            ):
                continue

            candidate = _clean_name_candidate(
                text_lines[next_index]
            )

            if _is_plausible_name(
                candidate
            ):
                return candidate


    # ------------------------------------------------------------
    # 3. PAN-specific fallback
    #
    # PAN cards commonly contain an uppercase holder name.
    # Prefer clean uppercase candidates and avoid lines that
    # look like OCR noise or signatures.
    # ------------------------------------------------------------

    if document_type == DOCUMENT_PAN:

        pan_candidates = []

        for index, line in enumerate(
            text_lines
        ):

            candidate = _clean_name_candidate(
                line
            )

            if not _is_plausible_name(
                candidate
            ):
                continue

            words = candidate.split()

            score = 0

            # Strong preference for normal alphabetic words.

            if all(
                re.fullmatch(
                    r"[A-Za-z]+",
                    word,
                )
                for word in words
            ):
                score += 5

            # PAN holder names are often uppercase.

            if candidate.isupper():
                score += 5

            # Prefer 2-3 word names.

            if 2 <= len(words) <= 3:
                score += 3

            # Penalize suspiciously short words.

            if any(
                len(word) <= 1
                for word in words
            ):
                score -= 4

            # Penalize OCR punctuation/noise.

            if re.search(
                r"[^A-Za-z ]",
                candidate,
            ):
                score -= 5

            # Signature text should never win.

            if "signature" in candidate.lower():
                score -= 20

            pan_candidates.append(
                (
                    score,
                    index,
                    candidate,
                )
            )

        if pan_candidates:

            pan_candidates.sort(
                key=lambda item: (
                    item[0],
                    -item[1],
                ),
                reverse=True,
            )

            return pan_candidates[0][2]


    # ------------------------------------------------------------
    # 4. Aadhaar-specific fallback
    #
    # Prefer clean alphabetic multi-word names and reject
    # obvious OCR artifacts containing symbols.
    # ------------------------------------------------------------

    if document_type == DOCUMENT_AADHAAR:

        aadhaar_candidates = []

        for index, line in enumerate(
            text_lines
        ):

            candidate = _clean_name_candidate(
                line
            )

            if not _is_plausible_name(
                candidate
            ):
                continue

            words = candidate.split()

            score = 0

            # A real name should consist of alphabetic words.

            if all(
                re.fullmatch(
                    r"[A-Za-z]+",
                    word,
                )
                for word in words
            ):
                score += 6

            # Prefer 2-4 word names.

            if 2 <= len(words) <= 4:
                score += 3

            # Prefer title case or uppercase.

            if candidate.isupper():
                score += 3

            elif all(
                word[0].isupper()
                for word in words
                if word
            ):
                score += 3

            # Reject OCR symbols strongly.

            if re.search(
                r"[^A-Za-z ]",
                candidate,
            ):
                score -= 10

            # Very short words are often OCR noise.

            if any(
                len(word) <= 1
                for word in words
            ):
                score -= 5

            aadhaar_candidates.append(
                (
                    score,
                    index,
                    candidate,
                )
            )

        if aadhaar_candidates:

            aadhaar_candidates.sort(
                key=lambda item: (
                    item[0],
                    -item[1],
                ),
                reverse=True,
            )

            return aadhaar_candidates[0][2]


    # ------------------------------------------------------------
    # 5. Generic fallback
    #
    # Keep the original behaviour for other document types
    # and existing tests.
    # ------------------------------------------------------------

    for line in text_lines:

        candidate = _clean_name_candidate(
            line
        )

        if _is_plausible_name(
            candidate
        ):
            return candidate

    return None


# ─────────────────────────────────────────────────────────────────────────────
# 10. Aggregation entry point
# ─────────────────────────────────────────────────────────────────────────────

def extract_entities(
    raw_text: str,
) -> dict:
    """
    Full extraction pipeline:

        raw OCR text
             ↓
        clean text
             ↓
        classify document
             ↓
        extract ID
             ↓
        extract dates
             ↓
        extract name
             ↓
        aggregate result

    Returns:
        Dictionary containing:

            Document_Type
            ID_Number
            Date_of_Birth
            Name
            Expiry_Date
            Issue_Date
            Cleaned_Text_Array
    """

    # ─────────────────────────────────────────────
    # Clean OCR text
    # ─────────────────────────────────────────────

    text_lines = clean_text(
        raw_text
    )


    # ─────────────────────────────────────────────
    # Classify document
    # ─────────────────────────────────────────────

    doc_type = classify_document(
        text_lines
    )


    # ─────────────────────────────────────────────
    # Extract dates
    # ─────────────────────────────────────────────

    dates = extract_dates(
        text_lines
    )


    # ─────────────────────────────────────────────
    # Extract document-specific ID
    # ─────────────────────────────────────────────

    id_number = None

    if doc_type == DOCUMENT_PAN:

        id_number = extract_pan(
            text_lines
        )

    elif doc_type == DOCUMENT_AADHAAR:

        id_number = extract_aadhaar(
            text_lines
        )

    elif doc_type == DOCUMENT_DRIVING_LICENCE:

        id_number = extract_driving_licence(
            text_lines
        )


    # ─────────────────────────────────────────────
    # Aggregate
    # ─────────────────────────────────────────────

    return {

        "Document_Type": doc_type,

        "ID_Number": id_number,

        "Date_of_Birth": (
            dates[0].date().isoformat()
            if dates
            else None
        ),

        "Name": extract_name(
            text_lines,
            doc_type,
        ),

        "Expiry_Date": extract_expiry_date(
            text_lines
        ),

        "Issue_Date": extract_issue_date(
            text_lines
        ),

        "Cleaned_Text_Array": text_lines,
    }