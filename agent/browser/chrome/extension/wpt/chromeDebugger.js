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

goog.require('wpt.logging');
goog.provide('wpt.chromeDebugger');

((function() {  // namespace

var g_instance = {connected: false, timeline: false, timelineConnected: false};

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
wpt.chromeDebugger.Init = function(tabId, chromeApi) {
  try {
    g_instance.tabId_ = tabId;
    g_instance.chromeApi_ = chromeApi;
    var version = '1.0';
    if (g_instance.chromeApi_['debugger']) {
        g_instance.chromeApi_.debugger.attach({tabId: g_instance.tabId_}, version, wpt.chromeDebugger.OnAttachDebugger);
    } else if (g_instance.chromeApi_.experimental['debugger']) {
      // deal with the different function signatures for different chrome versions
      try {
        g_instance.chromeApi_.experimental.debugger.attach(g_instance.tabId_, wpt.chromeDebugger.OnAttachOld);
      } catch (err) {
        version = '0.1';
        g_instance.chromeApi_.experimental.debugger.attach({tabId: g_instance.tabId_}, version, wpt.chromeDebugger.OnAttachExperimental);
      }
    }
  } catch (err) {
    wpt.LOG.warning('Error initializing debugger interfaces: ' + err);
  }
};

/**
 * Capture the network timeline
 */
wpt.chromeDebugger.CaptureTimeline = function() {
  g_instance.timeline = true;
  if (g_instance.connected) {
    try {
      if (g_instance.chromeApi_['debugger']) {
        g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Timeline.start');
      } else if (g_instance.chromeApi_.experimental['debugger']) {
        g_instance.chromeApi_.experimental.debugger.sendRequest(g_instance.tabId_, 'Timeline.start');
      }
      g_instance.timelineConnected = true;
    } catch (err) {
      wpt.LOG.warning('Error starting timeline capture (already connected): ' + err);
    }
  }
}

/**
 * Actual message callback
 */
wpt.chromeDebugger.OnMessage = function(tabId, message, params) {
  // Network events
  if (message === 'Network.requestWillBeSent') {
    if (params.request.url.indexOf('http') == 0) {
      var detail = {};
      detail.url = params.request.url;
      detail.initiator = params.initiator;
      detail.startTime = params.timestamp;
      if (params['request'] !== undefined) {
        detail.request = params.request;
      }
      g_instance.requests[params.requestId] = detail;
    }
  } else if (message === 'Network.dataReceived') {
    if (g_instance.requests[params.requestId] !== undefined &&
        g_instance.requests[params.requestId]['firstByteTime'] === undefined) {
      g_instance.requests[params.requestId].firstByteTime = params.timestamp;
    }
  } else if (message === 'Network.responseReceived') {
    if (!params.response.fromDiskCache &&
        g_instance.requests[params.requestId] !== undefined) {
      g_instance.requests[params.requestId].fromNet = true;
      if (g_instance.requests[params.requestId]['firstByteTime'] === undefined) {
        g_instance.requests[params.requestId].firstByteTime = params.timestamp;
      }
      g_instance.requests[params.requestId].response = params.response;
    }
  } else if (message === 'Network.loadingFinished') {
    if (g_instance.requests[params.requestId] !== undefined &&
        g_instance.requests[params.requestId]['fromNet']) {
      request = g_instance.requests[params.requestId];
      request.endTime = params.timestamp;
      wpt.chromeDebugger.sendRequestDetails(request);
    }
  } else if (message === 'Network.loadingFailed') {
    if (g_instance.requests[params.requestId] !== undefined) {
      request = g_instance.requests[params.requestId];
      request.endTime = params.timestamp;
      request.error = params.errorText;
      request.errorCode = 12999;
      if (request.error == 'net::ERR_NAME_NOT_RESOLVED') {
        request.errorCode = 12007;
      } else if (request.error == 'net::ERR_CONNECTION_ABORTED') {
        request.errorCode = 12030;
      } else if (request.error == 'net::ERR_ADDRESS_UNREACHABLE') {
        request.errorCode = 12029;
      } else if (request.error == 'net::ERR_CONNECTION_REFUSED') {
        request.errorCode = 12029;
      } else if (request.error == 'net::ERR_CONNECTION_TIMED_OUT') {
        request.errorCode = 12029;
      } else if (request.error == 'net::ERR_CONNECTION_RESET') {
        request.errorCode = 12031;
      }
      wpt.chromeDebugger.sendRequestDetails(request);
    }
  }

  // console events
  else if (message === 'Console.messageAdded') {
    wpt.chromeDebugger.sendEvent('console_log', JSON.stringify(params.message));
  }

  // Timeline
  else if (message === 'Timeline.eventRecorded') {
    wpt.chromeDebugger.sendEvent('timeline', JSON.stringify(params.record));
  }

  // Page events
  else if (message === 'Page.loadEventFired') {
    wpt.chromeDebugger.sendEvent('load?timestamp=' + params.timestamp, '');
  }
}

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
  g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Network.enable');
  g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Console.enable');
  g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Page.enable');
  if (g_instance.timeline && !g_instance.timelineConnected) {
    g_instance.timelineConnected = true;
    g_instance.chromeApi_.debugger.sendCommand({tabId: g_instance.tabId_}, 'Timeline.start');
  }
}

/**
 * Attached using the old experimental interface
 */
wpt.chromeDebugger.OnAttachOld = function() {
  wpt.LOG.info('attached to debugger old experimental extension interface');
  g_instance.connected = true;
  g_instance.requests = {};

  // attach the event listener
  g_instance.chromeApi_.experimental.debugger.onEvent.addListener(wpt.chromeDebugger.OnMessage);

  // start the different interfaces we are interested in monitoring
  g_instance.chromeApi_.experimental.debugger.sendRequest(g_instance.tabId_, 'Network.enable');
  g_instance.chromeApi_.experimental.debugger.sendRequest(g_instance.tabId_, 'Console.enable');
  g_instance.chromeApi_.experimental.debugger.sendRequest(g_instance.tabId_, 'Page.enable');
  if (g_instance.timeline && !g_instance.timelineConnected) {
    g_instance.timelineConnected = true;
    g_instance.chromeApi_.experimental.debugger.sendRequest(g_instance.tabId_, 'Timeline.start');
  }
}

/**
 * Attached using the new experimental interface
 */
wpt.chromeDebugger.OnAttachExperimental = function() {
  wpt.LOG.info('attached to debugger experimental extension interface');
  g_instance.requests = {};

  // attach the event listener
  g_instance.chromeApi_.experimental.debugger.onEvent.addListener(wpt.chromeDebugger.OnMessage);

  // start the different interfaces we are interested in monitoring
  g_instance.chromeApi_.experimental.debugger.sendCommand({tabId: g_instance.tabId_}, 'Network.enable');
  g_instance.chromeApi_.experimental.debugger.sendCommand({tabId: g_instance.tabId_}, 'Console.enable');
  g_instance.chromeApi_.experimental.debugger.sendCommand({tabId: g_instance.tabId_}, 'Page.enable');
  // the timeline is pretty resource intensive so it is optional
  if (g_instance.timeline && !g_instance.timelineConnected) {
    g_instance.timelineConnected = true;
    g_instance.chromeApi_.experimental.debugger.sendCommand({tabId: g_instance.tabId_}, 'Timeline.start');
  }
}

/**
 * Process and send the data for a single request
 * to the hook for processing
 * @param {object} request Request data.
 */
wpt.chromeDebugger.sendRequestDetails = function(request) {
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
  if (request['initiator'] !== undefined
      && request.initiator['type'] !== undefined) {
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
      eventData += 'timing.dnsStart=' + request.response.timing.dnsStart + '\n';
      eventData += 'timing.dnsEnd=' + request.response.timing.dnsEnd + '\n';
      eventData += 'timing.connectStart=' + request.response.timing.connectStart + '\n';
      eventData += 'timing.connectEnd=' + request.response.timing.connectEnd + '\n';
      eventData += 'timing.sslStart=' + request.response.timing.sslStart + '\n';
      eventData += 'timing.sslEnd=' + request.response.timing.sslEnd + '\n';
      eventData += 'timing.requestTime=' + request.response.timing.requestTime + '\n';
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
    if (request.response['headersText'] !== undefined)
      eventData += '[Response Headers]\n' + request.response.headersText + '\n';
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
  wpt.chromeDebugger.sendEvent('request_data', eventData);
}


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
}

})());  // namespace
