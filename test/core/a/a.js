import test, { a as aFromB } from '../b/b'

import { User } from '../c/c'

export function a() {}

export const c = 1337

export default function d(){
    const f = function inner() {}
    f()
}

test()

aFromB()

const user = new User()
user.walk()
