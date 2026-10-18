import openpyxl, json, re, collections, subprocess

# --- node loads js arrays into file ---
out = subprocess.run(['node','scripts/_loadjs.js'], capture_output=True, text=True).stdout
BO = out.index('BOOKS_JSON_BEGIN') + len('BOOKS_JSON_BEGIN')
NK = out.index('NOTES_KEYS_BEGIN')
books = json.loads(out[BO:NK].strip())
note_keys = set(json.loads(out[NK + len('NOTES_KEYS_BEGIN'):].strip()))
print("books-data entries:", len(books))
print("note keys:", len(note_keys))

# --- excel ---
wb = openpyxl.load_workbook('Книги.xlsx', data_only=True)
ws = wb.active
excel_rows = []
for r in ws.iter_rows(min_row=2, values_only=True):
    a, b, c = (list(r) + [None, None, None])[:3]
    if (a is None or str(a).strip() == '') and (b is None or str(b).strip() == ''):
        continue
    excel_rows.append({'author': str(a), 'title': str(b), 'genre': str(c)})
print("EXCEL rows:", len(excel_rows))

def norm(t):
    return t.replace('\n', ' ').replace('\r', ' ').rstrip()

# duplicate titles in excel
cc = collections.Counter(norm(e['title']) for e in excel_rows)
dups = {k: v for k, v in cc.items() if v > 1}
print("EXCEL duplicate titles:", len(dups))
for k, v in sorted(dups.items()):
    print("   DUP:", repr(k), "x", v, "| ", [e['genre'] for e in excel_rows if norm(e['title'])==k])

# current book titles
cur_titles = set(norm(b['title']) for b in books)

# NEW books (in excel, no note)
new_books = [(norm(e['title']), e['author'], e['genre']) for e in excel_rows if norm(e['title']) not in note_keys]
print("\nNEW books (no note):", len(new_books))
for t, a, g in new_books:
    print(f"  {t} | {a} | {g}")

# books in books-data but not in excel anymore (removed from excel) — these will vanish on rebuild
removed = [t for t in cur_titles if t not in set(norm(e['title']) for e in excel_rows)]
print("\nbooks-data titles NO LONGER in excel (will be dropped on rebuild):", len(removed))
for t in removed:
    print("   DROPPED:", repr(t))

# notes still in notes-data but not in excel (orphan)
orphans = [k for k in note_keys if k not in set(norm(e['title']) for e in excel_rows)]
print("\nnote keys with NO excel match (orphan):", len(orphans))
for k in orphans:
    print("   ORPHAN:", repr(k))

# notes present but excel title differs by whitespace only
print("\nDone.")
