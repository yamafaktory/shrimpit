#!/usr/bin/env node

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
      allowImportExportEverywhere: true,
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
    this.src = this.cleanSrc(src)
  }

  addDir (extPath) {
    this.updateFilesTree([...this.getDir(extPath), this.getBase(extPath)])
  }

  addFile (extPath) {
    if (!(this.allowedTypes.test(this.getExt(extPath)))) return

    this.updateFilesTree([...this.getDir(extPath), this.getBase(extPath)], this.walkAST(extPath))
  }

  cleanSrc (src) {
    return src.filter(s => {
      if (s === '--tree') this.displayTree = true

      return s !== '--tree'
    })
  }

  dedupe (array) {
    // Dedupe with a set.
    return [...new Set(array)]
  }

  deExtensionize (path) {
    return [
      ...this.getDir(path),
      this.getBase(path, true)
    ].join('/')
  }

  error (e) {
    log(chalk.red(`! ${e} `))

    process.exit(1)
  }

  exec () {
    log(chalk.white.bgMagenta.bold(' Shrimpit! '))

    // Start reading and parsing the directories.
    this.src.map(target => this.read(null, target))

    if (this.displayTree) this.renderTree()

    this.renderUnused()
  }

  getAST (src) {
    try {
      return babylon.parse(src, this.parseOpts)
    } catch (e) {
      this.error(e)
    }
  }

  getBase (extPath, dropExt) {
    return dropExt ? path.parse(extPath).name : path.parse(extPath).base
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

  joinPaths (...paths) {
    return path.join(...paths)
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
    log(chalk.magenta.bgWhite(' > Files tree '))

    objectLog(this.filesTree)
  }

  renderUnused () {
    const { exports, imports } = this.modules
    let unresolved = new Set(this.dedupe(exports))

    this.dedupe(imports).forEach(i => unresolved.delete(i))

    log(chalk.magenta.bgWhite(' > Unused exports '))

    if (unresolved.size === 0) log(chalk.yellow('All Clear Ahead, Captain.'))
    else objectLog([...unresolved])
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

  walkAST (extPath) {
    const self = this
    let exports = []
    let imports = []

    const defaultExportVisitor = {
      Expression (path) {
        // Use path as default.
        exports.push(self.deExtensionize(extPath))
      },

      Function (path) {
        path.traverse(exportVisitor, true)
      }
    }

    const exportVisitor = {
      Identifier (path) {
        exports.push(path.node.name)

        // Stop traversal to avoid collecting unwanted identifiers.
        path.stop()
      },

      Statement (path, expectNamedFunction) {
        if (expectNamedFunction) exports.push(self.deExtensionize(extPath))
      }
    }

    traverse(this.getAST(fs.readFileSync(extPath, { encoding: 'utf8' })), {
      ExportAllDeclaration (path) {
        path.traverse(exportVisitor)
      },

      ExportDefaultDeclaration (path) {
        path.traverse(defaultExportVisitor)
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
        imports.push(self.joinPaths(extPath, '../', path.parent.source.value))
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
