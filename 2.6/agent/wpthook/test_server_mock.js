/******************************************************************************
Copyright (c) 2011, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the <ORGANIZATION> nor the names of its contributors
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

// test_server_mock.js - Simulate TestServer responses.
//
// This is a node.js server that listens for requests from the wptdriver
// browser extension.
//
//   Linux build instructions:
//     NODE_NAME=node-v0.4.10
//     wget http://nodejs.org/dist/${NODE_NAME}.tar.gz
//     tar xvzf ${NODE_NAME}.tar.gz
//     cd ${NODE_NAME}
//     JOBS=10 make
//     sudo make install
//
//   Start a server:
//     node sample-node-server.js

var http = require('http');
http.createServer(function (req, res) {
    if (req.url == '/task') {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('{"statusCode": 200, "data": { "record": 1, "action": ' +
              '"navigate","target": "http://books.google.com/"} }');
    } else if (req.url.slice(0, '/event'.length) == '/event') {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('');
    } else {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      //res.end('Not Found: <' + req.url + '>\n');
      res.end('Not Found\n');
    }
  }).listen(8888, "127.0.0.1");
console.log('Mock TestServer running at http://127.0.0.1:8888/');