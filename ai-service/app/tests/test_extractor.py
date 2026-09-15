"""
Unit tests for the Phase 5 entity-extraction module.

Run:  python -m pytest app/tests/test_extractor.py -v
"""

import datetime

from app.extractor import (
    clean_text,
    classify_document,
    extract_aadhaar,
    extract_dates,
    extract_entities,
    extract_expiry_date,
    extract_issue_date,
    extract_name,
    extract_pan,
)


# ── clean_text ────────────────────────────────────────────────────────────

def test_clean_text_trims_and_filters():
    assert clean_text(None) == []
    assert clean_text("") == []
    assert clean_text("  hello  \n\n   world  \n") == ["hello", "world"]


def test_clean_text_repairs_mojibake():
    # "café" double-encoded as latin-1 then read as utf-8.
    raw = "cafÃ©"
    assert clean_text(raw) == ["café"]


# ── classify_document ─────────────────────────────────────────────────────

def test_classify_pan_by_strong_keywords():
    assert classify_document(
        ["INCOME TAX DEPARTMENT", "Permanent Account Number"]
    ) == "PAN"

    # "tax" alone is not strong enough to classify a document as PAN.
    assert classify_document(["This is a tax document"]) == "Unknown"


def test_classify_aadhaar_by_strong_keywords():
    assert classify_document(
        ["UIDAI", "Government of India"]
    ) == "Aadhaar"

    # Gender / DOB alone are not strong enough to classify a document as Aadhaar.
    assert classify_document(["Male", "Date of Birth"]) == "Unknown"
    assert classify_document(["Female"]) == "Unknown"


def test_classify_unknown():
    assert classify_document(
        ["Grocery receipt", "Milk 30 rupees"]
    ) == "Unknown"


# ── extract_pan (with OCR error correction) ───────────────────────────────

def test_extract_pan_clean():
    lines = ["Income Tax Department", "ABGDE1234F"]
    assert extract_pan(lines) == "ABGDE1234F"


def test_extract_pan_corrects_digit_read_in_alpha_prefix():
    # Position 1-5 are letters: "8"→"B", "0"→"D".
    assert extract_pan(["8BCDE1234O"]) == "BBCDE1234O"
    assert extract_pan(["AB0DE1234F"]) == "ABDDE1234F"


def test_extract_pan_corrects_letter_read_in_numeric_suffix():
    # Positions 6-9 are digits: "I"→"1", "S"→"5", "O"→"0".
    assert extract_pan(["ABCDE1S34F"]) == "ABCDE1534F"
    assert extract_pan(["ABCDE12O4F"]) == "ABCDE1204F"


def test_extract_pan_corrects_last_character_digit():
    # Position 10 must be a letter — digits are repaired via the letter map,
    # trying each digit's most plausible letter misread first.
    assert extract_pan(["ABCDOI2345"]) == "ABCDO1234S"  # trailing 5 → S
    assert extract_pan(["ABCDE12340"]) == "ABCDE1234O"  # trailing 0 → O
    assert extract_pan(["ABCDE12341"]) == "ABCDE1234I"  # trailing 1 → I
    assert extract_pan(["ABCDE12348"]) == "ABCDE1234B"  # trailing 8 → B


def test_extract_pan_ignores_invalid_candidates():
    # 13-char run cannot form a valid 10-char PAN (lookahead fails).
    assert extract_pan(["ABCDE12345XYZ"]) is None
    assert extract_pan(["hello world"]) is None


# ── extract_aadhaar ───────────────────────────────────────────────────────

def test_extract_aadhaar_spaced():
    assert extract_aadhaar(
        ["Enrolment No: 2345 6789 0123"]
    ) == "2345 6789 0123"


def test_extract_aadhaar_unspaced():
    assert extract_aadhaar(
        ["234567890123"]
    ) == "2345 6789 0123"

def test_extract_aadhaar_missing():
    assert extract_aadhaar(
        ["No number here"]
    ) is None


# ── extract_dates ─────────────────────────────────────────────────────────

def test_extract_dates_formats_and_sorting():
    lines = ["DOB: 15/08/1990", "Expiry: 31-12-2028"]

    dates = extract_dates(lines)

    assert dates[0] == datetime.datetime(1990, 8, 15)
    assert dates[-1] == datetime.datetime(2028, 12, 31)
    assert dates == sorted(dates)


def test_extract_dates_two_digit_year():
    assert extract_dates(
        ["25/01/26"]
    ) == [datetime.datetime(2026, 1, 25)]


def test_extract_dates_rejects_invalid():
    assert extract_dates(
        ["32/13/2020"]
    ) == []


# ── extract_expiry_date / issue_date ──────────────────────────────────────

def test_extract_expiry_date_keywords():
    assert extract_expiry_date(
        ["Valid Till: 31/12/2028"]
    ) == "2028-12-31"

    assert extract_expiry_date(
        ["Valid Upto 31-12-2028"]
    ) == "2028-12-31"

    assert extract_expiry_date(
        ["Expiry Date: 01/02/2029"]
    ) == "2029-02-01"

    assert extract_expiry_date(
        ["Valid Until 15/03/2030"]
    ) == "2030-03-15"


def test_extract_expiry_date_ignores_non_adjacent_dates():
    assert extract_expiry_date(
        ["DOB: 15/08/1990"]
    ) is None


def test_extract_issue_date():
    assert extract_issue_date(
        ["Date of Issue: 12/05/2021"]
    ) == "2021-05-12"

    assert extract_issue_date(
        ["Issued 01/01/2020"]
    ) == "2020-01-01"


# ── extract_name ──────────────────────────────────────────────────────────

def test_extract_name_labeled():
    lines = ["Name: Rahul Sharma", "DOB: 15/08/1990"]
    assert extract_name(lines) == "Rahul Sharma"


def test_extract_name_title_case_heuristic():
    lines = [
        "UIDAI",
        "Government of India",
        "Rahul Sharma",
        "DOB: 15/08/1990",
    ]

    assert extract_name(lines) == "Rahul Sharma"


def test_extract_name_none():
    assert extract_name(
        ["income tax department", "permanent account number"]
    ) is None


# ── extract_entities aggregation ──────────────────────────────────────────

def test_extract_entities_aadhaar_card():
    raw = (
        "UIDAI\n"
        "Government of India\n"
        "Name: Priya Patel\n"
        "DOB: 22/11/1992\n"
        "2345 6789 0123\n"
        "Female\n"
    )

    result = extract_entities(raw)

    assert result["Document_Type"] == "Aadhaar"
    assert result["ID_Number"] == "2345 6789 0123"
    assert result["Date_of_Birth"] == "1992-11-22"
    assert result["Name"] == "Priya Patel"
    assert "Government of India" in result["Cleaned_Text_Array"]


def test_extract_entities_pan_card():
    raw = (
        "INCOME TAX DEPARTMENT\n"
        "Permanent Account Number\n"
        "ABCDE1234F\n"
        "Name: Vikram Singh\n"
        "Date of Issue: 10/04/2018\n"
    )

    result = extract_entities(raw)

    assert result["Document_Type"] == "PAN"
    assert result["ID_Number"] == "ABCDE1234F"
    assert result["Name"] == "Vikram Singh"
    assert result["Issue_Date"] == "2018-04-10"