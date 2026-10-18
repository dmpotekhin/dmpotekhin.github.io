const fs = require('fs');
const vm = require('vm');
function load(path, varname) {
  const src = fs.readFileSync(path, 'utf8');
  const sandbox = {};
  vm.runInContext(src + '\n;this.__r=' + varname + ';', vm.createContext(sandbox));
  return sandbox.__r;
}
const books = load('js/books-data.js', 'booksData');
const notes = load('js/notes-data.js', 'bookNotes');
console.log('books:', books.length, '| notes:', Object.keys(notes).length);
// all books have a note?
let missing = books.filter(b => !notes[b.title]);
console.log('books WITHOUT a note:', missing.length);
missing.forEach(b => console.log('  MISSING:', JSON.stringify(b.title)));
// new 12 — present with 5 theses + takeaway
const NEW = [
 "Как работает музыка","Завоеватели Как Португальцы первую мировую империю",
 "Феникс  Роман о том, как Devops \u00a0меняет бизнес к лучшему","Coca-Cola История великого напитка",
 "Законы человеческой природы","Богиня Глкозы","Гибкое сознание","Человек, который смеется",
 "Собор парижской Богоматери","Отверженные","Ускоряйся Наука Devops","Непрерывный рефакторинг"
];
let bad = 0;
for (const t of NEW) {
  const n = notes[t];
  if (!n) { console.log('NEW MISSING KEY:', t); bad++; continue; }
  if (!Array.isArray(n.theses) || n.theses.length !== 5) { console.log('BAD theses count:', t, n.theses && n.theses.length); bad++; }
  if (!n.takeaway) { console.log('NO takeaway:', t); bad++; }
}
console.log('NEW-check problems:', bad);
// duplicate note keys?
const keys = Object.keys(notes);
const dup = keys.filter((k,i) => keys.indexOf(k) !== i);
console.log('dup keys:', dup.length);
