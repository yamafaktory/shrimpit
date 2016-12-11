const fs = require('fs')
const path = require('path')
const util = require('util')

const babylon = require('babylon')
const merge = require('lodash.merge')
const traverse = require('babel-traverse').default

const log = i => console.log(util.inspect(i, false, null, true))

class Shrimpit {
  constructor (argv) {
    // Remove execPath and path from argv.
    const [, , ...src] = argv

    this.allowedTypes = /^\.jsx?$/
    this.filesTree = {}
    this.parseOpts = {
      plugins: [
        'asyncFunctions',
        'asyncGenerators',
        'classConstructorCall',
        'classProperties',
        'decorators',
        'doExpressions',
        'exponentiationOperator',
        'exportExtensions',
        'flow',
        'functionSent',
        'functionBind',
        'jsx',
        'objectRestSpread',
        'trailingFunctionCommas'
      ],
      sourceType: 'module'
    }
    this.src = src
  }

  addDir (extPath) {
    this.updateFilesTree([...this.getDir(extPath), this.getBase(extPath)])
  }

  addFile (extPath) {
    if (!(this.allowedTypes.test(this.getExt(extPath)))) return

    this.updateFilesTree([...this.getDir(extPath), this.getBase(extPath)], this.walkAST(extPath))
  }

  deepFindIdentifiers (obj) {
    const identifiers = []
    const find = obj => {
      if (obj === null) return

      if (obj.type === 'Identifier') identifiers.push(obj.name)

      for (let prop in obj) {
        if (obj.hasOwnProperty(prop) && typeof obj[prop] === 'object') {
          find(obj[prop])
        }
      }
    }

    // Trigger recursive find.
    find(obj)

    // Dedupe with a set.
    return [...new Set(identifiers)]
  }

  error (e) {
    log(e)
  }

  exec () {
    this.src.map(target => this.read(null, target))

    this.render()
  }

  getAST (src) {
    try {
      return babylon.parse(src, this.parseOpts)
    } catch (e) {
      this.error(e)
    }
  }

  getBase (extPath) {
    return path.parse(extPath).base
  }

  getDir (extPath) {
    return path.parse(extPath).dir.split(path.sep)
  }

  getExt (extPath) {
    return path.parse(extPath).ext
  }

  isDir (target) {
    try {
      return fs.statSync(target).isDirectory()
    } catch (e) {
      this.error(e)
    }
  }

  isFile (target) {
    try {
      return fs.statSync(target).isFile()
    } catch (e) {
      this.error(e)
    }
  }

  updateFilesTree (arrayPath, modules = null) {
    const arrayPathCleaned = arrayPath.filter(segment => segment !== '')

    this.filesTree = merge(
      this.filesTree,
      JSON.parse([
        '{',
        arrayPathCleaned.map(segment => `"${segment}"`).join(':{'),
        `:${JSON.stringify(modules)}`,
        '}'.repeat(arrayPathCleaned.length)
      ].join(''))
    )
  }

  read (rootPath, target) {
    const extPath = path.normalize(
      `${rootPath !== null ? rootPath + '/' : ''}${target}`
    )

    if (this.isDir(extPath)) {
      this.addDir(extPath)

      fs.readdirSync(extPath).map(file => this.read(extPath, file))
    } else if (this.isFile(extPath)) {
      this.addFile(extPath)
    }
  }

  render () {
    log('----------------------------')
    log(this.filesTree)
  }

  walkAST (extPath) {
    const modules = {
      exports: {},
      imports: {}
    }
    const self = this

    traverse(this.getAST(fs.readFileSync(extPath, { encoding: 'utf8' })), {
      enter(path) {
        log(path.node)
        const isExport = /^Export/.test(path.node.type)
        const isImport = /^Import/.test(path.node.type)

        if (isExport || isImport) {
          modules[`${isExport ? 'exports' : 'imports'}`] = self.deepFindIdentifiers(path.node)
        }
      }
    })

    return modules
  }
}

const shrimpit = new Shrimpit(process.argv)

shrimpit.exec()
