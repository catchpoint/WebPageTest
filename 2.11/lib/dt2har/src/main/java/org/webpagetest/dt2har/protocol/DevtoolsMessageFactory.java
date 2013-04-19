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

package org.webpagetest.dt2har.protocol;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import javax.annotation.Nullable;

/**
 * A class that generates a specific Devtools message object that describes the JSON
 * message provided. Exactly one factory should be used per Devtools connection.
 */
public class DevtoolsMessageFactory {

  /** A counter used for the generation of unique and increasing identifiers for requests. */
  private int idCounter = 0;

  /**
   * Manufacture and return an identifier for a new Devtools request message. These IDs are used
   * to pair requests to responses.
   */
  private int getNextRequestId() {
    return ++idCounter;
  }

  /**
   * Constructs a message to request that the cache be cleared.
   */
  public NetworkClearBrowserCacheMessage encodeNetworkClearBrowserCacheMessage() {
    return new NetworkClearBrowserCacheMessage(getNextRequestId());
  }

  /**
   * Constructs a message to request that cookies be cleared.
   */
  public NetworkClearBrowserCookiesMessage encodeNetworkClearBrowserCookiesMessage() {
    return new NetworkClearBrowserCookiesMessage(getNextRequestId());
  }

  /**
   * Constructs a message to request network-related events.
   */
  public NetworkEnableMessage encodeNetworkEnableMessage() {
    return new NetworkEnableMessage(getNextRequestId());
  }

  /**
   * Constructs a message to get a resource response body.
   * @param requestId The requestId of the resource body being requested.
   */
  public NetworkGetResponseBodyMessage encodeNetworkGetResponseBodyMessage(String requestId) {
    return new NetworkGetResponseBodyMessage(getNextRequestId(), requestId);
  }

  /**
   * Constructs a Devtools Remote Debugging Message to request page-related events.
   */
  public PageEnableMessage encodePageEnableMessage() {
    return new PageEnableMessage(getNextRequestId());
  }

  /**
   * Constructs a Devtools Remote Debugging Message to request that a page be opened.
   * @param url The page to open.
   */
  public PageNavigateMessage encodePageNavigateMessage(String url) {
    return new PageNavigateMessage(getNextRequestId(), url);
  }

  /**
   * Constructs a Devtools Remote Debugging Message to request that a page be opened.
   * @param url The page to open.
   */
  public PageOpenMessage encodePageOpenMessage(String url) {
    return new PageOpenMessage(getNextRequestId(), url);
  }

  /**
   * Constructs a Devtools Remote Debugging Message to request that an expression on a global
   * object be evaluated.
   * @param expression Expression to evaluate.
   * @param objectGroup An optional symbolic group name that can be used to release multiple
   *        objects.
   * @param returnByValue An optional indication of whether the result is expected to be a JSON
   *        object that should be sent by value.
   */
  public RuntimeEvaluateMessage encodeRuntimeEvaluateMessage(
      String expression, @Nullable String objectGroup, @Nullable Boolean returnByValue) {
    return new RuntimeEvaluateMessage(getNextRequestId(), expression, objectGroup, returnByValue);
  }

  /**
   * Constructs a Devtools Remote Debugging Message to request the properties of a given object.
   * The object group of the result is inherited from the target object.
   *
   * @param remoteObjectId Identifier of the object to return properties for.
   * @param ownProperties If true, requests properties belonging only to the element itself, not to
   *        its prototype chain.
   */
  public RuntimeGetPropertiesMessage encodeRuntimeGetPropertiesMessage(
      String remoteObjectId, @Nullable Boolean ownProperties) {
    return new RuntimeGetPropertiesMessage(getNextRequestId(), remoteObjectId, ownProperties);
  }



  /**
   * Construct the appropriate Devtools message from a JSON message.
   * @throws MalformedDevtoolsMessageException Thrown when the JSON message does not match
   *         any known type of Devtools message.
   */
  public DevtoolsMessage decodeDevtoolsJson(JSONObject message)
      throws MalformedDevtoolsMessageException {
    if (message.containsKey("method") && message.containsKey("params")) {
      String method = (String) message.get("method");
      JSONObject params = (JSONObject) message.get("params");
      if (method.equals("Network.dataReceived")) {
        return new NetworkDataReceivedMessage(message);
      } else if (method.equals("Network.loadingFinished")) {
        return new NetworkLoadingFinishedMessage(message);
      } else if (method.equals("Network.loadingFailed")) {
        return new NetworkLoadingFailedMessage(message);
      } else if (method.equals("Network.requestServedFromCache")) {
        return new NetworkRequestServedFromCacheMessage(message);
      } else if (method.equals("Network.requestWillBeSent")) {
        return new NetworkRequestWillBeSentMessage(message);
      } else if (method.equals("Network.responseReceived")) {
        return new NetworkResponseReceivedMessage(message);
      } else if (method.equals("Page.domContentEventFired")) {
        return new PageDomContentEventFiredMessage(message);
      } else if (method.equals("Page.loadEventFired")) {
        return new PageLoadEventFiredMessage(message);
      } else if (method.equals("Page.frameNavigated")) {
        return new PageFrameNavigatedMessage(message);
      } else {
        throw new MalformedDevtoolsMessageException(message);
      }
    } else {
      // A response to a request. Unfortunately, there is nothing explicit in the JSON message
      // that names the type of response it is. (The Devtools protocol expects the client to
      // match the ID of the response to the ID of the request.) The factory uses the presence
      // of an ID field to distinguish response messages from event messages, which don't have
      // such an ID. It can further classify responses as containing resource content, the result
      // of a runtime request, or something else. In practice, this is a useful classification.
      if (message.containsKey("id")) {
        int id = ((Long) message.get("id")).intValue();
        if (message.containsKey("error")) {
          return new ErrorResponseMessage(message);
        } else if (message.containsKey("result")) {
          JSONObject result = (JSONObject) message.get("result");
          if (result.containsKey("body") && result.containsKey("base64Encoded")) {
            return new NetworkGetResponseBodyResponseMessage(message);
          } else if (result.containsKey("result")) {
            Object innerResult = result.get("result");
            // runtime responses' inner results are either JSONArrays or non-empty JSONObjects
            if (innerResult instanceof JSONArray) {
              return new RuntimeResponseMessage(message);
            } else if (innerResult instanceof JSONObject &&
                (!((JSONObject) innerResult).isEmpty())) {
              return new RuntimeResponseMessage(message);
            }
          }
        }
        return new DevtoolsResponseMessage(message);
      }
    }
    throw new MalformedDevtoolsMessageException(message);
  }
}
