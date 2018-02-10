# Shrimpit :fried_shrimp: [![Build Status](https://travis-ci.org/yamafaktory/shrimpit.svg?branch=master)](https://travis-ci.org/yamafaktory/shrimpit) [![npm version](https://img.shields.io/npm/v/shrimpit.svg?style=flat)](https://www.npmjs.com/package/shrimpit) [![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

[![Greenkeeper badge](https://badges.greenkeeper.io/yamafaktory/shrimpit.svg)](https://greenkeeper.io/)

Shrimpit is a small CLI analysis tool for checking unused JavaScript, JSX & Vue templates ES6 exports in your project.

## Usage

```shell
npm i -g shrimpit

shrimpit path/to/your/files /another/path
```

Adding the `--tree` flag will output the complete files tree with all the imports and the exports per file:

```shell
shrimpit --tree path/to/your/files
```

Please note that default unnamed exports are rendered as `default (unamed)`:

``` shell
shrimpit test --tree
  Shrimpit!

 > Files tree

{ test:
   { a:
      { 'a.js':
         { exports:
            [ { name: 'a', location: 'test/a/a.js' },
              { name: 'c', location: 'test/a/a.js' },
              { name: 'd', location: 'test/a/a.js' } ],
           imports: [ { name: 'test', location: 'test/b/b.js' } ] } },
     b:
      { 'b.js':
         { exports:
            [ { name: 'a', location: 'test/b/b.js' },
              { name: 'b', location: 'test/b/b.js' },
              { name: 'default (unamed)', location: 'test/b/b.js' } ],
           imports: [ { name: 'Cat', location: 'test/c/c.js' } ] } },
     c:
      { 'c.js':
         { exports:
            [ { name: 'Cat', location: 'test/c/c.js' },
              { name: 'User', location: 'test/c/c.js' },
              { name: 'default (unamed)', location: 'test/c/c.js' } ],
           imports:
            [ { name: 'a', location: 'test/a/a.js' },
              { name: 'c', location: 'test/a/a.js' },
              { name: 'b', location: 'test/b/b.js' } ] } } } }

 > Unused exports

[ { name: 'd', location: 'test/a/a.js' },
  { name: 'a', location: 'test/b/b.js' },
  { name: 'default (unamed)', location: 'test/b/b.js' },
  { name: 'User', location: 'test/c/c.js' },
  { name: 'default (unamed)', location: 'test/c/c.js' } ]
```

## Flow & Vue

Shrimpit supports [Flow annotations](https://flowtype.org/) and Vue templates out of the box!

## Linting

The code quality is checked by the [JavaScript Standard Style](http://standardjs.com/).

## License

Released under the [MIT license](https://opensource.org/licenses/MIT) by Davy Duperron.
