# Shrimpit :fried_shrimp: [![Build Status](https://travis-ci.org/yamafaktory/shrimpit.svg?branch=master)](https://travis-ci.org/yamafaktory/shrimpit) [![npm version](https://img.shields.io/npm/v/shrimpit.svg?style=flat)](https://www.npmjs.com/package/shrimpit) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

Shrimpit is a small CLI analysis tool for checking unused JavaScript & JSX ES6 exports in your project.

## Usage

```shell
npm i -g shrimpit

shrimpit path/to/your/files /another/path
```

Adding the `--tree` flag will output the complete files tree with all the imports and the exports per file:

```shell
shrimpit --tree path/to/your/files
```

Please note that default unnamed exports are rendered as paths.

Shrimpit supports [Flow annotations](https://flowtype.org/) out of the box!

## Linting

The code quality is checked by the [JavaScript Standard Style](http://standardjs.com/).

## License

Released under the [MIT license](https://opensource.org/licenses/MIT) by Davy Duperron.
