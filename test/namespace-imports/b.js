// b.js
import * as x from './a'

// Here x is a namespace (object) containing all the exports of `a`, even the
// `default` one!
console.log(x)
