#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const util = require('util')

const babylon = require('babylon')
const chalk = require('chalk')
const cheerio = require('cheerio')
const merge = require('lodash.merge')
const traverse = require('babel-traverse').default

const log = i => console.log(i, '\n')
const objectLog = o => console.log(util.inspect(o, false, null, true), '\n')

class Shrimpit {
  constructor (argv) {
    // Remove execPath and path from argv.
    const [, , ...src] = argv

    this.allowedTypes = /^\.(jsx?|vue)$/
    this.filesTree = {}
    this.isVueTemplate = /^\.vue$/
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
        'dynamicImport',
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
      const flagRegex = /^--(\w+)$/i

      if (flagRegex.test(s)) {
        switch (s.match(flagRegex)[1]) {
          case 'help':
            this.displayHelp = true
            break

          case 'tree':
            this.displayTree = true
            break

          default:
            this.displayUnknownFlag = true
        }
      }

      return !flagRegex.test(s)
    })
  }

  dedupe (array) {
    // Dedupe with a set.
    return [...new Set(array)]
  }

  deExtensionize (filePath) {
    const base = this.getBase(filePath, true)

    return path.dirname([
      ...this.getDir(filePath),
      base === 'index' ? [] : base
    ].join('/'))
  }

  error (e) {
    log(chalk.red(`! ${e} `))

    process.exit(1)
  }

  exec () {
    log(chalk.white.bgMagenta.bold(' Shrimpit! '))

    if (this.displayUnknownFlag) return this.renderUnknownFlag()

    if (this.displayHelp) return this.renderHelp()

    // Start reading and parsing the directories.
    this.src.map(target => this.read(null, target))

    if (this.displayTree) this.renderTree()

    this.renderUnused()
  }

  getAST (src, path) {
    try {
      return babylon.parse(src, this.parseOpts)
    } catch (e) {
      this.error(`${e} in ${path}`)
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

  readFile (path) {
    try {
      const content = fs.readFileSync(path, { encoding: 'utf8' })

      return this.isVueTemplate.test(this.getExt(path))
        ? cheerio.load(content)('script').text()
        : content
    } catch (e) {
      this.error(e)
    }
  }

  renderHelp () {
    log([
      'Usage:',
      '  shrimpit [<file | directory> ...]',
      '',
      'Options:',
      ' --tree  Output the complete files tree',
      '',
      'Examples:',
      '  shrimpit test/a/a2.js',
      '  shrimpit test'
    ].join('\n'))
  }

  renderTree () {
    log(chalk.magenta.bgWhite(' > Files tree '))

    objectLog(this.filesTree)
  }

  renderUnknownFlag () {
    this.error('Unknown flag provided, try --help.')
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

        // Stop traversal as an expression was found.
        path.stop()
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

    traverse(this.getAST(this.readFile(extPath), extPath), {
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
        imports.push(
          self.deExtensionize(self.joinPaths(extPath, '../', path.parent.source.value))
        )
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
