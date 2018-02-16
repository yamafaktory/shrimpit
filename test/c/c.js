import { a, c } from '../a/a'

import { b } from '../b/b'

export class Cat extends b {
  run() {
    console.log("I'm running")
  }
}

export default class User extends b {
  walk() {
    console.log("I'm walking")
  }
  test = () => {
    const useless = true
    if (useless) {
    }
  }
}

a()

b()

console.log(c)
