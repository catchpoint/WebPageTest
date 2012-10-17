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
 * A class representing a Devtools response object.
 */
public class Response {

  /** Physical connection id that was actually used for this request. */
  protected final Long connectionId;

  /** Specifies whether physical connection was actually reused for this request. */
  protected final Boolean connectionReused;

  /** Optional. Specifies that the request was served from the disk cache.*/
  protected final Boolean fromDiskCache;

  /** HTTP response headers. */
  protected final JSONObject headers;

  /** Optional. HTTP response headers text. */
  protected final String headersText;

  /** Resource mimeType as determined by the browser. */
  protected final String mimeType;

  /** Optional. Refined HTTP request headers that were actually transmitted over the network. */
  protected final JSONObject requestHeaders;

  /** Optional. HTTP request headers text. */
  protected final String requestHeadersText;

  /** HTTP response status code. */
  protected final Long status;

  /** HTTP response status text. */
  protected final String statusText;

  /** Optional. Timing information for the given request. */
  protected final ResourceTiming timing;

  /** Response URL. */
  protected final String url;

  /** The raw JSON message. */
  protected final JSONObject json;

  /** Constructs a response object. */
  public Response(JSONObject response) {
    connectionId = (Long) response.get("connectionId");
    connectionReused = (Boolean) response.get("connectionReused");
    if (response.containsKey("fromDiskCache")) {
      fromDiskCache = (Boolean) response.get("fromDiskCache");
    } else {
      fromDiskCache = null;
    }
    headers = (JSONObject) response.get("headers");
    if (response.containsKey("headersText")) {
      headersText = (String) response.get("headersText");
    } else {
      headersText = null;
    }
    mimeType = (String) response.get("mimeType");
    if (response.containsKey("requestHeaders")) {
      requestHeaders = (JSONObject) response.get("requestHeaders");
    } else {
      requestHeaders = null;
    }
    if (response.containsKey("requestHeadersText")) {
      requestHeadersText = (String) response.get("requestHeadersText");
    } else {
      requestHeadersText = null;
    }
    status = (Long) response.get("status");
    statusText = (String) response.get("statusText");
    if (response.containsKey("timing")) {
      timing = new ResourceTiming((JSONObject) response.get("timing"));
    } else {
      timing = null;
    }
    url = (String) response.get("url");
    this.json = response;
  }

  /** Returns the physical connection id that was actually used for this request. */
  public Long getConnectionId() {
    return connectionId;
  }

  /** Returns whether the physical connection was actually reused for this request. */
  public Boolean isConnectionReused() {
    return connectionReused;
  }

  /** Returns true if the request was served from the disk cache.*/
  public Boolean isFromDiskCache() throws OptionalInformationUnavailableException {
    if (fromDiskCache == null) {
      throw new OptionalInformationUnavailableException("fromDiskCache", json);
    }
    return fromDiskCache;
  }

  /** Returns the HTTP response headers. */
  public JSONObject getHeaders() {
    return headers;
  }

  /** Returns the HTTP response headers text, or null if not present. */
  public String getHeadersText() throws OptionalInformationUnavailableException {
    if (headersText == null) {
      throw new OptionalInformationUnavailableException("headersText", json);
    }
    return headersText;
  }

  /** Returns the resource mimeType as determined by the browser. */
  public String getMimeType() {
    return mimeType;
  }

  /** Returns the refined HTTP request headers that were actually transmitted over the network. */
  public JSONObject getRequestHeaders() throws OptionalInformationUnavailableException {
    if (requestHeaders == null) {
      throw new OptionalInformationUnavailableException("requestHeaders", json);
    }
    return requestHeaders;
  }

  /** Returns the HTTP request headers text, or null if not present. */
  public String getRequestHeadersText() throws OptionalInformationUnavailableException {
    if (requestHeadersText == null) {
      throw new OptionalInformationUnavailableException("requestHeadersText", json);
    }
    return requestHeadersText;
  }

  /** Returns the HTTP response status code. */
  public Long getStatus() {
    return status;
  }

  /** Returns the HTTP response status text. */
  public String getStatusText() {
    return statusText;
  }

  /** Returns the timing information for the given request. */
  public ResourceTiming getTiming() throws OptionalInformationUnavailableException {
    if (timing == null) {
      throw new OptionalInformationUnavailableException("timing", json);
    }
    return timing;
  }

  /** Returns the response URL. */
  public String getUrl() {
    return url;
  }

  /** Returns the underlying json object representing this response. */
  public JSONObject getJson() {
    return json;
  }

  /** Two responses are considered equal if their JSON is the same. */
  @Override
  public boolean equals(Object obj){
    if (!(obj instanceof Response)) {
      return false;
    }
    Response response = (Response) obj;
    return this.getJson().equals(response.getJson());
  }

  /** Returns the hash code value for the object. */
  @Override
  public int hashCode() {
    return json.toJSONString().hashCode();
  }
}

