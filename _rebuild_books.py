import openpyxl
import json

wb = openpyxl.load_workbook("Книги.xlsx")
ws = wb.active

books = []
for row in ws.iter_rows(min_row=2, values_only=True):
    if row[0] is None and row[1] is None and row[2] is None:
        break
    author = str(row[0]) if row[0] is not None else ""
    title = str(row[1]) if row[1] is not None else ""
    genre = str(row[2]) if row[2] is not None else ""
    title = title.replace("\n", " ").replace("\r", " ")
    books.append({"author": author, "title": title, "genre": genre})

js_array = json.dumps(books, ensure_ascii=False, indent=2)
with open("js/books-data.js", "w", encoding="utf-8") as f:
    f.write(f"const booksData = {js_array};\n")

print(f"Generated js/books-data.js with {len(books)} books.")
