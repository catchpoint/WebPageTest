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

import java.math.BigDecimal;

/**
 * A class representing resource timing information.
 */
public class ResourceTiming {

  /** Connected to the remote host. */
  protected final Long connectEnd;

  /** Started connecting to the remote host. */
  protected final Long connectStart;

  /** Finished DNS address resolve. */
  protected final Long dnsEnd;

  /** Started DNS address resolve. */
  protected final Long dnsStart;

  /** Finished resolving proxy. */
  protected final Long proxyEnd;

  /** Started resolving proxy. */
  protected final Long proxyStart;

  /** Finished receiving response headers. */
  protected final Long receiveHeadersEnd;

  /**
   * Timing's requestTime is a baseline in seconds, while the other numbers are ticks in
   * milliseconds relative to this requestTime.
   */
  protected final BigDecimal requestTime;

  /** Finished sending request. */
  protected final Long sendEnd;

  /** Started sending request. */
  protected final Long sendStart;

  /** Finished SSL handshake. */
  protected final Long sslEnd;

  /** Started SSL handshake. */
  protected final Long sslStart;

  /** The raw JSON message. */
  protected final JSONObject json;

  /** Constructs a ResourceTiming object. */
  public ResourceTiming(JSONObject timing) {
    connectEnd = (Long) timing.get("connectEnd");
    connectStart = (Long) timing.get("connectStart");
    dnsEnd = (Long) timing.get("dnsEnd");
    dnsStart = (Long) timing.get("dnsStart");
    proxyEnd = (Long) timing.get("proxyEnd");
    proxyStart = (Long) timing.get("proxyStart");
    receiveHeadersEnd = (Long) timing.get("receiveHeadersEnd");
    // Maintain requestTime as a BigDecimal to avoid floating point precision problems
    requestTime = new BigDecimal(timing.get("requestTime").toString());
    sendEnd = (Long) timing.get("sendEnd");
    sendStart = (Long) timing.get("sendStart");
    sslEnd = (Long) timing.get("sslEnd");
    sslStart = (Long) timing.get("sslStart");
    json = timing;
  }

  /** Returns the connect end time in milliseconds. */
  public Long getConnectEnd() {
    return connectEnd;
  }

  /** Returns the connect start time in milliseconds. */
  public Long getConnectStart() {
    return connectStart;
  }

  /** Returns the dns end time in milliseconds. */
  public Long getDnsEnd() {
    return dnsEnd;
  }

  /** Returns the dns start time in milliseconds. */
  public Long getDnsStart() {
    return dnsStart;
  }

  /** Returns the proxy end time in milliseconds. */
  public Long getProxyEnd() {
    return proxyEnd;
  }

  /** Returns the proxy start time in milliseconds. */
  public Long getProxyStart() {
    return proxyStart;
  }

  /** Returns the receive headers end time in milliseconds. */
  public Long getReceiveHeadersEnd() {
    return receiveHeadersEnd;
  }

  /** Returns the request time in seconds. */
  public BigDecimal getRequestTime() {
    return requestTime;
  }

  /** Returns the send end time in milliseconds. */
  public Long getSendEnd() {
    return sendEnd;
  }

  /** Returns the send start time in milliseconds. */
  public Long getSendStart() {
    return sendStart;
  }

  /** Returns the ssl end time in milliseconds. */
  public Long getSslEnd() {
    return sslEnd;
  }

  /** Returns the ssl start time in milliseconds. */
  public Long getSslStart() {
    return sslStart;
  }

  /** Returns the underlying json object representing this response. */
  public JSONObject getJson() {
    return json;
  }

  /** Two responses are considered equal if their JSON is the same. */
  @Override
  public boolean equals(Object obj){
    if (!(obj instanceof ResourceTiming)) {
      return false;
    }
    ResourceTiming resourceTiming = (ResourceTiming) obj;
    return this.getJson().equals(resourceTiming.getJson());
  }

  /** Returns the hash code value for the object. */
  @Override
  public int hashCode() {
    return json.toJSONString().hashCode();
  }
}
