import json, subprocess

out = subprocess.run(['node','scripts/_loadjs.js'], capture_output=True, text=True).stdout
BO = out.index('BOOKS_JSON_BEGIN') + len('BOOKS_JSON_BEGIN')
NK = out.index('NOTES_KEYS_BEGIN')
books = json.loads(out[BO:NK].strip())
note_keys = set(json.loads(out[NK + len('NOTES_KEYS_BEGIN'):].strip()))

new = []
for b in books:
    if b['title'] not in note_keys:
        new.append(b)

print("NEW BOOKS:", len(new))
for b in new:
    print(json.dumps(b, ensure_ascii=False))
    print("   TITLE_REPR:", repr(b['title']))
