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

  dedupe (array) {
    // Dedupe with a set.
    return [...new Set(array)]
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
    log(this.filesTree)
  }

  walkAST (extPath) {
    const exports = []
    const imports = []
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

    return {
      exports: this.dedupe(exports),
      imports: this.dedupe(imports)
    }
  }
}

const shrimpit = new Shrimpit(process.argv)

shrimpit.exec()
