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

import org.json.simple.JSONObject;

/**
 * A Devtools message that is generated when an HTTP response is available.
 * <pre>
 * {
 *   "method": "Network.responseReceived",
 *   "params": {
 *     "requestId": <RequestId>,
 *     "loaderId": <LoaderId>, // Only in Version 1.0 (not in 0.1 or earlier)
 *     "timestamp": <Timestamp>,
 *     "type": <Page.ResourceType>,
 *     "response": <Response>
 *   }
 * }
 */
public class NetworkResponseReceivedMessage extends DevtoolsNetworkEventMessage {

  /** Supported resource types. */
  protected enum ResourceType {
    Document,
    Font,
    Image,
    Other,
    Script,
    Stylesheet,
    WebSocket,
    XHR
  }

  /** A loader identifier. */
  protected String loaderId;

  /** The resource type. */
  protected ResourceType type;

  /** The response data. */
  protected Response response;

  /** Constructs a message indicating that a resource response was received. */
  NetworkResponseReceivedMessage(JSONObject json) {
    super(json);
    if (params.containsKey("loaderId")) {
      loaderId = (String) params.get("loaderId");
    }
    type = ResourceType.valueOf((String) params.get("type"));
    response = new Response((JSONObject) params.get("response"));
  }

  /** Returns the loader identifier. */
  public String getLoaderId() {
    return loaderId;
  }

  /** Returns the resource type. */
  public String getType() {
    return type.toString();
  }

  /** Returns an object representing the response. */
  public Response getResponse() {
    return response;
  }
}
