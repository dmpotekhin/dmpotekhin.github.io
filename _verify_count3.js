const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('./js/books-data.js', 'utf8');
// Create a context
const context = vm.createContext({});
// Now run the script in this context
vm.runInContext(src, context);
console.log(context.books.length);