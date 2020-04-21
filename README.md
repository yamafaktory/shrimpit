# Shrimpit :fried_shrimp: [![Build Status](https://github.com/yamafaktory/shrimpit/workflows/ci/badge.svg)](https://github.com/yamafaktory/shrimpit/actions) [![npm version](https://img.shields.io/npm/v/shrimpit.svg?style=flat)](https://www.npmjs.com/package/shrimpit) [![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

[![Greenkeeper badge](https://badges.greenkeeper.io/yamafaktory/shrimpit.svg)](https://greenkeeper.io/)

Shrimpit is a small CLI analysis tool for checking unused JavaScript, JSX & Vue templates ES6 exports in your project.

## Install

### npm

```shell
npm i -g shrimpit
```

### yarn

```shell
yarn global add shrimpit
```

## Usage

```shell
shrimpit path/to/your/files /another/path
```

Globbing patterns are also supported:

```shell
shrimpit test/**/*.js
```

Adding the `--tree` flag will output the complete files tree with all the imports and the exports per file:

```shell
shrimpit --tree path/to/your/files
```

Please note that default unnamed exports are rendered as `default (unnamed)`:

```shell
shrimpit test --tree
 Shrimpit!

 > Files tree

{ test:
   { core:
      { a:
         { 'a.js':
            { imports:
               [ { location: 'test/core/b/b.js',
                   name: 'test',
                   unnamedDefault: true },
                 { location: 'test/core/b/b.js',
                   name: 'a',
                   unnamedDefault: false },
                 { location: 'test/core/c/c.js',
                   name: 'User',
                   unnamedDefault: true } ],
              exports:
               [ { location: 'test/core/a/a.js',
                   name: 'a',
                   unnamedDefault: false },
                 { location: 'test/core/a/a.js',
                   name: 'c',
                   unnamedDefault: false },
                 { location: 'test/core/a/a.js', name: 'd', unnamedDefault: true } ] } },
        b:
         { 'b.js':
            { imports:
               [ { location: 'test/core/c/c.js',
                   name: 'Cat',
                   unnamedDefault: false },
                 { location: 'test/core/d/d.js',
                   name: 'unamedFunction',
                   unnamedDefault: true },
                 { location: 'test/core/a/a.js',
                   name: 'a',
                   unnamedDefault: false },
                 { location: 'test/core/a/a.js',
                   name: 'c',
                   unnamedDefault: false },
                 { location: 'test/core/a/a.js', name: 'd', unnamedDefault: true } ],
              exports:
               [ { location: 'test/core/b/b.js',
                   name: 'a',
                   unnamedDefault: false },
                 { location: 'test/core/b/b.js',
                   name: 'b',
                   unnamedDefault: false },
                 { location: 'test/core/b/b.js',
                   name: 'default (unnamed)',
                   unnamedDefault: true } ] } },
        c:
         { 'c.js':
            { imports:
               [ { location: 'test/core/a/a.js',
                   name: 'a',
                   unnamedDefault: false },
                 { location: 'test/core/a/a.js',
                   name: 'c',
                   unnamedDefault: false },
                 { location: 'test/core/a/a.js',
                   name: 'd',
                   unnamedDefault: false },
                 { location: 'test/core/b/b.js',
                   name: 'b',
                   unnamedDefault: false } ],
              exports:
               [ { location: 'test/core/c/c.js',
                   name: 'Cat',
                   unnamedDefault: false },
                 { location: 'test/core/c/c.js',
                   name: 'User',
                   unnamedDefault: true } ] } },
        d:
         { 'd.js':
            { imports: [],
              exports:
               [ { location: 'test/core/d/d.js',
                   name: 'test/core/d',
                   unnamedDefault: true } ] } } } } }

 > Unused exports

All Clear Ahead, Captain.
```

## Flow & Vue

Shrimpit supports [Flow annotations](https://flowtype.org/) and Vue templates out of the box!

# TypeScript (experimental)

Since Babel 7, the TypeScript AST can directly be parsed. You can use the `--typescript` flag to enable it:

```shell
shrimpit --tree --typescript path/to/your/files
```

Please note that the Flow and TypeScript parsers are mutually exclusive.

## Linting

The code quality is checked by the [JavaScript Standard Style](http://standardjs.com/).

## License

Released under the [MIT license](https://opensource.org/licenses/MIT) by Davy Duperron.
