import openpyxl, json

wb = openpyxl.load_workbook('Книги.xlsx', data_only=True)
ws = wb.active

def esc(t):
    return str(t).replace('\n', ' ').replace('\r', ' ').replace('"', '\\"')

def real_title(t):
    return str(t).replace('\n', ' ').replace('\r', ' ')

rows = []
titles = []
for r in ws.iter_rows(min_row=2, values_only=True):
    a, b, c = (list(r) + [None, None, None])[:3]
    if (a is None or str(a).strip() == '') and (b is None or str(b).strip() == ''):
        continue
    rows.append(
        '  {"author": "%s", "title": "%s", "genre": "%s"}' % (
            esc(a), esc(b), esc(c)
        )
    )
    titles.append(real_title(b))

out = 'const booksData = [\n' + ',\n'.join(rows) + '\n];\n'
with open('js/books-data.js', 'w', encoding='utf-8') as f:
    f.write(out)

print("rows written:", len(rows))

# dump the exact titles (actual strings) for note-key generation
with open('/tmp/titles.json', 'w', encoding='utf-8') as f:
    json.dump(titles, f, ensure_ascii=False)
print("titles dumped:", len(titles))
