# metalsmith-transclude

[![Version](https://img.shields.io/npm/v/metalsmith-transclude.svg)](https://npmjs.com/package/metalsmith-transclude) [![Build Status](https://travis-ci.org/contentascode/metalsmith-transclude.svg?branch=master)](https://travis-ci.org/contentascode/metalsmith-transclude)

  A metalsmith plugin to transclude documents.

## Installation

    $ npm install metalsmith-transclude

## CLI Usage

  Install via npm and then add the `metalsmith-tranclude` key to your `metalsmith.json` plugins, like so:

```json
{
  "plugins": {
    "metalsmith-transclude": true
  }
}
```

This will follow expressions of this form:

index.md:
```
:[](include/file.md)
```

include/file.md:
```
Hi!
```

and include them inside the build:
build/index.md:
```
Hi!
```

## TODO:

 - [X] Add tests
 - [ ] Allow transclusion of remote content (this might already work)
 - [ ] Add options to parameterise transclusions.

## License

  MIT
