'use strict';

function leftSplit(input, separator, limit) {
  var str = String(input);

  var output = str.split(separator, limit).map(function append(value, index, arr) {
    if (index % 2 === 0) {
      return value + (arr[index + 1] || '');
    }
    return null;
  }).filter(function notNull(value) {
    return value !== null;
  });

  return output;
}

module.exports = leftSplit;
