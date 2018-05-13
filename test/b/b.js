import { Cat } from '../c/c'

import * as test from '../a/a'

import unamedFunction from '../d/d'

export function a() {}

export async function b() {}

export default {
  propA: 8080,
  propB: _ => _,
  propC: false,
}

const cat = new Cat()

cat.run()

test()

unamedFunction()
