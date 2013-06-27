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

var logger = require('logger');

var CRLF = '\r\n';
var CRLF_BUFFER = new Buffer(CRLF);


/**
 * MIME multipart content formatter.
 *
 * @constructor
 */
function Multipart() {
  'use strict';
  this.boundary_ = '-----12345correcthorsebatterystaple6789';
  this.partHeadBuffer_ = new Buffer('--' + this.boundary_ + CRLF +
      'Content-Disposition: form-data; name="');
  this.buffers_ = [];
  this.size_ = 0;
  this.debugContent_ = '';
}
/** Public interface. */
exports.Multipart = Multipart;

/**
 * @param {Buffer} buffer the buffer to append.
 * @param {boolean} stubDebug if true then append the '[$n bytes]'
 *   instead of the buffer string.
 * @private
 */
exports.Multipart.prototype.appendBuffer_ = function(buffer, stubDebug) {
  'use strict';
  this.buffers_.push(buffer);
  this.size_ += buffer.length;
  if (logger.isLogging('extra')) {
    if (stubDebug) {
      this.debugContent_ += '[' + buffer.length + ' bytes]';
    } else {
      this.debugContent_ += buffer.toString();
    }
  }
};

/**
 * @param {string} text line to appendBuffer_.
 * @private
 */
exports.Multipart.prototype.appendLine_ = function(text) {
  'use strict';
  if (text) {
    this.appendBuffer_(new Buffer(text));
  }
  this.appendBuffer_(CRLF_BUFFER);
};

/**
 * Adds a non-file part.
 *
 * @param {string} name the name= attribute.
 * @param {string} body the body.
 * @param {Array=} headers array of header lines, or undefined for no headers.
 */
exports.Multipart.prototype.addPart = function(name, body, headers) {
  'use strict';
  logger.debug('addPart: name=' + name + ' body=' + body +
      ' headers=' + JSON.stringify(headers));
  this.appendBuffer_(this.partHeadBuffer_);
  this.appendLine_(name + '"');
  if (headers) {
    headers.forEach(function(header) {
      this.appendLine_(header);
    }.bind(this));
  }
  this.appendLine_();
  this.appendLine_(body);
};

/**
 * Adds a part with file content.
 *
 * @param {string} name the name= attribute.
 * @param {string} filename the filename= attribute.
 * @param {string} type Content-Type for the file.
 * @param {Buffer|string} body the file content.
 */
exports.Multipart.prototype.addFilePart = function(name, filename, type, body) {
  'use strict';
  logger.debug('addFilePart: name=' + name + ' filename=' + filename +
      ' size=' + body.length);
  this.appendBuffer_(this.partHeadBuffer_);
  this.appendLine_(name + '"; filename="' + filename + '"');
  this.appendLine_('Content-Type: ' + type);
  this.appendLine_('Content-Length: ' + body.length);
  this.appendLine_('Content-Transfer-Encoding: binary');
  this.appendLine_();
  var bodyBuffer = (body instanceof Buffer ? body : new Buffer(body));
  this.appendBuffer_(bodyBuffer, /*stubDebug=*/true);
  this.appendLine_();
};

/**
 * Closes the multipart content and returns HTTP headers and body for it.
 *
 * @return {Object} attributes:
 *     {Object} headers map of HTTP header names to values.
 *     {Buffer} bodyBuffer the MIME multipart formatted content.
 */
exports.Multipart.prototype.getHeadersAndBody = function() {
  'use strict';
  this.appendBuffer_(new Buffer('--' + this.boundary_ + '--' + CRLF));
  var bodyBuffer = Buffer.concat(this.buffers_, this.size_);
  if (bodyBuffer.length !== this.size_) {
    throw new Error(
        'size should be ' + bodyBuffer.length + ' but is ' + this.size_);
  }
  var headers = {
    'Content-Type': 'multipart/form-data; boundary=' + this.boundary_,
    'Content-Length': this.size_
  };
  logger.extra('Multipart: %j, content:\n%s', headers, this.debugContent_);
  // Mess up this.buffers_ to catch accidental (prohibited) reuse.
  this.buffers_ = undefined;
  this.size_ = 0;
  this.debugContent_ = '';
  return {headers: headers, bodyBuffer: bodyBuffer};
};
