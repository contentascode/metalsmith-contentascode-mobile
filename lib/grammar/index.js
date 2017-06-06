'use strict';

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let grammar;

try {
  grammar = require('./link'); // eslint-disable-line
} catch (ex) {
  // Permits using compiling grammar when using ES2015 source
  const peg = require('pegjs'); // eslint-disable-line
  grammar = peg.generate(_fs2.default.readFileSync(_path2.default.join(__dirname, 'link.pegjs'), 'utf8'));
}

module.exports = {
  grammar
};