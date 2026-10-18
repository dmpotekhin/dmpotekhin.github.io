const fs = require('fs');
const vm = require('vm');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync('js/books-data.js','utf8') + ';this.__b=booksData;', ctx);
const b = ctx.__b;
b.filter(x => x.title.includes('сил')).forEach(x => console.log(JSON.stringify(x.title), x.title.length));
const src = fs.readFileSync('js/notes-data.js','utf8');
const m = src.match(/"7 сил[^"]*"/g);
console.log('NOTE KEYS:', m);
