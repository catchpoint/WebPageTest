var devtools = require('devtools');
var events = require('events');
var util = require('util');


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
    var id = page.open('http://google.com/translate', function(result) {
      console.log('Result for %s: %s', id, JSON.stringify(result));
    });
    console.log('Sent message %s', id);
  });

  dt.connect();
}

if (require.main === module) {
  console.log('main for page');
  main();
}
