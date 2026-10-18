const fs = require('fs');
const vm = require('vm');

function load(path, varname) {
  const src = fs.readFileSync(path, 'utf8');
  const sandbox = {};
  const ctx = vm.createContext(sandbox);
  vm.runInContext(src + '\n;this.__result = ' + varname + ';', ctx);
  return sandbox.__result;
}

const books = load('js/books-data.js', 'booksData');
const notes = load('js/notes-data.js', 'bookNotes');
console.log('BOOKS_JSON_BEGIN');
process.stdout.write(JSON.stringify(books));
console.log('\nNOTES_KEYS_BEGIN');
process.stdout.write(JSON.stringify(Object.keys(notes)));
