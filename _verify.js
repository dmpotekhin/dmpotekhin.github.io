const fs = require('fs');
const vm = require('vm');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync('js/books-data.js','utf8') + ';this.__b=booksData;', ctx);
const ctx2 = vm.createContext({});
vm.runInContext(fs.readFileSync('js/notes-data.js','utf8') + ';this.__n=bookNotes;', ctx2);
const n = ctx2.__n;
const keys = ["На пенсию в 35","7 сил Основы бизнес-стратеги","Никогда-нибудь. Как выйти из тупика и найти себя","Автономное выживание","Власть и прогресс","Немцы после войны: Как Западной Германии удалось преодолеть нацизм"];
let ok = true;
keys.forEach(k => {
  const v = n[k];
  if (!v) { console.log('FAIL missing', k); ok = false; return; }
  const t = (v.theses||[]).length;
  const tk = (v.takeaway||'').length;
  console.log((t===5 && tk>40 ? 'OK  ' : 'FAIL'), t, 'theses,', tk, 'chars |', k);
  if (t!==5 || tk<40) ok = false;
});
console.log('BOOKS', ctx.__b.length, 'NOTES', Object.keys(n).length);
console.log(ok ? 'ALL_OK' : 'PROBLEMS');
