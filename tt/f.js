// f.js
// Here we should resolve all the missing exports.
import useless from './a'
import shake, { a1, a2, bar, yack } from './b'

console.log(a1, a2, bar, yack, shake, useless)
