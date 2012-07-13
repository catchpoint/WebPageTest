/******************************************************************************
Copyright (c) 2012, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of Google, Inc. nor the names of its contributors
      may be used to endorse or promote products derived from this software
      without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
******************************************************************************/

var devtools = require('devtools');
var events = require('events');
var util = require('util');

var METHOD_PREFIX = 'Page.';
exports.METHOD_PREFIX = METHOD_PREFIX;


/**
 * Page control DevTools API.
 *
 * @param devTools An instance of devtools.DevTools.
 */
function Page(devTools) {
  'use strict';
  var self = this;
  this.devTools_ = devTools;
}
util.inherits(Page, events.EventEmitter);
exports.Page = Page;

Page.prototype.open = function(url, callback) {
  'use strict';
  return this.devTools_.command({
    method: 'Page.open',
    params: {
      url: url,
      newWindow: false
    }
  }, callback);
};

Page.prototype.enable = function(callback) {
  'use strict';
  return this.devTools_.command({
    method: 'Page.enable'
  }, callback);
};

Page.prototype.disable = function(callback) {
  'use strict';
  return this.devTools_.command({
    method: 'Page.disable'
  }, callback);
};

function main() {
  'use strict';
  var dt = new devtools.DevTools('http://localhost:1234/json');
  var page = new Page(dt);

  dt.on('connect', function() {
    page.enable();
    var id = page.open('http://google.com/translate', function(result) {
      console.log('Result for %s: %s', id, JSON.stringify(result));
    });
    console.log('Sent page open message id %s', id);
  });

  dt.connect();
}

if (require.main === module) {
  console.log('main for page');
  main();
}
