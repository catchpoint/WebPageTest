bplist
=============
Binary plist parser and creator. This module is entierly dependant on `bplist-parser` and `bplist-creator` written by [joeferner](https://github.com/joeferner).

## Installation

```bash
$ npm install bplist
```

## Examples

```javascript
var bplist = require('bplist');

// Create a binary plist
var plistBuf = bplist.create({
    key1: ['v', 'a', 'l', 'u', 'e']
  , key2: 'value2'
});


// Parse a binary plist from a buffer
bplist.parseBuffer(plistBuf, function(err, result) {
  if (!err)
    console.log(result); // [{key1: ['v', 'a', 'l', 'u', 'e'], key2: 'value2'}]
});


// Parse a binary plist from a file
bplist.parseFile('nameOf.bplist', function(err, object) {
  if (!err)
    console.log(object);
});
```

## License
Copyright (c) 2012 Ladinu Chandrasinghe

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
