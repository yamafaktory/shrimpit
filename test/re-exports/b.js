// b.js
export * from './a' // will import everything from a
export { foo as bar, yack } from './c' // will import foo & yack from c
export shake from './d' // will import the default from d
export { default as wolf } from './e' // will import the default from e
