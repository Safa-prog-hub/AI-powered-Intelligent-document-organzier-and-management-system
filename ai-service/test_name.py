from app.extractor import extract_name, DOCUMENT_MARKSHEET

lines = [
    "CANDIDATE'S FULL NAME (SURNAME FIRST)",
    "SHAIKH RAHIL AHMED SHAIKH AHMED",
]

print(extract_name(lines, DOCUMENT_MARKSHEET))