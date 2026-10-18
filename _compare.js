const fs = require('fs');
const vm = require('vm');

const booksSrc = fs.readFileSync('js/books-data.js', 'utf8');
const notesSrc = fs.readFileSync('js/notes-data.js', 'utf8');

const ctx = vm.createContext({});
vm.runInContext(booksSrc + '\n;this.__books = booksData;', ctx);
const books = ctx.__books;

const ctx2 = vm.createContext({});
vm.runInContext(notesSrc + '\n;this.__notes = bookNotes;', ctx2);
const notes = ctx2.__notes;

const noteKeys = Object.keys(notes);
const missing = books.filter(b => !(b.title in notes));
const orphans = noteKeys.filter(k => !books.some(b => b.title === k));

console.log('BOOKS:', books.length);
console.log('NOTES:', noteKeys.length);
console.log('MISSING_COUNT:', missing.length);
console.log('--- MISSING ---');
missing.forEach(b => console.log(JSON.stringify({ title: b.title, author: b.author, genre: b.genre })));
console.log('ORPHANS_COUNT:', orphans.length);
orphans.slice(0, 20).forEach(k => console.log('ORPHAN:', JSON.stringify(k)));
