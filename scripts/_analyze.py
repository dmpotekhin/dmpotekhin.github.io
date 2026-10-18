import openpyxl, json, re, collections

# --- load Excel ---
wb = openpyxl.load_workbook('Книги.xlsx', data_only=True)
ws = wb.active
excel_rows = []
for r in ws.iter_rows(min_row=2, values_only=True):
    a, b, c = (list(r) + [None, None, None])[:3]
    if (a is None or str(a).strip() == '') and (b is None or str(b).strip() == ''):
        continue
    excel_rows.append({'author': str(a), 'title': str(b), 'genre': str(c)})
print("EXCEL rows:", len(excel_rows))

# normalize title (escape handled by rebuild)
def norm(t):
    return t.replace('\n', ' ').replace('\r', ' ').rstrip()

# --- load books-data.js ---
def extract_js(path, varname):
    with open(path, encoding='utf-8') as f:
        txt = f.read()
    m = re.search(re.escape(varname) + r'\s*=\s*(\[.*\]);\s*$', txt, re.S)
    if m:
        return json.loads(m.group(1))
    raise ValueError(f"could not extract {varname} from {path}")

books = extract_js('js/books-data.js', 'booksData')  # list
print("books-data count:", len(books))

# note keys
def extract_notes(path):
    with open(path, encoding='utf-8') as f:
        txt = f.read()
    m = re.search(r'bookNotes\s*=\s*(\{.*\});\s*$', txt, re.S)
    if not m:
        raise ValueError("could not extract bookNotes")
    return json.loads(m.group(1))
notes = extract_notes('js/notes-data.js')
print("notes-data keys:", len(notes))

# current book titles set
cur_titles = set()
for b in books:
    cur_titles.add(norm(b['title']))

# excel titles
excel_titles = set()
for e in excel_rows:
    excel_titles.add(norm(e['title']))

# duplicates in excel
c = collections.Counter(norm(e['title']) for e in excel_rows)
dups = {k: v for k, v in c.items() if v > 1}
print("EXCEL duplicate titles:", len(dups))
for k, v in sorted(dups.items()):
    print("   DUP:", repr(k), "x", v)

# NEW books: in excel but not in notes-data keys
note_keys = set(notes.keys())
new_books = []
for e in excel_rows:
    t = norm(e['title'])
    if t not in note_keys:
        new_books.append((t, e['author'], e['genre']))

print("\nNEW book count (in excel, no note):", len(new_books))
for t, a, g in new_books:
    print(f"  {t} | {a} | {g}")

# Also: books with a note but NOT in excel (orphans/renamed)
orphans = [k for k in note_keys if k not in excel_titles]
print("\nNotes with NO excel match (orphan/renamed):", len(orphans))
for k in orphans:
    print("   ORPHAN:", repr(k))

# Also total excel rows vs books-data diff
print("\nExcel rows:", len(excel_rows), "| books-data entries:", len(books))
