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
    g_instance.timelineStartedCallback = undefined;
    g_instance.devToolsData = '';
    g_instance.trace = false;
    g_instance.statsDoneCallback = undefined;
    g_instance.mobileEmulation = undefined;
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
    g_instance.idMap = {};
    g_instance.receivedData = false;
    g_instance.devToolsData = '';
    g_instance.statsDoneCallback = undefined;
    if (g_instance.trace) {
      g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Tracing.start');
    }
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
  g_instance.timelineStartedCallback = callback;
  g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Timeline.start', {maxCallStackDepth: timelineStackDepth}, function(){
    setTimeout(function(){
      if (g_instance.timelineStartedCallback) {
        g_instance.timelineStartedCallback();
        g_instance.timelineStartedCallback = undefined;
      }
    }, TIMELINE_START_TIMEOUT);
  });
};

/**
 * Capture a trace
 */
wpt.chromeDebugger.CaptureTrace = function() {
  g_instance.trace = true;
  if (g_instance.active) {
    g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Tracing.start');
  }
};

wpt.chromeDebugger.CollectStats = function(callback) {
  g_instance.statsDoneCallback = callback;
  wpt.chromeDebugger.SendDevToolsData(function(){
    if (g_instance.trace) {
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
  if (g_instance.timelineStartedCallback &&
      message === 'Timeline.eventRecorded') {
    g_instance.timelineStartedCallback();
    g_instance.timelineStartedCallback = undefined;
  }
  var tracing = false;
  if (message === 'Tracing.dataCollected') {
    tracing = true;
    if (params['value'] !== undefined)
      wpt.chromeDebugger.sendEvent('trace', JSON.stringify(params['value']));
  }
  if (message === 'Tracing.tracingComplete') {
    tracing = true;
    if (g_instance.statsDoneCallback)
      g_instance.statsDoneCallback();
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
    // Processing logic largely duplocated from the WebPageTest PHP code
    if (params['requestId'] !== undefined) {
      if (message === 'Network.requestServedFromCache') {
        wpt.chromeDebugger.SendReceivedData();
        if (g_instance.requests[params.requestId] !== undefined) {
          g_instance.requests[params.requestId].fromNet = false;
          g_instance.requests[params.requestId].fromCache = true;
        }
      } else if (params['timestamp'] !== undefined) {
        params.timestamp *= 1000;  // Convert it to ms
        var id = params.requestId;
        var originalId = id;
        if (g_instance.idMap[id] !== undefined)
          id += '-' + g_instance.idMap[id];
        if (message === 'Network.requestWillBeSent' && params['request'] !== undefined && params.request['url'] !== undefined && params.request.url.indexOf('http') == 0) {
          var request = params.request;
          request.startTime = params.timestamp;
          request.endTime = params.timestamp;
          if (params['initiator'] !== undefined)
            request.initiator = params.initiator;
          // redirects re-use the same request ID
          if (g_instance.requests[id] !== undefined) {
            wpt.chromeDebugger.SendReceivedData();
            if (params['redirectResponse'] !== undefined) {
              if (g_instance.requests[id]['endTime'] === undefined || params.timestamp > g_instance.requests[id].endTime)
                  g_instance.requests[id].endTime = params.timestamp;
              if (g_instance.requests[id]['firstByteTime'] === undefined)
                  g_instance.requests[id].firstByteTime = params.timestamp;
              g_instance.requests[id].fromNet = false;
              if (params.redirectResponse['fromDiskCache'] !== undefined && !params.redirectResponse.fromDiskCache)
                g_instance.requests[id].fromNet = true;
              g_instance.requests[id].response = params.redirectResponse;
            }
            wpt.chromeDebugger.sendRequestDetails(id);
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
          if (g_instance.requests[id]['endTime'] === undefined || params.timestamp > g_instance.requests[id].endTime)
              g_instance.requests[id].endTime = params.timestamp;
          if (message === 'Network.dataReceived') {
            wpt.chromeDebugger.SendReceivedData();
            if (g_instance.requests[id]['firstByteTime'] === undefined)
              g_instance.requests[id].firstByteTime = params.timestamp;
            if (g_instance.requests[id]['bytesInData'] === undefined)
              g_instance.requests[id].bytesInData = 0;
            if (params['dataLength'] !== undefined)
              g_instance.requests[id].bytesInData += params.dataLength;
            if (g_instance.requests[id]['bytesInEncoded'] === undefined)
              g_instance.requests[id].bytesInEncoded = 0;
            if (params['encodedDataLength'] !== undefined)
              g_instance.requests[id].bytesInEncoded += params.encodedDataLength;
          } else if (message === 'Network.responseReceived' && params['response'] !== undefined) {
            wpt.chromeDebugger.SendReceivedData();
            if (g_instance.requests[id]['firstByteTime'] === undefined)
              g_instance.requests[id].firstByteTime = params.timestamp;
            g_instance.requests[id].fromNet = false;
            // the timing data for cached resources is completely bogus
            if (g_instance.requests[id]['fromCache'] !== undefined && params.response['timing'] !== undefined)
              delete params.response.timing;
            if (params.response['fromDiskCache'] !== undefined &&
                !params.response.fromDiskCache &&
                g_instance.requests[id]['fromCache'] === undefined) {
              g_instance.requests[id].fromNet = true;
            }
            // adjust the start time
            if (params.response['timing'] !== undefined && params.response.timing['receiveHeadersEnd'] !== undefined)
              g_instance.requests[id].startTime = params.timestamp - params.response.timing.receiveHeadersEnd;
            g_instance.requests[id].response = params.response;
            var done = false;
            if (g_instance.requests[id].response['headers'] !== undefined &&
                g_instance.requests[id].response.headers['Content-Length'] !== undefined &&
                parseInt(g_instance.requests[id].response.headers['Content-Length']) === 0) {
              done = true;
            }
            if (g_instance.requests[id].response['headers'] !== undefined &&
                g_instance.requests[id].response.headers['content-length'] !== undefined &&
                parseInt(g_instance.requests[id].response.headers['content-length']) === 0) {
              done = true;
            }
            if (done ||
                (g_instance.requests[id].response['status'] !== undefined &&
                 g_instance.requests[id].response.status !== 200 &&
                 g_instance.requests[id].response.status !== 100)) {
              g_instance.requests[id].endTime = params.timestamp;
              wpt.chromeDebugger.sendRequestDetails(id);
            }
          } else if (message === 'Network.loadingFinished') {
            wpt.chromeDebugger.SendReceivedData();
            if (g_instance.requests[id]['firstByteTime'] === undefined)
              g_instance.requests[id].firstByteTime = params.timestamp;
            if (g_instance.requests[id]['endTime'] === undefined || params.timestamp > g_instance.requests[id].endTime)
              g_instance.requests[id].endTime = params.timestamp;
            wpt.chromeDebugger.sendRequestDetails(id);
          } else if (message === 'Network.loadingFailed') {
            if (g_instance.requests[id]['response'] !== undefined && g_instance.requests[id]['fromCache'] === undefined) {
              if (params['canceled'] !== undefined && params.canceled) {
                g_instance.requests[id].canceled = true;
              } else {
                g_instance.requests[id].fromNet = true;
                g_instance.requests[id].errorCode = 12999;
                if (g_instance.requests[id]['firstByteTime'] === undefined)
                  g_instance.requests[id].firstByteTime = params.timestamp;
                if (g_instance.requests[id]['endTime'] === undefined || params.timestamp > g_instance.requests[id].endTime)
                  g_instance.requests[id].endTime = params.timestamp;
                if (params['errorText'] !== undefined) {
                  g_instance.requests[id].error = params.errorText;
                  g_instance.requests[id].errorCode = wpt.chromeExtensionUtils.netErrorStringToWptCode(params.errorText);
                } else if (params['error'] !== undefined) {
                  g_instance.requests[id].errorCode = params.error;
                }
              }
              wpt.chromeDebugger.sendRequestDetails(id);
            }
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

/**
 * Attached using the 1.0 released interface
 */
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
* Fix up all of the request details for sending
*/
wpt.chromeDebugger.FinalizeRequest = function(id) {
  // keep track of some common checks
  if (g_instance.requests[id]['response'] !== undefined && g_instance.requests[id].response['timing'] !== undefined)
    hasTiming = true;

  // Fix the "requestTime" to be in ms and use it as the anchor for the start time
  if (hasTiming && g_instance.requests[id].response.timing['requestTime'] !== undefined) {
    g_instance.requests[id].response.timing.requestTime *= 1000;
    g_instance.requests[id].startTime = g_instance.requests[id].response.timing.requestTime;
  }

  // Calculate absolute timestamps for all of the timings
  if (hasTiming) {
    if (g_instance.requests[id].response.timing['dnsStart'] !== undefined &&
        g_instance.requests[id].response.timing['dnsEnd'] !== undefined &&
        g_instance.requests[id].response.timing.dnsStart !== -1 &&
        g_instance.requests[id].response.timing.dnsEnd !== -1 &&
        g_instance.requests[id].response.timing.dnsEnd > g_instance.requests[id].response.timing.dnsStart) {
      g_instance.requests[id].dnsStart = g_instance.requests[id].startTime + g_instance.requests[id].response.timing.dnsStart;
      g_instance.requests[id].dnsEnd = g_instance.requests[id].startTime + g_instance.requests[id].response.timing.dnsEnd;
    }
    if (g_instance.requests[id].response.timing['connectStart'] !== undefined &&
        g_instance.requests[id].response.timing['connectEnd'] !== undefined &&
        g_instance.requests[id].response.timing.connectStart !== -1 &&
        g_instance.requests[id].response.timing.connectEnd !== -1 &&
        g_instance.requests[id].response.timing.connectEnd > g_instance.requests[id].response.timing.connectStart) {
      g_instance.requests[id].connectStart = g_instance.requests[id].startTime + g_instance.requests[id].response.timing.connectStart;
      if (g_instance.requests[id].response.timing['sslStart'] !== undefined &&
          g_instance.requests[id].response.timing.sslStart !== -1 &&
          g_instance.requests[id].response.timing.sslStart > g_instance.requests[id].response.timing.connectStart) {
        g_instance.requests[id].connectEnd = g_instance.requests[id].startTime + g_instance.requests[id].response.timing.sslStart;
      } else {
        g_instance.requests[id].connectEnd = g_instance.requests[id].startTime + g_instance.requests[id].response.timing.connectEnd;
      }
    }
    if (g_instance.requests[id].response.timing['sslStart'] !== undefined &&
        g_instance.requests[id].response.timing['sslEnd'] !== undefined &&
        g_instance.requests[id].response.timing.sslStart !== -1 &&
        g_instance.requests[id].response.timing.sslEnd !== -1 &&
        g_instance.requests[id].response.timing.sslEnd > g_instance.requests[id].response.timing.sslStart) {
      g_instance.requests[id].sslStart = g_instance.requests[id].startTime + g_instance.requests[id].response.timing.sslStart;
      g_instance.requests[id].sslEnd = g_instance.requests[id].startTime + g_instance.requests[id].response.timing.sslEnd;
    }
    if (g_instance.requests[id].response.timing['sendStart'] !== undefined &&
        g_instance.requests[id].response.timing.sendStart !== -1) {
      g_instance.requests[id].requestStart = g_instance.requests[id].startTime + g_instance.requests[id].response.timing.sendStart;
    }
    if (g_instance.requests[id].response.timing['receiveHeadersEnd'] !== undefined &&
        g_instance.requests[id].response.timing.receiveHeadersEnd !== -1) {
      g_instance.requests[id].firstByteTime = g_instance.requests[id].startTime + g_instance.requests[id].response.timing.receiveHeadersEnd;
    }
  }

  // Fix-up the bytes in (fall back to content length) if we didn't get it explicitly
  if (g_instance.requests[id]['bytesIn'] === undefined && g_instance.requests[id]['bytesInEncoded'] !== undefined)
    g_instance.requests[id].bytesIn = g_instance.requests[id].bytesInEncoded;
  if (!g_instance.requests[id]['bytesIn'] && g_instance.requests[id]['response'] !== undefined && g_instance.requests[id].response['headers'] !== undefined) {
    var headerlength = 0;
    if (g_instance.requests[id].response['headersText'] !== undefined) {
      headerlength = g_instance.requests[id].response['headersText'].length;
    } else {
      try {
        for (var key in g_instance.requests[id].response.headers) {
          headerlength += key.length + 4; // include the colon, space and \r\n
          if (g_instance.requests[id].response.headers[key] !== undefined)
            headerlength += g_instance.requests[id].response.headers[key].length;
        }    
      } catch(e) {}
    }
    if (g_instance.requests[id].response.headers['Content-Length'] !== undefined)
      g_instance.requests[id]['bytesIn'] = parseInt(g_instance.requests[id].response.headers['Content-Length']) + headerlength;
    else if (g_instance.requests[id].response.headers['content-length'] !== undefined)
      g_instance.requests[id]['bytesIn'] = parseInt(g_instance.requests[id].response.headers['content-length']) + headerlength;
  }
}

/**
 * Process and send the data for a single request
 * to the hook for processing
 * @param {object} request Request data.
 */
wpt.chromeDebugger.sendRequestDetails = function(id) {
  if (g_instance.requests[id] === undefined || g_instance.requests[id]['sent'] !== undefined)
    return;
  wpt.chromeDebugger.FinalizeRequest(id);
  g_instance.requests[id].sent = true;

  var request = g_instance.requests[id];
  if (request['fromNet'] !== undefined && request.fromNet && request['requestStart'] !== undefined) {
    var eventData = 'browser=chrome\n';
    eventData += 'id=' + id + '\n';
    eventData += 'url=' + request.url + '\n';
    if (request['errorCode'] !== undefined)
      eventData += 'errorCode=' + request.errorCode + '\n';
    if (request['error'] !== undefined)
      eventData += 'errorText=' + request.error + '\n';

    if (request['startTime'] !== undefined)
      eventData += 'startTime=' + request.startTime + '\n';
    if (request['requestStart'] !== undefined)
      eventData += 'requestStart=' + request.requestStart + '\n';
    if (request['firstByteTime'] !== undefined)
      eventData += 'firstByteTime=' + request.firstByteTime + '\n';
    if (request['endTime'] !== undefined)
      eventData += 'endTime=' + request.endTime + '\n';
    if (request['dnsStart'] !== undefined)
      eventData += 'dnsStart=' + request.dnsStart + '\n';
    if (request['dnsEnd'] !== undefined)
      eventData += 'dnsEnd=' + request.dnsEnd + '\n';
    if (request['connectStart'] !== undefined)
      eventData += 'connectStart=' + request.connectStart + '\n';
    if (request['connectEnd'] !== undefined)
      eventData += 'connectEnd=' + request.connectEnd + '\n';
    if (request['sslStart'] !== undefined)
      eventData += 'sslStart=' + request.sslStart + '\n';
    if (request['sslEnd'] !== undefined)
      eventData += 'sslEnd=' + request.sslEnd + '\n';

    if (request['bytesIn'] !== undefined)
      eventData += 'bytesIn=' + request.bytesIn + '\n';
    if (request['initiator'] !== undefined && request.initiator['type'] !== undefined) {
      eventData += 'initiatorType=' + request.initiator.type + '\n';
      if (request.initiator.type == 'parser') {
        if (request.initiator['url'] !== undefined)
          eventData += 'initiatorUrl=' + request.initiator.url + '\n';
        if (request.initiator['lineNumber'] !== undefined)
          eventData += 'initiatorLineNumber=' + request.initiator.lineNumber + '\n';
      } else if (request.initiator.type == 'script' &&
                 request.initiator['stackTrace'] &&
                 request.initiator.stackTrace[0]) {
        if (request.initiator.stackTrace[0]['url'] !== undefined)
          eventData += 'initiatorUrl=' + request.initiator.stackTrace[0].url + '\n';
        if (request.initiator.stackTrace[0]['lineNumber'] !== undefined)
          eventData += 'initiatorLineNumber=' + request.initiator.stackTrace[0].lineNumber + '\n';
        if (request.initiator.stackTrace[0]['columnNumber'] !== undefined)
          eventData += 'initiatorColumnNumber=' + request.initiator.stackTrace[0].columnNumber + '\n';
        if (request.initiator.stackTrace[0]['functionName'] !== undefined)
          eventData += 'initiatorFunctionName=' + request.initiator.stackTrace[0].functionName + '\n';
      }
    }
    if (request['response'] !== undefined) {
      if (request.response['status'] !== undefined)
        eventData += 'status=' + request.response.status + '\n';
      if (request.response['connectionId'] !== undefined)
        eventData += 'connectionId=' + request.response.connectionId + '\n';

      // the end of the data is ini-file style for multi-line values
      eventData += '\n';
      if (request.response['requestHeadersText'] !== undefined) {
        eventData += '[Request Headers]\n' + request.response.requestHeadersText + '\n';
      } else if (request.response['requestHeaders'] !== undefined) {
        eventData += '[Request Headers]\n';
        var method = 'GET';
        if (request.response.requestHeaders['method'] !== undefined)
          method = request.response.requestHeaders['method'];
        else if (request.response.requestHeaders[':method'] !== undefined)
          method = request.response.requestHeaders[':method'];
        var version = 'HTTP/1.1';
        if (request.response.requestHeaders['version'] !== undefined)
          version = request.response.requestHeaders['version'];
        else if (request.response.requestHeaders[':version'] !== undefined)
          version = request.response.requestHeaders[':version'];
        var matches = request.url.match(/[^\/]*\/\/([^\/]+)(.*)/);
        if (matches !== undefined && matches.length > 1) {
          var host = matches[1];
          if (request.response.requestHeaders['host'] !== undefined)
            host = request.response.requestHeaders['host'];
          else if (request.response.requestHeaders[':host'] !== undefined)
            host = request.response.requestHeaders[':host'];
          var object = '/';
          if (matches.length > 2)
            object = matches[2];
          if (request.response.requestHeaders['path'] !== undefined)
            object = request.response.requestHeaders['path'];
          else if (request.response.requestHeaders[':path'] !== undefined)
            object = request.response.requestHeaders[':path'];
          eventData += method + ' ' + object + ' ' + version + '\n';
          eventData += 'Host: ' + host + '\n';
          for (tag in request.response.requestHeaders)
            eventData += tag + ': ' + request.response.requestHeaders[tag] + '\n';
        }
        eventData += '\n';
      } else if (request['request'] !== undefined) {
        eventData += '[Request Headers]\n';
        var method = 'GET';
        if (request.request['method'] !== undefined)
          method = request.request['method'];
        var matches = request.url.match(/[^\/]*\/\/([^\/]+)(.*)/);
        if (matches !== undefined && matches.length > 1) {
          var host = matches[1];
          var object = '/';
          if (matches.length > 2)
            object = matches[2];
          eventData += method + ' ' + object + ' HTTP/1.1\n';
          eventData += 'Host: ' + host + '\n';
          if (request.request['headers'] !== undefined) {
            for (tag in request.request.headers)
              eventData += tag + ': ' + request.request.headers[tag] + '\n';
          }
        }
        eventData += '\n';
      }

      if (request.response['headersText'] !== undefined) {
        eventData += '[Response Headers]\n' + request.response.headersText + '\n';
      } else if(request.response['headers'] !== undefined) {
        eventData += '[Response Headers]\n';
        if (request.response.headers['version'] !== undefined &&
            request.response.headers['status'] !== undefined) {
          eventData += request.response.headers['version'] + ' ' + request.response.headers['status'] + '\n';
        } else if (request.response.headers['status'] !== undefined) {
          eventData += 'HTTP/2.0 ' + request.response.headers['status'] + '\n';
        }
        for (tag in request.response.headers) {
          if (tag !== 'version' && tag !== 'status')
            eventData += tag + ': ' + request.response.headers[tag] + '\n';
        }
      }
    } else if (request['request'] !== undefined) {
      eventData += '[Request Headers]\n';
      var method = 'GET';
      if (request.request['method'] !== undefined)
        method = request.request['method'];
      var matches = request.url.match(/[^\/]*\/\/([^\/]+)(.*)/);
      if (matches !== undefined && matches.length > 1) {
        var host = matches[1];
        var object = '/';
        if (matches.length > 2) {
          object = matches[2];
        }
        eventData += method + ' ' + object + ' HTTP/1.1\n';
        eventData += 'Host: ' + host + '\n';
        if (request.request['headers'] !== undefined) {
          for (tag in request.request.headers) {
            eventData += tag + ': ' + request.request.headers[tag] + '\n';
          }
        }
      }
      eventData += '\n';
    }
    wpt.chromeDebugger.sendEvent('request_data', eventData);
  }
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

})());  // namespace
