#!/usr/bin/env node
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const util = require('util')

const chalk = require('chalk')
const cheerio = require('cheerio')
const globby = require('globby')
const merge = require('lodash/merge')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default

const log = i => console.log(i, '\n')
const objectLog = o => console.log(util.inspect(o, false, null, true), '\n')

const DEFAULT_UNAMED = 'default (unnamed)'

module.exports = class Shrimpit {
  constructor(argv) {
    // Remove execPath and path from argv.
    const [, , ...src] = argv

    this.allowedTypes = /^\.(mjs|jsx?|tsx?|vue)$/
    this.filesTree = {}
    this.namespaceImports = []
    this.isVueTemplate = /^\.vue$/
    this.modules = {
      exports: [],
      imports: [],
    }
    this.src = this.cleanSrc(src)
    this.parseOpts = {
      allowImportExportEverywhere: true,
      plugins: [
        'asyncFunctions',
        'asyncGenerators',
        'classConstructorCall',
        'classProperties',
        'decorators-legacy',
        'doExpressions',
        'dynamicImport',
        'exponentiationOperator',
        'exportDefaultFrom',
        'exportExtensions',
        'functionBind',
        'functionSent',
        'jsx',
        'objectRestSpread',
        'trailingFunctionCommas',
        // Babel can't parse both at the same time!
        this.parseTypeScript ? 'typescript' : 'flow',
      ],
      sourceType: 'module',
    }
    this.reExports = []
  }

  addDir(extPath) {
    this.updateFilesTree([...this.getDir(extPath), this.getBase(extPath)])
  }

  addFile(extPath) {
    if (!this.allowedTypes.test(this.getExt(extPath))) return

    this.updateFilesTree(
      [...this.getDir(extPath), this.getBase(extPath)],
      this.walkAST(extPath),
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

          case 'typescript':
            this.parseTypeScript = true
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

  async exec() {
    !this.displayJSON && log(chalk.white.bgMagenta.bold(' Shrimpit! '))

    if (this.displayUnknownFlag) return this.renderUnknownFlag()

    if (this.displayHelp) return this.renderHelp()

    const paths = await globby(this.src)

    // Start reading and parsing the directories.
    paths.sort().map(target => this.read(null, target))

    // Resolve the namespace imports.
    this.resolveNamespaceImports()

    // Resolve the re-exports.
    this.resolveReExports()

    if (this.displayJSON) {
      return this.renderToJSON()
    } else {
      if (this.displayTree) this.renderTree()
      this.renderUnused()
    }
  }

  getAST(src, path) {
    try {
      return parser.parse(src, this.parseOpts)
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
      [...this.getDir(filePath), base === 'index' ? [] : base].join(path.sep),
    )
  }

  getTreeProp(path) {
    return [
      // Skip the directory path if it's an empty string.
      ...this.getDir(path).filter(path => path !== ''),
      this.getBase(path),
    ].reduce((acc = {}, prop) => acc[prop], this.filesTree)
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
      `${rootPath !== null ? rootPath + path.sep : ''}${target}`,
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
      ].join('\n'),
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
        imports.filter(element =>
          element.unnamedDefault
            ? // Skip the name in the comparison as a default unnamed export
              // can be imported with any name.
              // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export
              this.deepStrictEqual(
                { location: element.location, unnamedDefault: true },
                {
                  location: item.location,
                  unnamedDefault: item.unnamedDefault,
                },
              )
            : // Compare the raw element & item.
              this.deepStrictEqual(element, item),
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

  resolveNamespaceImports() {
    this.namespaceImports.map(({ origin, destination }) => {
      const { imports, exports } = this.getTreeProp(destination)
      const originTreeProp = this.getTreeProp(origin)
      const originExportsAsImports = originTreeProp
        ? originTreeProp.exports
        : []

      // Update the file tree.
      this.updateFilesTree(
        [...this.getDir(destination), this.getBase(destination)],
        {
          // Merge the exports of the origin and the imports of the destination.
          imports: [...imports, ...originExportsAsImports],
          // Reinject the exports of the destination.
          exports,
        },
      )

      // Update the modules' imports.
      this.modules.imports = [
        ...this.modules.imports,
        ...originExportsAsImports,
      ]
    })
  }

  resolveReExports() {
    this.reExports.map(({ origin, destination }) => {
      const { imports, exports } = this.getTreeProp(destination)
      const originTreeProp = this.getTreeProp(origin)
      const originNonDefaultImports = (originTreeProp
        ? originTreeProp.exports
        : []
      ).filter(({ unnamedDefault }) => !unnamedDefault)
      const destinationNonDefaultExports = originNonDefaultImports.map(
        ({ location, ...rest }) => ({
          // Replace the origin location with the destination.
          location: destination,
          ...rest,
        }),
      )

      // Update the file tree.
      this.updateFilesTree(
        [...this.getDir(destination), this.getBase(destination)],
        {
          // Merge the exports of the origin as imports and filter out the
          // default ones since they are ignored:
          // http://exploringjs.com/es6/ch_modules.html#sec_importing-exporting-details
          imports: [...imports, ...originNonDefaultImports],
          // Reinject the exports of the destination.
          exports: [...exports, ...destinationNonDefaultExports],
        },
      )

      // Update the modules' imports and exports.
      this.modules.imports = [
        ...this.modules.imports,
        ...originNonDefaultImports,
      ]
      this.modules.exports = [
        ...this.modules.exports,
        ...destinationNonDefaultExports,
      ]
    })
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
        ].join(''),
      ),
    )
  }

  walkAST(extPath) {
    let exports = []
    let imports = []

    const self = this

    const isEnclosedIn = (type, { parentPath }) =>
      parentPath && (parentPath.type === type || isEnclosedIn(type, parentPath))

    const getLocation = location =>
      this.joinPaths(
        this.getDir(extPath).join(path.sep),
        location + this.getExt(extPath),
      )

    const pushTo = ({
      location,
      name,
      references = {},
      reExportAll = false,
      type,
      unnamedDefault = false,
    }) =>
      type === 'exports'
        ? exports.push({
            location: location ? getLocation(location) : extPath,
            name,
            references,
            unnamedDefault,
          })
        : imports.push({
            location: getLocation(location),
            name,
            unnamedDefault,
          })

    const defaultExportVisitor = {
      Expression(path) {
        if (
          path.scope.parent &&
          path.scope.parent.path &&
          path.scope.parent.path.node &&
          path.scope.parent.path.node.id &&
          (isEnclosedIn('ClassDeclaration', path.parentPath) ||
            isEnclosedIn('FunctionDeclaration', path.parentPath) ||
            isEnclosedIn('VariableDeclaration', path.parentPath))
        ) {
          // Classes, functions and variables as exports are named here.
          pushTo({
            name: path.scope.parent.path.node.id.name,
            type: 'exports',
            unnamedDefault: isEnclosedIn(
              'ExportDefaultDeclaration',
              path.parentPath,
            ),
          })
        } else {
          // Specify unnamed default export.
          pushTo({
            name: DEFAULT_UNAMED,
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
        if (
          // Do not store the identifiers nested into a class.
          !isEnclosedIn('ClassDeclaration', path.parentPath) &&
          // Skip default exports which are traversed by the expression walker
          // of the defaultExportVisitor.
          !isEnclosedIn('ExportDefaultDeclaration', path.parentPath) &&
          // Skip exports specifiers that are traversed as StringLiteral.
          !isEnclosedIn('ExportSpecifier', path) &&
          !isEnclosedIn('ExportDefaultSpecifier', path)
        ) {
          pushTo({
            name: path.node.name,
            type: 'exports',
          })
        }
        // Stop traversal to avoid collecting unwanted identifiers.
        path.stop()
      },

      Statement(path, expectNamedFunction) {
        if (
          expectNamedFunction &&
          // Do not store the identifiers nested into a class exported as
          // default.
          !(
            isEnclosedIn('ClassDeclaration', path) &&
            isEnclosedIn('ExportDefaultDeclaration', path)
          )
        ) {
          pushTo({
            name: self.getParent(extPath),
            type: 'exports',
            unnamedDefault:
              // Special case for unnamed functions exported as default.
              path.parentPath.parent.declaration &&
              path.parentPath.parent.declaration.type ===
                'FunctionDeclaration' &&
              !path.parentPath.parent.declaration.id,
          })
        }
      },

      StringLiteral(path) {
        if (path.parentPath.node.type === 'ExportAllDeclaration') {
          // Handle special case of re-exports.
          self.reExports.push({
            origin: getLocation(path.parentPath.node.source.value),
            destination: extPath,
          })
        }

        if (path.parentPath.node.type === 'ExportNamedDeclaration') {
          path.parentPath.node.specifiers.map(({ local, exported, type }) => {
            // Reexporting a default as a named default.
            if (
              type === 'ExportDefaultSpecifier' &&
              typeof local === 'undefined'
            ) {
              pushTo({
                name: exported.name,
                location: path.parentPath.node.source.value,
                type: 'imports',
                unnamedDefault: true,
              })
            }

            if (type !== 'ExportDefaultSpecifier') {
              const isDefault = local.name === 'default'
              pushTo({
                name: isDefault ? DEFAULT_UNAMED : local.name,
                location: path.parentPath.node.source.value,
                type: 'imports',
                unnamedDefault: type === 'ExportDefaultSpecifier' || isDefault,
              })
            }

            // Here we also want to handle the case of named exports as default
            // exports.
            // http://exploringjs.com/es6/ch_modules.html#_making-a-re-export-the-default-export
            const isNamedExportedAsDefault = exported.name === 'default'
            pushTo({
              name: isNamedExportedAsDefault ? DEFAULT_UNAMED : exported.name,
              type: 'exports',
              unnamedDefault:
                type === 'ExportDefaultSpecifier' || isNamedExportedAsDefault,
            })
          })
        }
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
        // Handle special case of the namespace imports where all the exports of
        // the origin are going to be consumed.
        self.namespaceImports.push({
          origin: getLocation(path.parent.source.value),
          destination: extPath,
        })
      },

      ImportSpecifier(path) {
        pushTo({
          location: path.parent.source.value,
          name: path.node.imported.name,
          type: 'imports',
        })
      },
    })

    exports = this.dedupe(
      exports.reduce((acc, item) => {
        // If we found an unnamed default export and one of its references is
        // another export's name skip it as it corresponds to the same export!
        if (
          !(
            item.unnamedDefault === true &&
            exports.filter(
              ({ name }) =>
                item.references &&
                Object.keys(item.references).indexOf(name) !== -1,
            ).length > 0
          )
        ) {
          acc.push(item)
        }
        return acc
      }, []),
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
