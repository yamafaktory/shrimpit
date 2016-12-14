const fs = require('fs')
const path = require('path')
const util = require('util')

const babylon = require('babylon')
const chalk = require('chalk')
const merge = require('lodash.merge')
const traverse = require('babel-traverse').default

const log = i => console.log(i, '\n')
const objectLog = o => console.log(util.inspect(o, false, null, true), '\n')

class Shrimpit {
  constructor (argv) {
    // Remove execPath and path from argv.
    const [, , ...src] = argv

    this.allowedTypes = /^\.jsx?$/
    this.filesTree = {}
    this.modules = {
      exports: [],
      imports: []
    }
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

  checkModules () {
    const { exports, imports } = this.modules

    this.modules.exports = this.dedupe(exports)
    this.modules.imports = this.dedupe(imports)

    log(chalk.black.bgWhite(' > All exports and imports '))
    objectLog(this.modules)
  }

  dedupe (array) {
    // Dedupe with a set.
    return [...new Set(array)]
  }

  error (e) {
    log(chalk.white.bgRed(`! ${e} `))
  }

  exec () {
    log(chalk.white.bgMagenta.bold(' Shrimpit! '))

    // Start reading and parsing the directories.
    this.src.map(target => this.read(null, target))

    this.checkModules()

    this.renderTree()
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

      try {
        fs.readdirSync(extPath).map(file => this.read(extPath, file))
      } catch (e) {
        this.error(e)
      }
    } else if (this.isFile(extPath)) {
      this.addFile(extPath)
    }
  }

  renderTree () {
    log(chalk.black.bgWhite(' > Files tree '))
    objectLog(this.filesTree)
  }

  walkAST (extPath) {
    let exports = []
    let imports = []
    const exportVisitor = {
      Identifier (path) {
        exports.push(path.node.name)
        // Stop traversal to avoid collecting unwanted identifiers.
        path.stop()
      }
    }

    traverse(this.getAST(fs.readFileSync(extPath, { encoding: 'utf8' })), {
      ExportAllDeclaration (path) {
        path.traverse(exportVisitor)
      },

      ExportDefaultDeclaration (path) {
        path.traverse(exportVisitor)
      },

      ExportDefaultSpecifier (path) {
        path.traverse(exportVisitor)
      },

      ExportNamedDeclaration (path) {
        path.traverse(exportVisitor)
      },

      ExportNamespaceSpecifier (path) {
        path.traverse(exportVisitor)
      },

      ExportSpecifier (path) {
        path.traverse(exportVisitor)
      },

      ImportDefaultSpecifier (path) {
        imports.push(path.node.local.name)
      },

      ImportNamespaceSpecifier (path) {
        imports.push(path.node.local.name)
      },

      ImportSpecifier (path) {
        imports.push(path.node.local.name)
      }
    })

    exports = this.dedupe(exports)
    this.modules.exports.push(...exports)

    imports = this.dedupe(imports)
    this.modules.imports.push(...imports)

    return { exports, imports }
  }
}

const shrimpit = new Shrimpit(process.argv)

shrimpit.exec()
