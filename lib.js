#!/usr/bin/env node
const assert = require('assert')
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

module.exports = class Shrimpit {
  constructor(argv) {
    // Remove execPath and path from argv.
    const [, , ...src] = argv

    this.allowedTypes = /^\.(jsx?|vue)$/
    this.filesTree = {}
    this.isVueTemplate = /^\.vue$/
    this.modules = {
      exports: [],
      imports: [],
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
        'trailingFunctionCommas',
      ],
      sourceType: 'module',
    }
    this.src = this.cleanSrc(src)
  }

  addDir(extPath) {
    this.updateFilesTree([...this.getDir(extPath), this.getBase(extPath)])
  }

  addFile(extPath) {
    if (!this.allowedTypes.test(this.getExt(extPath))) return

    this.updateFilesTree(
      [...this.getDir(extPath), this.getBase(extPath)],
      this.walkAST(extPath)
    )
  }

  cleanSrc(src) {
    return src.filter(s => {
      const flagRegex = /^--(\w+)$/i

      if (flagRegex.test(s)) {
        switch (s.match(flagRegex)[1]) {
          case 'help':
            this.displayHelp = true
            break

          case 'json':
            this.displayJSON = true
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

  dedupe(array) {
    return array.reduce((acc, item) => {
      if (
        acc.filter(element => this.deepStrictEqual(element, item)).length === 0
      ) {
        acc.push(item)
      }
      return acc
    }, [])
  }

  deepStrictEqual(a, b) {
    try {
      assert.deepStrictEqual(a, b)
    } catch (e) {
      return false
    }
    return true
  }

  error(e) {
    log(chalk.red(`! ${e} `))

    process.exit(1)
  }

  exec() {
    !this.displayJSON && log(chalk.white.bgMagenta.bold(' Shrimpit! '))

    if (this.displayUnknownFlag) return this.renderUnknownFlag()

    if (this.displayHelp) return this.renderHelp()

    // Start reading and parsing the directories.
    this.src.map(target => this.read(null, target))

    if (this.displayJSON) {
      return this.renderToJSON()
    } else {
      if (this.displayTree) this.renderTree()
      this.renderUnused()
    }
  }

  getAST(src, path) {
    try {
      return babylon.parse(src, this.parseOpts)
    } catch (e) {
      this.error(`${e} in ${path}`)
    }
  }

  getBase(extPath, dropExt) {
    return dropExt ? path.parse(extPath).name : path.parse(extPath).base
  }

  getDir(extPath) {
    return path.parse(extPath).dir.split(path.sep)
  }

  getExt(extPath) {
    return path.parse(extPath).ext
  }

  getParent(filePath) {
    const base = this.getBase(filePath, true)

    return path.dirname(
      [...this.getDir(filePath), base === 'index' ? [] : base].join(path.sep)
    )
  }

  isDir(target) {
    try {
      return fs.statSync(target).isDirectory()
    } catch (e) {
      this.error(e)
    }
  }

  isFile(target) {
    try {
      return fs.statSync(target).isFile()
    } catch (e) {
      this.error(e)
    }
  }

  joinPaths(...paths) {
    return path.join(...paths)
  }

  read(rootPath, target) {
    const extPath = path.normalize(
      `${rootPath !== null ? rootPath + path.sep : ''}${target}`
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

  readFile(path) {
    try {
      const content = fs.readFileSync(path, { encoding: 'utf8' })

      return this.isVueTemplate.test(this.getExt(path))
        ? cheerio
            .load(content)('script')
            .text()
        : content
    } catch (e) {
      this.error(e)
    }
  }

  renderHelp() {
    log(
      [
        'Usage:',
        '  shrimpit [<file | directory> ...]',
        '',
        'Options:',
        ' --json  Returns JSON',
        ' --tree  Outputs the complete files tree',
        '',
        'Examples:',
        '  shrimpit test/a/a.js',
        '  shrimpit test',
      ].join('\n')
    )
  }

  renderToJSON() {
    return JSON.stringify({
      'Files tree': this.renderTree(true),
      'Unused exports': this.renderUnused(true),
    })
  }

  renderTree(toJSON) {
    if (toJSON) {
      return this.filesTree
    } else {
      log(chalk.magenta.bgWhite(' > Files tree '))

      objectLog(this.filesTree)
    }
  }

  renderUnknownFlag() {
    this.error('Unknown flag provided, try --help.')
  }

  renderUnused(toJSON) {
    const { exports, imports } = this.modules
    const unresolved = exports.reduce((acc, item) => {
      if (
        imports.filter(
          element =>
            element.unnamedDefault
              ? // Skip the name in the comparison as a default unnamed export
                // can be imported with any name.
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export
                this.deepStrictEqual(
                  { location: element.location, unnamedDefault: true },
                  { location: item.location, unnamedDefault: item.unnamedDefault }
                )
              : // Compare the raw element & item.
                this.deepStrictEqual(element, item)
        ).length === 0
      ) {
        acc.push(item)
      }
      return acc
    }, [])

    if (toJSON) {
      return [...unresolved]
    } else {
      log(chalk.magenta.bgWhite(' > Unused exports '))

      if (unresolved.length === 0)
        log(chalk.yellow('All Clear Ahead, Captain.'))
      else objectLog([...unresolved])
    }
  }

  updateFilesTree(arrayPath, modules = null) {
    const arrayPathCleaned = arrayPath.filter(segment => segment !== '')

    this.filesTree = merge(
      this.filesTree,
      JSON.parse(
        [
          '{',
          arrayPathCleaned.map(segment => `"${segment}"`).join(':{'),
          `:${JSON.stringify(modules)}`,
          '}'.repeat(arrayPathCleaned.length),
        ].join('')
      )
    )
  }

  walkAST(extPath) {
    let exports = []
    let imports = []
    const self = this
    const pushTo = ({
      location,
      name,
      references = {},
      type,
      unnamedDefault = false,
    }) =>
      type === 'exports'
        ? exports.push({
            location: extPath,
            name,
            references,
            unnamedDefault,
          })
        : imports.push({
            location: this.joinPaths(
              this.getDir(extPath).join(path.sep),
              location + this.getExt(extPath)
            ),
            name,
            unnamedDefault,
          })

    const defaultExportVisitor = {
      Expression(path) {
        if (
          path.scope.parent &&
          path.scope.parent.path.node.type === 'ClassDeclaration'
        ) {
          // We are hitting a class, use its name.
          pushTo({
            type: 'exports',
            name: path.scope.parent.path.node.id.name,
            unnamedDefault: true,
          })
        } else {
          // Specify unnamed default export.
          pushTo({
            // location: null,
            name: 'default (unnamed)',
            references: path.scope.parent && path.scope.parent.references,
            type: 'exports',
            unnamedDefault: true,
          })
        }
        // Stop traversal as an expression was found.
        path.stop()
      },

      Function(path) {
        path.traverse(exportVisitor, true)
      },
    }

    const exportVisitor = {
      Identifier(path) {
        // Do not store the identifiers nested into a class.
        if (
          !(
            path.scope.parent &&
            path.scope.parent.path.node.type === 'ClassDeclaration'
          )
        ) {
          pushTo({
            name: path.node.name,
            type: 'exports',
            unnamedDefault:
              path.parentPath.parent.type === 'ExportDefaultDeclaration',
          })
        }
        // Stop traversal to avoid collecting unwanted identifiers.
        path.stop()
      },

      Statement(path, expectNamedFunction) {
        if (expectNamedFunction)
          pushTo({ name: self.getParent(extPath), type: 'exports' })
      },
    }

    traverse(this.getAST(this.readFile(extPath), extPath), {
      ExportAllDeclaration(path) {
        path.traverse(exportVisitor)
      },

      ExportDefaultDeclaration(path) {
        path.traverse(defaultExportVisitor)
      },

      ExportDefaultSpecifier(path) {
        path.traverse(exportVisitor)
      },

      ExportNamedDeclaration(path) {
        path.traverse(exportVisitor)
      },

      ExportNamespaceSpecifier(path) {
        path.traverse(exportVisitor)
      },

      ExportSpecifier(path) {
        path.traverse(exportVisitor)
      },

      ImportDefaultSpecifier(path) {
        pushTo({
          location: path.parent.source.value,
          name: path.node.local.name,
          type: 'imports',
          unnamedDefault: true,
        })
      },

      ImportNamespaceSpecifier(path) {
        pushTo({
          location: path.parent.source.value,
          name: path.node.local.name,
          type: 'imports',
          unnamedDefault: true,
        })
      },

      ImportSpecifier(path) {
        pushTo({
          location: path.parent.source.value,
          name: path.node.local.name,
          type: 'imports',
        })
      },
    })

    exports = this.dedupe(
      exports.reduce((acc, item) => {
        // If we found an unnamed default export an one of its references is
        // another export's name skip it as it corresponds to the same export!
        if (
          !(
            item.unnamedDefault === true &&
            exports.filter(
              element =>
                Object.keys(item.references).indexOf(element.name) !== -1
            ).length > 0
          )
        ) {
          acc.push(item)
        }
        return acc
      }, [])
    ).map(({ location, name, unnamedDefault }) => ({
      location,
      name,
      unnamedDefault,
    }))
    this.modules.exports.push(...exports)

    imports = this.dedupe(imports)
    this.modules.imports.push(...imports)

    return { imports, exports }
  }
}
