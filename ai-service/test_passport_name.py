from app.extractor import extract_name, DOCUMENT_PASSPORT

lines = [
    "Passport/Passport",
    "Name/Nom (1)",
    "CHANG",
    "Given names/Prénoms (2)",
    "SHUJEN",
    "Place of birth/Lieu de naissance (3)",
    "SHENYANG",
    "Date of birth/Date de naissance (4)",
    "14 Oct 1993",
]

print(extract_name(lines, DOCUMENT_PASSPORT))