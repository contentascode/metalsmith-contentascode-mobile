# metalsmith-transclude-transform

[![Version](https://img.shields.io/npm/v/metalsmith-transclude-transform.svg)](https://npmjs.com/package/metalsmith-transclude-transform) [![Build Status](https://travis-ci.org/contentascode/metalsmith-transclude-transform.svg?branch=master)](https://travis-ci.org/contentascode/metalsmith-transclude-transform)

  A metalsmith plugin to transform content before transclusion with metalsmith-transclude.

## Installation

    $ npm install metalsmith-transclude

## CLI Usage

  Install via npm and then add the `metalsmith-tranclude` key to your `metalsmith.json` plugins, like so:

```json
{
  "plugins": {
    "metalsmith-transclude-transform": {
      "permalinks": true,
      "folders": true
    }
  }
}
```

The `permalinks` option will transform transclusion links of the form:
```
:[](include/file)
```

if the destination file exists into:
```
:[](include/file.md)
```

The `folders` option will transform transclusion links of the form:
```
:[](include)
```

if the destination folder exists and is non empty (in this example the `include` folder contains files `file1.md` and `file2.md` to:
```
:[](include/file1.md)
:[](include/file2.md)
```

## License

  MIT
