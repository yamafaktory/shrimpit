// f.js
// Here we should resolve all the missing exports.
import defaultFromA from './a'
import shake, { a1, a2, bar, yack } from './b'
import defaultFromC from './c'

console.log(a1, a2, bar, yack, shake, defaultFromA, defaultFromC)
