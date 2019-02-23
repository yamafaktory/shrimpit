import test, { a as aFromB } from '../b/b'

// User is a default export in `c`.
import User from '../c/c'

export function a() {}

export const c = 1337

export default function d() {
  const f = function inner() {}
  f()
}

test()

aFromB()

const user = new User()
user.walk()
