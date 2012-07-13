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
 * An object representing all Devtools event messages. This class is subclassed to represent
 * specific event message types.
 */
public abstract class DevtoolsEventMessage extends DevtoolsMessage {

  /** Time since the epoch in seconds. */
  protected BigDecimal timestamp;

  /** The type of this message. */
  protected String method;

  /** A generic container for message parameters. */
  protected JSONObject params;

  /**
   * Construct an event message.
   *
   * @param message The JSON-encoded message
   */
  DevtoolsEventMessage(JSONObject message) {
    super(message);
    method = (String) message.get("method");
    params = (JSONObject) message.get("params");
    if (params.containsKey("timestamp")) {
      timestamp = new BigDecimal(params.get("timestamp").toString());
    }
  }

  /** Returns the timestamp indicating when the event occurred. */
  public BigDecimal getTimestamp() {
    return timestamp;
  }

  /** Returns the method of the event. */
  public String getMethod() {
    return method;
  }
}
