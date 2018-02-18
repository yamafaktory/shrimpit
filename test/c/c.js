import { a, c } from '../a/a'

import { b } from '../b/b'

export class Cat extends b {
  run() {
    console.log("I'm running")
  }
}

const GLOBAL_OPTIONS = {}
const Global = {}

export default class User extends b {
  static a = {}
  walk() {
    console.log("I'm walking")
  }
  test = () => {
    const useless = true
    if (useless) {
      Global.method(this.objProperty, this.objProperty2, {
        ...GLOBAL_OPTIONS,
        someProperty: true,
      })
    }
  }
}

a()

b()

console.log(c)
