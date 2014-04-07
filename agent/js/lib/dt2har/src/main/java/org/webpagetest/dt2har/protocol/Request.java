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
 * A class representing a Devtools request object.
 */
public class Request {

  /** HTTP request headers. */
  protected final JSONObject headers;

  /** HTTP request method. */
  protected final String method;

  /** Optional. HTTP POST request data. */
  protected final String postData;

  /** Request URL. */
  protected final String url;

  /** The raw JSON message. */
  protected final JSONObject json;

  public Request(JSONObject request) {
    headers = (JSONObject) request.get("headers");
    method = (String) request.get("method");
    if (request.containsKey("postData")) {
      postData = (String) request.get("postData");
    } else {
      postData = null;
    }
    url = (String) request.get("url");
    json = request;
  }

  /** Returns the HTTP request headers. */
  public JSONObject getHeaders() {
    return headers;
  }

  /** Returns the HTTP request method. */
  public String getMethod() {
    return method;
  }

  /** Returns the HTTP POST request data. */
  public String getPostData() throws OptionalInformationUnavailableException {
    if (postData == null) {
      throw new OptionalInformationUnavailableException("postData", json);
    }
    return postData;
  }

  /** Returns the request URL. */
  public String getUrl() {
    return url;
  }

  /** Returns the underlying JSON object representing this request. */
  public JSONObject getJson() {
    return json;
  }
}
