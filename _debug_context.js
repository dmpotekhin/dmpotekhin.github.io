const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('./js/books-data.js', 'utf8');
const context = vm.createContext({});
vm.runInContext(src, context);
console.log('Context keys:', Object.keys(context));