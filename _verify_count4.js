const fs = require('fs');
const src = fs.readFileSync('./js/books-data.js', 'utf8');
eval(src);
console.log(books.length);