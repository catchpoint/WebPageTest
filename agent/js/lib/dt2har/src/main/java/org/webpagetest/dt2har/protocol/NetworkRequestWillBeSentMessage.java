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

/**
 * A Devtools message that indicates that a request will be sent.
 * <pre>
 * {
 *   "method": "Network.requestWillBeSent",
 *   "params": {
 *     "requestId": <RequestId>,
 *     "loaderId": <LoaderId>,
 *     "documentURL": <string>,
 *     "request": <Request>,
 *     "timestamp": <Timestamp>,
 *     "initiator": <Initiator>,
 *     "stackTrace": <Console.StackTrace>,
 *     "redirectResponse": <Response>
 *   }
 * }
 * </pre>
 *
 */
public class NetworkRequestWillBeSentMessage extends DevtoolsNetworkEventMessage {

  /** Loader identifier. */
  protected String loaderId;

  /** URL of the document this request is loaded for. */
  protected String documentUrl;

  /** Request data. */
  protected Request request;

  /** Request initiator. */
  protected JSONObject initiator;

  /** Optional JavaScript stack trace upon issuing this request. */
  protected JSONArray stackTrace;

  /** Optional redirect response data. */
  protected Response redirectResponse;

  /** Constructs a message indicating that a request will be sent. */
  NetworkRequestWillBeSentMessage(JSONObject json) {
    super(json);
    loaderId = (String) params.get("loaderId");
    documentUrl = (String) params.get("documentURL");
    request = new Request((JSONObject) params.get("request"));
    initiator = (JSONObject) params.get("initiator");
    if (params.containsKey("stackTrace")) {
      stackTrace = (JSONArray) params.get("stackTrace");
    }
    if (params.containsKey("redirectResponse")) {
      redirectResponse = new Response((JSONObject) params.get("redirectResponse"));
    }
  }

  /** Returns the loader identifier. */
  public String getLoaderId() {
    return loaderId;
  }

  /** Returns the document URL. */
  public String getDocumentUrl() {
    return documentUrl;
  }

  /** Returns an object representing a request. */
  public Request getRequest() {
    return request;
  }

  /** Returns the request initiator. */
  public JSONObject getInitiator() {
    return initiator;
  }

  /** Returns the optional stack trace, or null if one is not provided. */
  public JSONArray getStackTrace() {
    return stackTrace;
  }

  /** Returns the optional redirect response, or null if one is not provided. */
  public Response getRedirectResponse() {
    return redirectResponse;
  }
}
