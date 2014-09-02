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
    g_instance.devToolsTimer = undefined;
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
  g_instance.devToolsData = '';
  g_instance.requests = {};
  g_instance.receivedData = false;
  g_instance.active = active;
  if (active && g_instance.trace) {
    g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Tracing.start');
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
wpt.chromeDebugger.CaptureTimeline = function(callback) {
  g_instance.timeline = true;
  g_instance.timelineStartedCallback = callback;
  g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Timeline.start', null, function(){
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
  if (g_instance.trace) {
    g_instance.statsDoneCallback = callback;
    g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Tracing.end');
  } else {
    callback();
  }
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
      if (g_instance.devToolsTimer == undefined)
        g_instance.devToolsTimer = setTimeout(wpt.chromeDebugger.SendDevToolsData, TIMELINE_AGGREGATION_INTERVAL);
    }
    
    // Page events
    if (message === 'Page.frameNavigated' &&
        params['frame'] !== undefined &&
        params.frame['parentId'] === undefined &&
        g_instance.mobileEmulation != undefined) {
      g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Page.setDeviceMetricsOverride', g_instance.mobileEmulation);
    }
    
    // Network events
    if (message === 'Network.requestWillBeSent') {
      if (params['request'] !== undefined && params.request.url.indexOf('http') == 0) {
        // see if it is a redirect
        if (params['redirectResponse'] !== undefined &&
            g_instance.requests[params.requestId] !== undefined) {
          if (!g_instance.receivedData)
            wpt.chromeDebugger.SendReceivedData();
          if (!params.redirectResponse.fromDiskCache &&
              g_instance.requests[params.requestId]['fromNet'] !== false) {
            g_instance.requests[params.requestId].fromNet = true;
            if (g_instance.requests[params.requestId]['firstByteTime'] === undefined) {
              g_instance.requests[params.requestId].firstByteTime = params.timestamp;
            }
            g_instance.requests[params.requestId].response = params.redirectResponse;
            request = g_instance.requests[params.requestId];
            request.endTime = params.timestamp;
            wpt.chromeDebugger.sendRequestDetails(request);
          }
          delete g_instance.requests[params.requestId];
        }
        var detail = {};
        detail.url = params.request.url;
        detail.initiator = params.initiator;
        detail.startTime = params.timestamp;
        detail.request = params.request;
        detail.fromNet = true;
        detail.bytesIn = 0;
        g_instance.requests[params.requestId] = detail;
      }
    } else if (message === 'Network.dataReceived') {
      if (g_instance.requests[params.requestId] !== undefined) {
        if (!g_instance.receivedData)
          wpt.chromeDebugger.SendReceivedData();
        if (g_instance.requests[params.requestId]['firstByteTime'] === undefined)
          g_instance.requests[params.requestId].firstByteTime = params.timestamp;
        if (g_instance.requests[params.requestId]['bytesIn'] === undefined)
          g_instance.requests[params.requestId]['bytesIn'] = 0;
        if (params['encodedDataLength'] !== undefined && params.encodedDataLength > 0)
          g_instance.requests[params.requestId]['bytesIn'] += params.encodedDataLength;
        else if (params['dataLength'] !== undefined && params.dataLength > 0)
          g_instance.requests[params.requestId]['bytesIn'] += params.dataLength;
      }
    } else if (message === 'Network.responseReceived') {
      if (!g_instance.receivedData)
        wpt.chromeDebugger.SendReceivedData();
      if (!params.response.fromDiskCache &&
          g_instance.requests[params.requestId] !== undefined &&
          g_instance.requests[params.requestId]['fromNet'] !== false) {
        if (g_instance.requests[params.requestId]['firstByteTime'] === undefined) {
          g_instance.requests[params.requestId].firstByteTime = params.timestamp;
        }
        g_instance.requests[params.requestId].response = params.response;
        var request = g_instance.requests[params.requestId];
        var done = false;
        if (request.response.headers['Content-Length'] !== undefined &&
            parseInt(request.response.headers['Content-Length']) === 0)
          done = true;
        else if (request.response.headers['content-length'] !== undefined &&
                 parseInt(request.response.headers['content-length']) === 0)
          done = true;
        if (done ||
            (request.response['status'] !== undefined &&
             request.response.status !== 200 &&
             request.response.status !== 100)) {
          request.endTime = params.timestamp;
          wpt.chromeDebugger.sendRequestDetails(request);
          delete g_instance.requests[params.requestId];
        }
      }
    } else if (message === 'Network.requestServedFromCache') {
      if (!g_instance.receivedData)
        wpt.chromeDebugger.SendReceivedData();
      if (g_instance.requests[params.requestId] !== undefined)
        g_instance.requests[params.requestId].fromNet = false;
    } else if (message === 'Network.loadingFinished') {
      if (!g_instance.receivedData)
        wpt.chromeDebugger.SendReceivedData();
      if (g_instance.requests[params.requestId] !== undefined) {
        if (g_instance.requests[params.requestId]['fromNet']) {
          var request = g_instance.requests[params.requestId];
          request.endTime = params.timestamp;
          wpt.chromeDebugger.sendRequestDetails(request);
        }
        delete g_instance.requests[params.requestId];
      }
    } else if (message === 'Network.loadingFailed') {
      if (g_instance.requests[params.requestId] !== undefined) {
        var request = g_instance.requests[params.requestId];
        request.endTime = params.timestamp;
        request.error = params.errorText;
        request.errorCode =
            wpt.chromeExtensionUtils.netErrorStringToWptCode(request.error);
        wpt.chromeDebugger.sendRequestDetails(request);
        delete g_instance.requests[params.requestId];
      }
    }
  }
};

wpt.chromeDebugger.SendDevToolsData = function() {
  g_instance.devToolsTimer = undefined;
  if (g_instance.devToolsData.length) {
    wpt.chromeDebugger.sendEvent('devTools', g_instance.devToolsData);
    g_instance.devToolsData = '';
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
 * Process and send the data for a single request
 * to the hook for processing
 * @param {object} request Request data.
 */
wpt.chromeDebugger.sendRequestDetails = function(request) {
  var valid = false;
  if (!request['bytesIn'] &&
      request['response'] !== undefined &&
      request.response['headers'] !== undefined) {
    var headerlength = 0;
    if (request.response['headersText'] !== undefined) {
      headerlength = request.response['headersText'].length;
    } else {
      try {
        for (var key in request.response.headers) {
          headerlength += key.length + 4; // include the colon, space and \r\n
          if (request.response.headers[key] !== undefined)
            headerlength += request.response.headers[key].length;
        }    
      } catch(e) {}
    }
    if (request.response.headers['Content-Length'] !== undefined)
      request['bytesIn'] = parseInt(request.response.headers['Content-Length']) + headerlength;
    else if (request.response.headers['content-length'] !== undefined)
      request['bytesIn'] = parseInt(request.response.headers['content-length']) + headerlength;
  }
  var eventData = 'browser=chrome\n';
  eventData += 'url=' + request.url + '\n';
  if (request['errorCode'] !== undefined)
    eventData += 'errorCode=' + request.errorCode + '\n';
  if (request['error'] !== undefined)
    eventData += 'errorText=' + request.error + '\n';
  if (request['startTime'] !== undefined)
    eventData += 'startTime=' + request.startTime + '\n';
  if (request['firstByteTime'] !== undefined)
    eventData += 'firstByteTime=' + request.firstByteTime + '\n';
  if (request['endTime'] !== undefined)
    eventData += 'endTime=' + request.endTime + '\n';
  if (request['bytesIn'] !== undefined)
    eventData += 'bytesIn=' + request.bytesIn + '\n';
  if (request['initiator'] !== undefined &&
      request.initiator['type'] !== undefined) {
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
    if (request.response['timing'] !== undefined) {
      if (request.response.timing['sendStart'] !== undefined && request.response.timing.sendStart > 0)
        valid = true;
      eventData += 'timing.dnsStart=' + request.response.timing.dnsStart + '\n';
      eventData += 'timing.dnsEnd=' + request.response.timing.dnsEnd + '\n';
      eventData += 'timing.connectStart=' + request.response.timing.connectStart + '\n';
      eventData += 'timing.connectEnd=' + request.response.timing.connectEnd + '\n';
      eventData += 'timing.sslStart=' + request.response.timing.sslStart + '\n';
      eventData += 'timing.sslEnd=' + request.response.timing.sslEnd + '\n';
      eventData += 'timing.requestTime=' + request.response.timing.requestTime + '\n';
      if (request.response.timing['sendStart'] !== undefined)
        eventData += 'timing.sendStart=' + request.response.timing.sendStart + '\n';
      if (request.response.timing['sendEnd'] !== undefined)
        eventData += 'timing.sendEnd=' + request.response.timing.sendEnd + '\n';
      if (request.response.timing['receiveHeadersEnd'] !== undefined)
        eventData += 'timing.receiveHeadersEnd=' + request.response.timing.receiveHeadersEnd + '\n';
    }

    // the end of the data is ini-file style for multi-line values
    eventData += '\n';
    if (request.response['requestHeadersText'] !== undefined) {
      eventData += '[Request Headers]\n' + request.response.requestHeadersText + '\n';
    } else if (request['request'] !== undefined) {
      eventData += '[Request Headers]\n';
      var method = 'GET';
      if (request.request['method'] !== undefined) {
        method = request.request['method'];
      }
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
    if (request.response['headersText'] !== undefined) {
      eventData += '[Response Headers]\n' + request.response.headersText + '\n';
    } else if(request.response['headers'] !== undefined) {
      eventData += '[Response Headers]\n';
      if (request.response.headers['version'] !== undefined &&
          request.response.headers['status'] !== undefined) {
        eventData += request.response.headers['version'] + ' ' + request.response.headers['status'] + '\n';
        for (tag in request.response.headers) {
          if (tag !== 'version' && tag !== 'status')
            eventData += tag + ': ' + request.response.headers[tag] + '\n';
        }
      }
    }
  } else if (request['request'] !== undefined) {
    eventData += '[Request Headers]\n';
    var method = 'GET';
    if (request.request['method'] !== undefined) {
      method = request.request['method'];
    }
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
  if (valid)
    wpt.chromeDebugger.sendEvent('request_data', eventData);
};

wpt.chromeDebugger.SendReceivedData = function() {
  g_instance.receivedData = true;
  wpt.chromeDebugger.sendEvent('received_data', '');
};

/**
 * Send an event to the c++ code
 * @param {string} event event string.
 * @param {string} data event data (post body).
 */
wpt.chromeDebugger.sendEvent = function(event, data) {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://127.0.0.1:8888/event/' + event, true);
    xhr.send(data);
  } catch (err) {
    wpt.LOG.warning('Error sending request data XHR: ' + err);
  }
};

})());  // namespace
