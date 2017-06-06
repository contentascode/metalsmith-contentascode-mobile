# left-split

Split string capture group is captured to the left hand array item.

[Capturing parenthesis](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split#Capturing_parentheses) return the separator as a distinct array element.
`left-split` puts it at the end of the left hand array item.

## Install

`npm install left-split`

## Usage

```javascript

leftsplit = require('left-split')

'foo bar'.split(/(\s)/)
// => ['foo', ' ', 'bar']

leftsplit('foo bar', /(\s)/)
// => ['foo ', 'bar']

'foo\nbar\n'.split(/(\r?\n)/)
// => ['foo', '\n', 'bar', '\n', '']

leftsplit('foo\nbar\n', /(\r?\n)/)
// => ['foo\n', 'bar\n', '']

```
