# Shrimpit :fried_shrimp: [![Build Status](https://travis-ci.org/yamafaktory/shrimpit.svg?branch=master)](https://travis-ci.org/yamafaktory/shrimpit) [![npm version](https://img.shields.io/npm/v/shrimpit.svg?style=flat)](https://www.npmjs.com/package/shrimpit) [![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

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

Please note that default unnamed exports are rendered as paths:

``` shell
shrimpit test --tree
 Shrimpit!

 > Files tree

{ test:
   { a:
      { 'a1.js': { exports: [ 'a11', 'a12' ], imports: [ 'test/a' ] },
        'a2.js': { exports: [ 'a2' ], imports: [ 'test' ] },
        'a4.js': { exports: [ 'a4', 'test/a' ], imports: [ 'a11', 'a12' ] } },
     b:
      { 'b1.js': { exports: [ 'b1', 'test/b' ], imports: [] },
        'b2.js': { exports: [ 'test/b' ], imports: [] } } } }

 > Unused exports

[ 'a2', 'a4', 'b1', 'test/b' ]
```

## Flow & Vue

Shrimpit supports [Flow annotations](https://flowtype.org/) and Vue templates out of the box!

## Linting

The code quality is checked by the [JavaScript Standard Style](http://standardjs.com/).

## License

Released under the [MIT license](https://opensource.org/licenses/MIT) by Davy Duperron.
