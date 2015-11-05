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

goog.require('wpt.chromeExtensionUtils');
goog.require('wpt.logging');
goog.provide('wpt.chromeDebugger');

((function() {  // namespace

var g_instance = {connected: false,
                  timeline: false,
                  active: false,
                  receivedData: false};
var TIMELINE_AGGREGATION_INTERVAL = 500;
var TIMELINE_START_TIMEOUT = 10000;
var TRACING_START_TIMEOUT = 10000;
var IGNORE_NETLOG_EVENTS =
    ['HTTP_CACHE_',
     'DISK_CACHE_',
     'ENTRY_',
     'PROXY_SERVICE',
     'URL_REQUEST_DELEGATE'];

/**
 * Construct an object that connectes to the Chrome debugger.
 *
 * @constructor
 * @param {?number} tabId The id of the tab being used to load the page
 *                       under test.  See that chrome.tabs.* docs to
 *                       understand what methods give and use this id.
 * @param {Object} chromeApi Object which contains the chrome extension
 *                           API methods.  The real one is window.chrome
 *                           in an extension.  Tests may pass in a mock
 *                           object.
 */
wpt.chromeDebugger.Init = function(tabId, chromeApi, callback) {
  try {
    g_instance.tabId_ = tabId;
    g_instance.chromeApi_ = chromeApi;
    g_instance.startedCallback = callback;
    g_instance.devToolsData = '';
    g_instance.trace = false;
    g_instance.timeline = false;
    g_instance.statsDoneCallback = undefined;
    g_instance.mobileEmulation = undefined;
    g_instance.timelineStackDepth = 0;
    g_instance.traceRunning = false;
    g_instance.netlog = [];
    var version = '1.0';
    if (g_instance.chromeApi_['debugger'])
        g_instance.chromeApi_.debugger.attach({tabId: g_instance.tabId_}, version, wpt.chromeDebugger.OnAttachDebugger);
  } catch (err) {
    wpt.LOG.warning('Error initializing debugger interfaces: ' + err);
  }
};

wpt.chromeDebugger.SetActive = function(active) {
  g_instance.active = active;
  if (active) {
    g_instance.requests = {};
    g_instance.netlogRequests = {};
    g_instance.idMap = {};
    g_instance.netlog = [];
    g_instance.receivedData = false;
    g_instance.devToolsData = '';
    g_instance.statsDoneCallback = undefined;
    wpt.chromeDebugger.StartTrace();
  }
};

/**
 * Execute a command in the context of the page
 */
wpt.chromeDebugger.Exec = function(code, callback) {
  g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Runtime.evaluate', {expression: code, returnByValue: true}, function(response){
    callback(response);
  });
};

/**
 * Capture the network timeline
 */
wpt.chromeDebugger.CaptureTimeline = function(timelineStackDepth, callback) {
  g_instance.timeline = true;
  g_instance.timelineStackDepth = timelineStackDepth;
  if (g_instance.active) {
    wpt.chromeDebugger.StartTrace();
  }
};

/**
 * Capture a trace
 */
wpt.chromeDebugger.CaptureTrace = function() {
  g_instance.trace = true;
  if (g_instance.active) {
    wpt.chromeDebugger.StartTrace();
  }
};

wpt.chromeDebugger.StartTrace = function() {
  if (!g_instance.traceRunning) {
    g_instance.traceRunning = true;
    var traceCategories = '';
    if (g_instance.trace)
      traceCategories = '*';
    else
      traceCategories = '-*';
    traceCategories = traceCategories + ',netlog,blink.user_timing,blink.console';
    if (g_instance.timeline)
      traceCategories = traceCategories + ',toplevel,disabled-by-default-devtools.timeline,devtools.timeline,disabled-by-default-devtools.timeline.frame,devtools.timeline.frame';
    if (g_instance.timelineStackDepth > 0)
      traceCategories += ',disabled-by-default-devtools.timeline.stack,devtools.timeline.stack';
    var params = {categories: traceCategories, options:'record-as-much-as-possible'};
    g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Tracing.start', params);
  }
}

wpt.chromeDebugger.CollectStats = function(callback) {
  g_instance.statsDoneCallback = callback;
  wpt.chromeDebugger.SendDevToolsData(function(){
    if (g_instance.traceRunning) {
      g_instance.traceRunning = false;
      g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Tracing.end');
    } else {
      g_instance.statsDoneCallback();
    }
  });
};

wpt.chromeDebugger.EmulateMobile = function(deviceString) {
  g_instance.mobileEmulation = JSON.parse(deviceString);
  g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Page.setDeviceMetricsOverride', g_instance.mobileEmulation);
};

/**
 * Actual message callback
 */
wpt.chromeDebugger.OnMessage = function(tabId, message, params) {
  // timeline and tracing starts seem to have a delay in startup
  // and don't really start when the callback completes
  var tracing = false;
  if (message === 'Tracing.dataCollected') {
    tracing = true;
    if (params['value'] !== undefined) {
      if (g_instance.trace || g_instance.timeline) {
        wpt.chromeDebugger.sendEvent('trace', JSON.stringify(params['value']));
      }
      // Collect the netlog events separately for calculating the request timings
      var len = params['value'].length;
      for(var i = 0; i < len; i++) {
        if (params['value'][i]['cat'] == 'netlog') {
          wpt.chromeDebugger.processNetlogTraceEvent(params['value'][i]);
        }
      }
    }
  }
  if (message === 'Tracing.tracingComplete') {
    tracing = true;
    wpt.chromeDebugger.finalizeNetlog();
    if (g_instance.statsDoneCallback)
      g_instance.statsDoneCallback();
  }

  if(message === 'Console.messageAdded') {
    wpt.chromeDebugger.sendEvent('console_log', JSON.stringify(params['message']));
  }

    // actual message recording
  if (g_instance.active && !tracing) {
    // keep track of all of the dev tools messages
    if (g_instance.timeline) {
      if (g_instance.devToolsData.length)
        g_instance.devToolsData += ',';
      g_instance.devToolsData += '{"method":"' + message + '","params":' + JSON.stringify(params) + '}';
    }
    
    // Page events
    if (message === 'Page.frameNavigated' &&
        params['frame'] !== undefined &&
        params.frame['parentId'] === undefined &&
        g_instance.mobileEmulation != undefined) {
      g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Page.setDeviceMetricsOverride', g_instance.mobileEmulation);
    }
    
    // Network events
    if (params['requestId'] !== undefined) {
      if (message === 'Network.requestServedFromCache') {
        wpt.chromeDebugger.SendReceivedData();
      } else if (params['timestamp'] !== undefined) {
        var id = params.requestId;
        var originalId = id;
        if (g_instance.idMap[id] !== undefined)
          id += '-' + g_instance.idMap[id];
        if (message === 'Network.requestWillBeSent' && params['request'] !== undefined && params.request['url'] !== undefined && params.request.url.indexOf('http') == 0) {
          var request = params.request;
          if (params['initiator'] !== undefined)
            request.initiator = params.initiator;
          // redirects re-use the same request ID
          if (g_instance.requests[id] !== undefined) {
            wpt.chromeDebugger.SendReceivedData();
            // Generate a new unique ID
            var count = 0;
            if (g_instance.idMap[originalId] !== undefined)
              count = g_instance.idMap[originalId];
            g_instance.idMap[originalId] = count + 1;
            id = originalId + "-" + g_instance.idMap[originalId];
          }
          // keep track of the new request
          request['id'] = id;
          g_instance.requests[id] = request;
        } else if (g_instance.requests[id] !== undefined) {
          if (message === 'Network.dataReceived') {
            wpt.chromeDebugger.SendReceivedData();
          } else if (message === 'Network.responseReceived' && params['response'] !== undefined) {
            wpt.chromeDebugger.SendReceivedData();
            g_instance.requests[id].response = params.response;
          } else if (message === 'Network.loadingFinished') {
            wpt.chromeDebugger.SendReceivedData();
          }
        }
      }
    }
  }
};

wpt.chromeDebugger.SendDevToolsData = function(callback) {
  if (g_instance.devToolsData.length) {
    wpt.chromeDebugger.sendEvent('devTools', g_instance.devToolsData, callback);
    g_instance.devToolsData = '';
  } else {
    callback();
  }
};

wpt.chromeDebugger.OnAttachDebugger = function() {
  wpt.LOG.info('attached to debugger extension interface');
  g_instance.connected = true;
  g_instance.requests = {};

  // attach the event listener
  g_instance.chromeApi_.debugger.onEvent.addListener(wpt.chromeDebugger.OnMessage);

  // start the different interfaces we are interested in monitoring
  g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Network.enable', null, function(){
    g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Console.enable', null, function(){
      g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Page.enable', null, function(){
        g_instance.startedCallback();
      });
    });
  });
};

/**
* Notify the c++ code that we got our first byte of data for the page.
*/
wpt.chromeDebugger.SendReceivedData = function() {
  if (!g_instance.receivedData) {
    g_instance.receivedData = true;
    wpt.chromeDebugger.sendEvent('received_data', '');
  }
};

/**
 * Send an event to the c++ code
 * @param {string} event event string.
 * @param {string} data event data (post body).
 */
wpt.chromeDebugger.sendEvent = function(event, data, callback) {
  try {
    var xhr = new XMLHttpRequest();
    if (typeof callback !== 'undefined') {
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          callback();
        }
      }
    }
    xhr.open('POST', 'http://127.0.0.1:8888/event/' + event, true);
    xhr.send(data);
  } catch (err) {
    wpt.LOG.warning('Error sending request data XHR: ' + err);
  }
};

/*******************************************************************************
********************************************************************************
                          Netlog Trace Processing
********************************************************************************
*******************************************************************************/

g_instance.netlogDNS = {};
g_instance.netlogConnections = {};
g_instance.netlogRequests = {};
g_instance.netlogStreamJobs = {};
g_instance.netlogH2Sessions = {};

/**
* Process the netlog data into individual requests
*/
wpt.chromeDebugger.processNetlogTraceEvent = function(entry) {
  if (entry.cat === "netlog" && entry['id'] !== undefined && entry['ts'] !== undefined) {
    entry['id'] = parseInt(entry['id']);
    entry['ts'] = entry['ts'] / 1000.0; // convert to milliseconds
    if (entry.name.match(/^HOST_RESOLVER_/)) {
      wpt.chromeDebugger.ParseNetlogDNSEntry(entry);
    } else if (entry.name.match(/^TCP_CONNECT/) || entry.name.match(/^SOCKET_BYTES_/)) {
      wpt.chromeDebugger.ParseNetlogConnectEntry(entry);
    } else if (entry.name === "SSL_CONNECT") {
      wpt.chromeDebugger.ParseNetlogSSLEntry(entry);
    } else if (entry.name.match(/^URL_REQUEST/) ||
               entry.name.match(/^HTTP_TRANSACTION/) ||
               entry.name === "REQUEST_ALIVE") {
      wpt.chromeDebugger.ParseNetlogRequestEntry(entry);
    } else if (entry.name === "HTTP_STREAM_JOB_BOUND_TO_REQUEST" ||
               entry.name === "SOCKET_POOL_BOUND_TO_SOCKET" ||
               entry.name === "HTTP2_SESSION_POOL_IMPORTED_SESSION_FROM_SOCKET" ||
               entry.name === "HTTP2_SESSION_POOL_FOUND_EXISTING_SESSION") {
      wpt.chromeDebugger.linkNetlogSocket(entry);
    } else if (entry.name.match(/^HTTP2_SESSION/) ||
               entry.name.match(/HTTP2_STREAM/)) {
      wpt.chromeDebugger.ParseHTTP2SessionEntry(entry);
    }
  }
};

wpt.chromeDebugger.finalizeNetlog = function() {
  // create requests for any push streams that were not adopted
  for (var h2session in g_instance.netlogH2Sessions) {
    for (var h2Stream in g_instance.netlogH2Sessions[h2session].streams) {
      if (g_instance.netlogH2Sessions[h2session].streams[h2Stream]['request'] === undefined) {
        g_instance.netlogH2Sessions[h2session].streams[h2Stream].request =
            wpt.chromeDebugger.createPushedRequest(parseInt(h2session), parseInt(h2Stream));
      }
    }
  }

  // Pass the DNS lookup timestamps so we can sync the trace clock to the c++ clock
  for (var dnsid in g_instance.netlogDNS) {
    if (g_instance.netlogDNS[dnsid]['host'] !== undefined &&
        g_instance.netlogDNS[dnsid]['start'] !== undefined) {
      wpt.chromeDebugger.sendEvent('dns_time', g_instance.netlogDNS[dnsid].host + ' ' + g_instance.netlogDNS[dnsid].start);
    }
  }

  // Process the individual requests
  for (var requestId in g_instance.netlogRequests) {
    if (g_instance.netlogRequests[requestId]['h2session'] !== undefined &&
        g_instance.netlogRequests[requestId]['socket'] === undefined &&
        g_instance.netlogH2Sessions[g_instance.netlogRequests[requestId].h2session] !== undefined &&
        g_instance.netlogH2Sessions[g_instance.netlogRequests[requestId].h2session]['socket'] !== undefined) {
      g_instance.netlogRequests[requestId].socket = g_instance.netlogH2Sessions[g_instance.netlogRequests[requestId].h2session].socket
    }
    wpt.chromeDebugger.sendRequestDetails(requestId);
  }

  g_instance.netlog = [];
  g_instance.netlogRequests = [];
};

/**
 * Process and send the data for a single request
 * to the hook for processing
 * @param {object} request Request data.
 */
wpt.chromeDebugger.sendRequestDetails = function(id) {
  var request = g_instance.netlogRequests[id];
  if (request['start'] !== undefined && request['url'] !== undefined) {
    var eventData = 'browser=chrome\n';
    eventData += 'id=' + id + '\n';
    eventData += 'url=' + request.url + '\n';
    if (request['start'] !== undefined)
      eventData += 'startTime=' + request.start + '\n';
    if (request['start'] !== undefined)
      eventData += 'requestStart=' + request.start + '\n';
    if (request['firstByte'] !== undefined)
      eventData += 'firstByteTime=' + request.firstByte + '\n';
    if (request['end'] !== undefined)
      eventData += 'endTime=' + request.end + '\n';
    if (request['dnsLookup'] !== undefined && g_instance.netlogDNS[request.dnsLookup] !== undefined) {
      var dns = g_instance.netlogDNS[request.dnsLookup];
      if (dns['start'] !== undefined)
        eventData += 'dnsStart=' + dns.start + '\n';
      if (dns['end'] !== undefined)
        eventData += 'dnsEnd=' + dns.end + '\n';
    }
    if (request['socketConnect'] !== undefined && g_instance.netlogConnections[request.socketConnect] !== undefined) {
      var connect = g_instance.netlogConnections[request.socketConnect];
      if (connect['start'] !== undefined)
        eventData += 'connectStart=' + connect.start + '\n';
      if (connect['end'] !== undefined)
        eventData += 'connectEnd=' + connect.end + '\n';
      if (connect['sslStart'] !== undefined)
        eventData += 'sslStart=' + connect.sslStart + '\n';
      if (connect['sslEnd'] !== undefined)
        eventData += 'sslEnd=' + connect.sslEnd + '\n';
    }
    if (request['socket'] !== undefined) {
      eventData += 'connectionId=' + request.socket + '\n';
      var socket = g_instance.netlogConnections[request.socket];
      if (socket['address'] !== undefined) {
        var match = socket.address.match(/^(.*):([0-9]+)$/);
        if (match) {
          eventData += 'ip=' + match[1] + '\n';
          eventData += 'port=' + match[2] + '\n';
        }
      }
      if (socket['sourceAddress'] !== undefined) {
        var match = socket.sourceAddress.match(/^(.*):([0-9]+)$/);
        if (match) {
          eventData += 'clientIp=' + match[1] + '\n';
          eventData += 'clientPort=' + match[2] + '\n';
        }
      }
    }
    if (request['h2Stream'] !== undefined)
      eventData += 'streamId=' + request.h2Stream + '\n';
    if (request['h2Push'])
      eventData += 'push=true\n';

    if (request['bytesIn'] !== undefined)
      eventData += 'bytesIn=' + request.bytesIn + '\n';
    if (request['objectSize'] !== undefined)
      eventData += 'objectSize=' + request.objectSize + '\n';

    // populate the initiator and fix up the headers if we have a devtools matching request
    if (request['devToolsRequest'] !== undefined &&
        g_instance.requests[request.devToolsRequest] !== undefined) {
      var r = g_instance.requests[request.devToolsRequest];
      eventData += "r=" + JSON.stringify(r) + "\n";
      if (r['initiator'] !== undefined &&
          r.initiator['type'] !== undefined) {
        eventData += 'initiatorType=' + r.initiator.type + '\n';
        if (r.initiator.type == 'parser') {
          if (r.initiator['url'] !== undefined)
            eventData += 'initiatorUrl=' + r.initiator.url + '\n';
          if (r.initiator['lineNumber'] !== undefined)
            eventData += 'initiatorLineNumber=' + r.initiator.lineNumber + '\n';
        } else if (r.initiator.type == 'script' &&
                   r.initiator['stackTrace'] &&
                   r.initiator.stackTrace[0]) {
          if (r.initiator.stackTrace[0]['url'] !== undefined)
            eventData += 'initiatorUrl=' + r.initiator.stackTrace[0].url + '\n';
          if (r.initiator.stackTrace[0]['lineNumber'] !== undefined)
            eventData += 'initiatorLineNumber=' + r.initiator.stackTrace[0].lineNumber + '\n';
          if (r.initiator.stackTrace[0]['columnNumber'] !== undefined)
            eventData += 'initiatorColumnNumber=' + r.initiator.stackTrace[0].columnNumber + '\n';
          if (r.initiator.stackTrace[0]['functionName'] !== undefined)
            eventData += 'initiatorFunctionName=' + r.initiator.stackTrace[0].functionName + '\n';
        }
      }
    }

    // the end of the data is ini-file style for multi-line values
    eventData += '\n';

    // prefer the dev tools headers but fall back to the netlog headers if necessary
    if (r !== undefined &&
        r['response'] !== undefined &&
        r.response['requestHeadersText'] !== undefined) {
      eventData += '[Request Headers]\n' + r.response.requestHeadersText + '\n';
    } else if (r !== undefined &&
               r['response'] !== undefined &&
               r.response['requestHeaders'] !== undefined) {
      eventData += '[Request Headers]\n';
      var method = 'GET';
      if (r.response.requestHeaders['method'] !== undefined)
        method = r.response.requestHeaders['method'];
      else if (r.response.requestHeaders[':method'] !== undefined)
        method = r.response.requestHeaders[':method'];
      var version = 'HTTP/1.1';
      if (r.response.requestHeaders['version'] !== undefined)
        version = r.response.requestHeaders['version'];
      else if (r.response.requestHeaders[':version'] !== undefined)
        version = r.response.requestHeaders[':version'];
      var matches = r.url.match(/[^\/]*\/\/([^\/]+)(.*)/);
      if (matches !== undefined && matches.length > 1) {
        var host = matches[1];
        if (r.response.requestHeaders['host'] !== undefined)
          host = r.response.requestHeaders['host'];
        else if (r.response.requestHeaders[':host'] !== undefined)
          host = r.response.requestHeaders[':host'];
        var object = '/';
        if (matches.length > 2)
          object = matches[2];
        if (r.response.requestHeaders['path'] !== undefined)
          object = r.response.requestHeaders['path'];
        else if (r.response.requestHeaders[':path'] !== undefined)
          object = r.response.requestHeaders[':path'];
        eventData += method + ' ' + object + ' ' + version + '\n';
        eventData += 'Host: ' + host + '\n';
        for (tag in r.response.requestHeaders)
          eventData += tag + ': ' + r.response.requestHeaders[tag] + '\n';
      }
      eventData += '\n';
    } else if (r !== undefined &&
               r['request'] !== undefined &&
               r.request['headers'] !== undefined) {
      eventData += '[Request Headers]\n';
      var method = 'GET';
      if (r.request['method'] !== undefined)
        method = r.request['method'];
      var matches = r.url.match(/[^\/]*\/\/([^\/]+)(.*)/);
      if (matches !== undefined && matches.length > 1) {
        var host = matches[1];
        var object = '/';
        if (matches.length > 2)
          object = matches[2];
        eventData += method + ' ' + object + ' HTTP/1.1\n';
        eventData += 'Host: ' + host + '\n';
        if (r.request['headers'] !== undefined) {
          for (tag in r.request.headers)
            eventData += tag + ': ' + r.request.headers[tag] + '\n';
        }
      }
      eventData += '\n';
    } else if (request['outHeaders'] !== undefined) {
      eventData += '[Request Headers]\n';
      if (request['outHTTP'] !== undefined) {
        eventData += request.outHTTP.trim() + '\n';
      } else if (request['method'] !== undefined && request['object'] !== undefined) {
        eventData += request.method + ' ' + request.object + ' ' + 'HTTP/1.1\n';
      }
      for (var i = 0; i < request.outHeaders.length; i++)
        eventData += request.outHeaders[i] + '\n';
      eventData += '\n';
    }

    if (r !== undefined &&
        r['response'] !== undefined &&
        r.response['headersText'] !== undefined) {
      eventData += '[Response Headers]\n' + r.response.headersText + '\n';
    } else if (r !== undefined &&
               r['response'] !== undefined &&
               r.response['headers'] !== undefined) {
      eventData += '[Response Headers]\n';
      if (r.response.headers['version'] !== undefined &&
          r.response.headers['status'] !== undefined) {
        eventData += r.response.headers['version'] + ' ' + r.response.headers['status'] + '\n';
      } else if (r.response.headers['status'] !== undefined) {
        eventData += 'HTTP/2 ' + r.response.headers['status'] + '\n';
      }
      for (tag in r.response.headers) {
        if (tag !== 'version' && tag !== 'status')
          eventData += tag + ': ' + r.response.headers[tag] + '\n';
      }
    } else if (request['inHeaders'] !== undefined) {
      eventData += '[Response Headers]\n';
      for (var i = 0; i < request.inHeaders.length; i++)
        eventData += request.inHeaders[i] + '\n';
      eventData += '\n';
    }

    wpt.chromeDebugger.sendEvent('request_data', eventData);
  }
};


wpt.chromeDebugger.ParseNetlogDNSEntry = function(entry) {
  var id = entry['id'];
  if (entry.name === "HOST_RESOLVER_IMPL_JOB") {
    if (g_instance.netlogDNS[id] === undefined) {
      g_instance.netlogDNS[id] = {};
    }
    if (entry['ph'] === 'b') {
      g_instance.netlogDNS[id].start = entry['ts'];
    } else if (entry['ph'] === 'e') {
      g_instance.netlogDNS[id].end = entry['ts'];
    }

  }
  if (g_instance.netlogDNS[id] !== undefined && entry['args'] !== undefined && entry.args['params'] !== undefined) {
    if (entry.args.params['host'] !== undefined) {
      g_instance.netlogDNS[id].host = entry.args.params['host'];
    }
    if (entry.args.params['address_list'] !== undefined) {
      g_instance.netlogDNS[id].address_list = entry.args.params['address_list'];
    }
  }
};

wpt.chromeDebugger.ParseNetlogConnectEntry = function(entry) {
  var id = entry['id'];
  if (entry.name === "TCP_CONNECT_ATTEMPT" &&
      entry['ph'] === 'b' &&
      entry['args'] !== undefined &&
      entry.args['params'] !== undefined &&
      entry.args.params['address'] !== undefined &&
      entry.args.params.address !== "127.0.0.1:8888" &&
      g_instance.netlogConnections[id] === undefined) {
    g_instance.netlogConnections[id] = {address: entry.args.params.address, start: entry['ts']};
  }
  if (g_instance.netlogConnections[id] !== undefined) {
    if (entry.name === "TCP_CONNECT_ATTEMPT" && entry['ph'] === 'e') {
      g_instance.netlogConnections[id].end = entry['ts'];
    }
    if (entry.name === "TCP_CONNECT" &&
        entry['ph'] === 'e' &&
        entry['args'] !== undefined &&
        entry.args['params'] !== undefined &&
        entry.args.params['source_address'] !== undefined) {
      g_instance.netlogConnections[id].sourceAddress = entry.args.params.source_address;
    }

    // Track bytes-in for requests on the socket if the socket isn't multiplexing HTTP/2 sessions
    if (entry['args'] !== undefined &&
        entry.args['params'] !== undefined &&
        entry.args.params['byte_count'] !== undefined &&
        g_instance.netlogConnections[id]['request'] !== undefined &&
        g_instance.netlogConnections[id]['h2session'] === undefined &&
        g_instance.netlogRequests[g_instance.netlogConnections[id].request] !== undefined) {
      if (entry.name === "SOCKET_BYTES_RECEIVED") {
        g_instance.netlogRequests[g_instance.netlogConnections[id].request].bytesIn += entry.args.params.byte_count;
        if (g_instance.netlogRequests[g_instance.netlogConnections[id].request]['firstByte'] !== undefined)
          g_instance.netlogRequests[g_instance.netlogConnections[id].request].objectSize += entry.args.params.byte_count;
      } else if (entry.name === "SOCKET_BYTES_SENT") {
        g_instance.netlogRequests[g_instance.netlogConnections[id].request].bytesOut += entry.args.params.byte_count;
      }
    }
  }
};

wpt.chromeDebugger.ParseNetlogSSLEntry = function(entry) {
  var id = entry['id'];
  if (g_instance.netlogConnections[id] !== undefined) {
    if (entry['ph'] === 'b') {
      g_instance.netlogConnections[id].sslStart = entry['ts'];
    } else if (entry['ph'] === 'e') {
      g_instance.netlogConnections[id].sslEnd = entry['ts'];
    }
  }
};

wpt.chromeDebugger.parseHeaders = function(headers) {
  if (headers.constructor === Array) {
    return headers;
  }
  var ret = [];
  var host = undefined;
  var hostExists = false;
  for (var key in headers) {
    if (key === ':host' || key === ':authority') {
      host = headers[key];
    } else if (key === 'Host:' || key === 'host:') {
      hostExists = true;
    }
    ret.push(key + ': ' + headers[key]);
  }
  if (!hostExists && host !== undefined) {
      ret.push('Host: ' + host);
  }
  return ret;
};

wpt.chromeDebugger.ParseNetlogRequestEntry = function(entry) {
  var id = entry['id'];
  if (entry.name === "URL_REQUEST_START_JOB" &&
      entry['ph'] === 'b' &&
      entry['args'] !== undefined &&
      entry.args['params'] !== undefined &&
      entry.args.params['url']) {
    // Following a redirect will re-use the same request ID. Easiest way to
    // deal is to clone the original request ID to a new ID and close it out.
    if (g_instance.netlogRequests[id] !== undefined) {
      if (g_instance.netlogRequests[id]['start'] !== undefined) {
        g_instance.netlogRequests[id].end = entry['ts'];
        if (g_instance.netlogRequests[id]['socket'] !== undefined &&
            g_instance.netlogConnections[g_instance.netlogRequests[id].socket] !== undefined &&
            g_instance.netlogConnections[g_instance.netlogRequests[id].socket]['request'] === id) {
          delete g_instance.netlogConnections[g_instance.netlogRequests[id].socket].request;
        }
        var newId = 100000 + id;
        while (g_instance.netlogRequests[newId] !== undefined)
          newId++;
        g_instance.netlogRequests[newId] = g_instance.netlogRequests[id];
      }
      delete g_instance.netlogRequests[id];
    }

    var parser = document.createElement('a');
    parser.href = entry.args.params.url;
    var hostname = parser.hostname;
    if (hostname !== "127.0.0.1") {
      g_instance.netlogRequests[id] = {url: entry.args.params.url,
                                               host: hostname,
                                               object: parser.pathname + parser.search,
                                               bytesIn: 0,
                                               bytesOut: 0,
                                               objectSize: 0};
      if (entry.args.params['priority'] !== undefined) {
        g_instance.netlogRequests[id].priority = entry.args.params.priority;
      }
      if (entry.args.params['method'] !== undefined) {
        g_instance.netlogRequests[id].method = entry.args.params.method;
      }
    }
  }

  if (g_instance.netlogRequests[id] !== undefined) {
    if (entry.name === "HTTP_TRANSACTION_HTTP2_SEND_REQUEST_HEADERS" &&
        g_instance.netlogRequests[id]['h2session'] !== undefined &&
        g_instance.netlogH2Sessions[g_instance.netlogRequests[id].h2session] !== undefined) {
      g_instance.netlogH2Sessions[g_instance.netlogRequests[id].h2session].currentRequest = id;
    }
    if (entry.name === "HTTP_TRANSACTION_SEND_REQUEST" &&
        entry['ph'] === 'b') {
      wpt.chromeDebugger.claimNetlogDNSRequest(id);
      wpt.chromeDebugger.linkNetlogRequest(id);
      g_instance.netlogRequests[id].start = entry['ts'];
    }
    if ((entry.name === "HTTP_TRANSACTION_SEND_REQUEST_HEADERS" ||
         entry.name === "HTTP_TRANSACTION_HTTP2_SEND_REQUEST_HEADERS") &&
        entry['args'] !== undefined &&
        entry.args['params'] !== undefined &&
        entry.args.params['headers'] !== undefined) {
      g_instance.netlogRequests[id].outHeaders = wpt.chromeDebugger.parseHeaders(entry.args.params.headers);
      if (entry.args.params['line'] !== undefined) {
        g_instance.netlogRequests[id].outHTTP = entry.args.params.line;
      }
    }
    if (entry.name === "HTTP_TRANSACTION_READ_RESPONSE_HEADERS" &&
        entry['args'] !== undefined &&
        entry.args['params'] !== undefined &&
        entry.args.params['headers'] !== undefined) {
      if (g_instance.netlogRequests[id]['firstByte'] === undefined) {
        g_instance.netlogRequests[id].firstByte = entry['ts'];
      }
      g_instance.netlogRequests[id].end = entry['ts'];
      g_instance.netlogRequests[id].inHeaders = wpt.chromeDebugger.parseHeaders(entry.args.params.headers);
    }
    if (entry.name === "URL_REQUEST_JOB_FILTERED_BYTES_READ") {
      g_instance.netlogRequests[id].end = entry['ts'];
    }
    if (entry.name === "REQUEST_ALIVE" && entry['ph'] === 'e') {
      g_instance.netlogRequests[id].end = entry['ts'];
      if (g_instance.netlogRequests[id]['socket'] !== undefined &&
          g_instance.netlogConnections[g_instance.netlogRequests[id].socket] !== undefined &&
          g_instance.netlogConnections[g_instance.netlogRequests[id].socket]['request'] === id) {
        delete g_instance.netlogConnections[g_instance.netlogRequests[id].socket].request;
      }
    }
  }
};

wpt.chromeDebugger.ParseHTTP2SessionEntry = function(entry) {
  var id = entry['id'];
  if (entry.name === "HTTP2_SESSION_INITIALIZED" &&
      entry['args'] !== undefined &&
      entry.args['params'] !== undefined &&
      entry.args.params['source_dependency'] !== undefined &&
      entry.args.params.source_dependency['id'] !== undefined) {
    if (g_instance.netlogH2Sessions[id] == undefined) {
      g_instance.netlogH2Sessions[id] = {streams: {}};
    }
    g_instance.netlogH2Sessions[id].socket = entry.args.params.source_dependency.id;
    if (g_instance.netlogConnections[g_instance.netlogH2Sessions[id].socket] !== undefined) {
      g_instance.netlogConnections[g_instance.netlogH2Sessions[id].socket].h2session = id;
    }
    if (entry.args.params['protocol'] !== undefined) {
      g_instance.netlogH2Sessions[id].protocol = entry.args.params.protocol;
    }
  } else if (g_instance.netlogH2Sessions[id] !== undefined) {
    // Link the stream ID to the actual request
    if (g_instance.netlogH2Sessions[id]['currentRequest'] !== undefined) {
      if ((entry.name === "HTTP2_SESSION_SEND_HEADERS" ||
           entry.name === "HTTP2_SESSION_SYN_STREAM") &&
          entry['args'] !== undefined &&
          entry.args['params'] !== undefined &&
          entry.args.params['stream_id'] !== undefined) {
        var streamID = entry.args.params.stream_id;
        if (g_instance.netlogH2Sessions[id].streams[streamID] === undefined) {
          g_instance.netlogH2Sessions[id].streams[streamID] = {bytesIn: 0, bytesOut: 0};
        }
        g_instance.netlogH2Sessions[id].streams[streamID].request = g_instance.netlogH2Sessions[id].currentRequest;
        if (g_instance.netlogRequests[g_instance.netlogH2Sessions[id].currentRequest] !== undefined) {
          g_instance.netlogRequests[g_instance.netlogH2Sessions[id].currentRequest].h2Stream = streamID;
        }
      }
      delete g_instance.netlogH2Sessions[id].currentRequest;
    }
    if (entry['args'] !== undefined &&
        entry.args['params'] !== undefined &&
        entry.args.params['stream_id'] !== undefined &&
        entry.args.params['size'] !== undefined) {
      var streamID = entry.args.params.stream_id;
      if (g_instance.netlogH2Sessions[id].streams[streamID] === undefined) {
        g_instance.netlogH2Sessions[id].streams[streamID] = {bytesIn: 0, bytesOut: 0};
      }
      if (entry.name === "HTTP2_SESSION_RECV_DATA") {
        if (g_instance.netlogH2Sessions[id].streams[streamID]['request'] !== undefined &&
            g_instance.netlogRequests[g_instance.netlogH2Sessions[id].streams[streamID].request] !== undefined) {
            g_instance.netlogRequests[g_instance.netlogH2Sessions[id].streams[streamID].request].bytesIn += entry.args.params.size;
            g_instance.netlogRequests[g_instance.netlogH2Sessions[id].streams[streamID].request].objectSize += entry.args.params.size;
            if (g_instance.netlogRequests[g_instance.netlogH2Sessions[id].streams[streamID].request]['start'] === undefined) {
              g_instance.netlogRequests[g_instance.netlogH2Sessions[id].streams[streamID].request].start = entry['ts'];
            }
            if (g_instance.netlogRequests[g_instance.netlogH2Sessions[id].streams[streamID].request]['firstByte'] === undefined) {
              g_instance.netlogRequests[g_instance.netlogH2Sessions[id].streams[streamID].request].firstByte = entry['ts'];
            }
            g_instance.netlogRequests[g_instance.netlogH2Sessions[id].streams[streamID].request].end = entry['ts'];
        } else {
          g_instance.netlogH2Sessions[id].streams[streamID].bytesIn += entry.args.params.size;
          if (g_instance.netlogH2Sessions[id].streams[streamID]['start'] === undefined) {
            g_instance.netlogH2Sessions[id].streams[streamID].start = entry['ts'];
          }
          if (g_instance.netlogH2Sessions[id].streams[streamID]['firstByte'] === undefined) {
            g_instance.netlogH2Sessions[id].streams[streamID].firstByte = entry['ts'];
          }
          g_instance.netlogH2Sessions[id].streams[streamID].end = entry['ts'];
        }
      }
    }
    if (entry.name === "HTTP2_SESSION_RECV_PUSH_PROMISE" &&
        entry['args'] !== undefined &&
        entry.args['params'] !== undefined &&
        entry.args.params['promised_stream_id'] !== undefined &&
        entry.args.params['headers'] !== undefined) {
      var streamID = entry.args.params.promised_stream_id;
      if (g_instance.netlogH2Sessions[id].streams[streamID] === undefined) {
        g_instance.netlogH2Sessions[id].streams[streamID] = {bytesIn: 0, bytesOut: 0};
      }
      g_instance.netlogH2Sessions[id].streams[streamID].outHeaders = wpt.chromeDebugger.parseHeaders(entry.args.params.headers);
      g_instance.netlogH2Sessions[id].streams[streamID].start = entry['ts'];
      var host = undefined;
      var path = undefined;
      var method = undefined;
      for (var i = 0; i < g_instance.netlogH2Sessions[id].streams[streamID].outHeaders.length; i++) {
        var header = g_instance.netlogH2Sessions[id].streams[streamID].outHeaders[i];
        var match = header.match(/:host: (.*)/);
        if (match && match.length)
          host = match[1];
        match = header.match(/:authority: (.*)/);
        if (match && match.length)
          host = match[1];
        match = header.match(/:path: (.*)/);
        if (match && match.length)
          path = match[1];
        match = header.match(/:method: (.*)/);
        if (match && match.length)
          method = match[1];
      }
      if (host !== undefined && path !== undefined) {
        g_instance.netlogH2Sessions[id].streams[streamID].url = "https://" + host + path;
        g_instance.netlogH2Sessions[id].streams[streamID].object = path;
        g_instance.netlogH2Sessions[id].streams[streamID].host = host;
      }
      if (method !== undefined)
        g_instance.netlogH2Sessions[id].streams[streamID].method = method;
    }
    if (entry.name === "HTTP2_SESSION_RECV_HEADERS" &&
        entry['args'] !== undefined &&
        entry.args['params'] !== undefined &&
        entry.args.params['stream_id'] !== undefined &&
        entry.args.params['headers'] !== undefined) {
      var streamID = entry.args.params.stream_id;
      if (g_instance.netlogH2Sessions[id].streams[streamID] === undefined) {
        g_instance.netlogH2Sessions[id].streams[streamID] = {bytesIn: 0, bytesOut: 0};
      }
      if (g_instance.netlogH2Sessions[id].streams[streamID]['request'] === undefined) {
        g_instance.netlogH2Sessions[id].streams[streamID].inHeaders = wpt.chromeDebugger.parseHeaders(entry.args.params.headers);
        if (g_instance.netlogH2Sessions[id].streams[streamID]['start'] === undefined) {
          g_instance.netlogH2Sessions[id].streams[streamID].start = entry['ts'];
        }
        g_instance.netlogH2Sessions[id].streams[streamID].firstByte = entry['ts'];
        g_instance.netlogH2Sessions[id].streams[streamID].end = entry['ts'];
      }
    }
    if (entry.name === "HTTP2_STREAM_ADOPTED_PUSH_STREAM" &&
        entry['args'] !== undefined &&
        entry.args['params'] !== undefined &&
        entry.args.params['stream_id'] !== undefined &&
        entry.args.params['url'] !== undefined) {
      var streamID = entry.args.params.stream_id;
      var url = entry.args.params.url;
      if (g_instance.netlogH2Sessions[id].streams[streamID] === undefined) {
        g_instance.netlogH2Sessions[id].streams[streamID] = {bytesIn: 0, bytesOut: 0};
      }
      // Find the request that was created on this H2 session and move the
      // pushed information over to it.
      for (var requestId in g_instance.netlogRequests) {
        if (g_instance.netlogRequests[requestId]['start'] === undefined &&
            g_instance.netlogRequests[requestId]['h2session'] !== undefined &&
            g_instance.netlogRequests[requestId].h2session === id &&
            g_instance.netlogRequests[requestId]['url'] !== undefined &&
            g_instance.netlogRequests[requestId].url === url) {
          g_instance.netlogH2Sessions[id].streams[streamID].request = requestId;
          g_instance.netlogRequests[requestId].h2Stream = streamID;
          g_instance.netlogRequests[requestId].bytesIn = g_instance.netlogH2Sessions[id].streams[streamID].bytesIn;
          g_instance.netlogRequests[requestId].objectSize = g_instance.netlogH2Sessions[id].streams[streamID].bytesIn;
          g_instance.netlogRequests[requestId].bytesOut = g_instance.netlogH2Sessions[id].streams[streamID].bytesOut;
          g_instance.netlogRequests[requestId].h2push = true;
          if (g_instance.netlogH2Sessions[id].streams[streamID]['start'] !== undefined) {
            g_instance.netlogRequests[requestId].start = g_instance.netlogH2Sessions[id].streams[streamID].start;
            delete g_instance.netlogH2Sessions[id].streams[streamID].start;
          }
          if (g_instance.netlogH2Sessions[id].streams[streamID]['firstByte'] !== undefined) {
            g_instance.netlogRequests[requestId].firstByte = g_instance.netlogH2Sessions[id].streams[streamID].firstByte;
            delete g_instance.netlogH2Sessions[id].streams[streamID].firstByte;
          }
          if (g_instance.netlogH2Sessions[id].streams[streamID]['end'] !== undefined) {
            g_instance.netlogRequests[requestId].end = g_instance.netlogH2Sessions[id].streams[streamID].end;
            delete g_instance.netlogH2Sessions[id].streams[streamID].end;
          }
          if (g_instance.netlogH2Sessions[id].streams[streamID]['inHeaders'] !== undefined) {
            g_instance.netlogRequests[requestId].inHeaders = g_instance.netlogH2Sessions[id].streams[streamID].inHeaders;
            delete g_instance.netlogH2Sessions[id].streams[streamID].inHeaders;
          }
          if (g_instance.netlogH2Sessions[id].streams[streamID]['outHeaders'] !== undefined) {
            g_instance.netlogRequests[requestId].outHeaders = g_instance.netlogH2Sessions[id].streams[streamID].outHeaders;
            delete g_instance.netlogH2Sessions[id].streams[streamID].outHeaders;
          }
          g_instance.netlogH2Sessions[id].streams[streamID].bytesIn = 0;
          g_instance.netlogH2Sessions[id].streams[streamID].bytesOut = 0;
          break;
        }
      }
    }
  }
};

wpt.chromeDebugger.linkNetlogSocket = function(entry) {
  if (entry['args'] !== undefined &&
      entry.args['params'] !== undefined &&
      entry.args.params['source_dependency'] !== undefined &&
      entry.args.params.source_dependency['id'] !== undefined) {
    var id = entry['id'];
    var dependencyID = entry.args.params.source_dependency.id;
    if (g_instance.netlogStreamJobs[id] === undefined) {
      g_instance.netlogStreamJobs[id] = {};
    }
    if (entry.name === "HTTP_STREAM_JOB_BOUND_TO_REQUEST") {
      g_instance.netlogStreamJobs[id].request = dependencyID;
    } else if (entry.name === "SOCKET_POOL_BOUND_TO_SOCKET") {
      g_instance.netlogStreamJobs[id].socket = dependencyID;
    } else if (entry.name === "HTTP2_SESSION_POOL_IMPORTED_SESSION_FROM_SOCKET" ||
               entry.name === "HTTP2_SESSION_POOL_FOUND_EXISTING_SESSION") {
      g_instance.netlogStreamJobs[id].h2session = dependencyID;
    }
    if (g_instance.netlogStreamJobs[id].socket !== undefined &&
        g_instance.netlogStreamJobs[id].request !== undefined) {
      var socket = g_instance.netlogStreamJobs[id].socket;
      var request = g_instance.netlogStreamJobs[id].request;
      if (g_instance.netlogRequests[request] !== undefined) {
        g_instance.netlogRequests[request].socket = socket;
      }
      if (g_instance.netlogConnections[socket] !== undefined) {
        g_instance.netlogConnections[socket].request = request;
        if (g_instance.netlogConnections[socket]['claimedRequest'] === undefined) {
          g_instance.netlogConnections[socket].claimedRequest = request;
          g_instance.netlogRequests[request].socketConnect = socket;
        }
      }
    }
    if (g_instance.netlogStreamJobs[id].socket !== undefined &&
        g_instance.netlogStreamJobs[id].h2session !== undefined) {
      g_instance.netlogConnections[g_instance.netlogStreamJobs[id].socket].h2session = g_instance.netlogStreamJobs[id].h2session;
      g_instance.netlogH2Sessions[g_instance.netlogStreamJobs[id].h2session].socket = g_instance.netlogStreamJobs[id].socket;
    }
    if (g_instance.netlogStreamJobs[id].h2session !== undefined &&
        g_instance.netlogStreamJobs[id].request !== undefined) {
      g_instance.netlogRequests[g_instance.netlogStreamJobs[id].request].h2session = g_instance.netlogStreamJobs[id].h2session;
    }
  }
};

/**
* Find the dev tools request that matches this netlog request.  This will be
* used at report time to augment the headers (netlog strips cookies) and to
* populate the initiator.
*/
wpt.chromeDebugger.linkNetlogRequest = function(id) {
  var url = g_instance.netlogRequests[id].url;
  for (var devToolsId in g_instance.requests) {
    if (g_instance.requests[devToolsId]['netlogRequest'] === undefined &&
        g_instance.requests[devToolsId]['url'] !== undefined &&
        g_instance.requests[devToolsId]['url'] === url) {
      g_instance.requests[devToolsId].netlogRequest = id;
      g_instance.netlogRequests[id].devToolsRequest = devToolsId;
      break;
    }
  }
};

wpt.chromeDebugger.claimNetlogDNSRequest = function(requestId) {
  if (g_instance.netlogRequests[requestId] !== undefined &&
      g_instance.netlogRequests[requestId]['host'] !== undefined) {
    for (var dnsid in g_instance.netlogDNS) {
      if (g_instance.netlogDNS[dnsid]['host'] !== undefined &&
          g_instance.netlogDNS[dnsid]['claimedRequest'] === undefined &&
          g_instance.netlogDNS[dnsid].host === g_instance.netlogRequests[requestId].host) {
        g_instance.netlogDNS[dnsid].claimedRequest = requestId;
        g_instance.netlogRequests[requestId].dnsLookup = parseInt(dnsid);
        break;
      }
    }
  }
};

wpt.chromeDebugger.createPushedRequest = function(sessionId, streamId) {
  var requestId = 0;
  var stream = g_instance.netlogH2Sessions[sessionId].streams[streamId];
  if (stream['start'] !== undefined && stream['url'] !== undefined) {
    requestId = 900000;
    while (g_instance.netlogRequests[requestId] !== undefined)
      requestId++;
    g_instance.netlogRequests[requestId] = {url: stream.url, start: stream.start};
    if (stream['firstByte'] !== undefined)
      g_instance.netlogRequests[requestId].firstByte = stream.firstByte;
    if (stream['end'] !== undefined)
      g_instance.netlogRequests[requestId].end = stream.end;
    if (stream['inHeaders'] !== undefined) {
      var status = '200';
      for (var i = 0; i < stream.inHeaders; i++ ) {
        var match = header.match(/:status: (.*)/);
        if (match && match.length)
          status = match[1];
      }
      g_instance.netlogRequests[requestId].inHeaders = ['HTTP/1.1 ' + status + ' OK']
      for (i = 0; i < stream.inHeaders.length; i++ )
        g_instance.netlogRequests[requestId].inHeaders.push(stream.inHeaders[i]);
    }
    if (stream['outHeaders'] !== undefined)
      g_instance.netlogRequests[requestId].outHeaders = stream.outHeaders;
    if (g_instance.netlogH2Sessions[sessionId]['socket'] !== undefined)
      g_instance.netlogRequests[requestId].socket = g_instance.netlogH2Sessions[sessionId].socket;
    if (stream['method'] !== undefined)
      g_instance.netlogRequests[requestId].method = stream.method;
    if (stream['object'] !== undefined)
      g_instance.netlogRequests[requestId].object = stream.object;
    if (stream['host'] !== undefined)
      g_instance.netlogRequests[requestId].host = stream.host;
    g_instance.netlogRequests[requestId].h2session = sessionId;
    g_instance.netlogRequests[requestId].h2Stream = streamId;
    g_instance.netlogRequests[requestId].h2Push = true;
    g_instance.netlogRequests[requestId].bytesIn = stream.bytesIn;
    g_instance.netlogRequests[requestId].objectSize = stream.bytesIn;
    g_instance.netlogRequests[requestId].bytesOut = stream.bytesOut;
  }
  return requestId;
};


})());  // namespace
