from pathlib import Path

from app.preprocessing import extract_text_from_pdf


pdf_path = Path(r"C:/Users/Lenovo/Downloads/VACATION TO DO.pdf")

file_bytes = pdf_path.read_bytes()

text = extract_text_from_pdf(file_bytes)

print("========== EXTRACTED PDF TEXT ==========")
print(text)
print("=========================================")