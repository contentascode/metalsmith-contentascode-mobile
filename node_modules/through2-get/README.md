# through2-get

[![Version](https://img.shields.io/npm/v/through2-get.svg)](https://npmjs.com/package/through2-get)
[![License](https://img.shields.io/npm/l/through2-get.svg)](https://npmjs.com/package/through2-get)
[![Build Status](https://img.shields.io/travis/jamesramsay/through2-get.svg)](https://travis-ci.org/jamesramsay/through2-get)
[![Coverage Status](https://img.shields.io/codecov/c/github/jamesramsay/through2-get.svg)](https://codecov.io/github/jamesramsay/through2-get)
[![Dependency Status](https://img.shields.io/david/jamesramsay/through2-get.svg)](https://david-dm.org/jamesramsay/through2-get)

[![NPM](https://nodei.co/npm/through2-get.png)](https://nodei.co/npm/through2-get/)

This is a super thin wrapper around [through2](http://npm.im/through2) that works like `_.get` but for streams.

For when through2 is just too verbose :wink:

**IMPORTANT:** If you return `null` from your function, the stream will end there.

**IMPORTANT:** _.get can only be applied to object streams.

```javascript

var get = require("through2-get");

var content = get('content');

// vs. with through2:
var content = through2(function (chunk, encoding, cb) {
  this.push(_.get(chunk, 'content'));
  return cb();
})

// Then use your get:
source.pipe(content).pipe(sink)

// Works like `_.get` meaning you can specify a path and a default value
var contentEach = get({excludeZBS: true}, 'content', '');

// vs. with through2:
var contentEach = through2(function (chunk, encoding, cb) {
  var out = _.get(chunk, 'content', '');
  if (out === '') return cb();
  this.push(out);
  return cb();
});

```

Differences from `_.get`:
- Cannot insert `null` elements into the stream without aborting.

## API

```javascript
require("through2-get")([options,] path, [defaultValue])
```

Create a `stream.Transform` instance with `objectMode: true` defaulting to true that will call `_.get(path, defaultValue)` on each stream object.

```javascript
var Tx = require("through2-get").ctor([options,] path, [defaultValue])
```

Create a reusable `stream.Transform` TYPE that can be called via `new Tx` or `Tx()` to create an instance.

__Arguments__

- `options`
  - `excludeZBS` (boolean): defaults `true`.
  - all other through2 options.
- `path` (Array|string): The path of the property to get.
- `[defaultValue]` (*): The value returned if the resolved value is undefined.
