#!/usr/bin/env node
const Shrimpit = require('./lib')

const shrimpit = new Shrimpit(process.argv)

shrimpit.exec()
