const fs = require('fs');
const src = fs.readFileSync('./js/books-data.js', 'utf8');
let b;
eval(src); // This will define the const `books` in the global scope? Actually, in Node, eval in global scope is tricky.
// Better to use the Function constructor? But let's try and see.
// Alternatively, we can extract the array by removing the const declaration.
// Since we know the format, we can do:
// Let's just try to eval and then access the global variable? In Node, global variables are in the global object.
// But note: we are in a function? We are in the global scope of the script.
// Actually, when we use eval in the global scope, it will create a global variable? Not exactly: in strict mode, it doesn't.
// Our script is not strict. Let's try and if it fails, we'll try another way.

// We'll wrap in a function and return the array? But the file doesn't return anything.

// Let's change approach: we know the file is of the form:
// const books = [ ... ];
// We can extract the array by removing the first line and the last line? Not reliable.

// Instead, let's use the fact that the file is valid JS and we can run it in a context that captures the variable.
// We can use the vm module.
const vm = require('vm');
const context = { books: null };
vm.runInContext(src, context, { filename: 'books-data.js' });
console.log(context.books.length);