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


var buildNavigateTask = function(url) {
  var task = {
    statusCode: 200,
    data: {
      record: 1,
      action: "navigate",
      target: url
    }
  };
  return JSON.stringify(task);
}

var usage = function() {
  console.error("Usage: node " + process.argv[1] + " URL [--repeat]");
}

if (process.argv.length < 3) {
  console.error("Missing argument.");
  usage();
  process.exit(1);
}

url = process.argv[2];
servedOnce = false;
repeat = false;

if (process.argv.length > 3) {
  if (process.argv[3] == "--repeat") {
    repeat = true;
  }
  else {
    console.error("Unkown argument: " + process.argv[3]);
    usage();
    process.exit(1);
  }
}


var http = require('http');
http.createServer(function (req, res) {
  console.log(req.url);
  if (req.url == '/task') {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    if (servedOnce === false || repeat) {
      var task = buildNavigateTask(url);
      console.log("Serving task: " + task);
      res.end(buildNavigateTask(url));
      servedOnce = true;
    } else {
      console.log("No more task to serve");
      res.end('');
    }
  } else if (req.url.slice(0, '/event'.length) == '/event') {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('');
  } else {
    console.log("* endpoint does not exist");
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('');
  }
}).listen(8888, "127.0.0.1");

console.log('Mock TestServer running at http://127.0.0.1:8888/');
console.log('Mock TestServer will server navigate to: ' + url);
