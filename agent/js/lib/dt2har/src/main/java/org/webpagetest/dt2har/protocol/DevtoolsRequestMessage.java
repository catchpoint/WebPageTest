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
 * An object representing a Devtools request message. It is subclassed to represent specific
 * types of Devtools request messages.
 */
public abstract class DevtoolsRequestMessage extends DevtoolsMessage {

  /** An identifier for this request message. Used to pair responses to requests. */
  protected int id;

  /** The type of this message. */
  protected String method;

  /** A generic container for message parameters. */
  protected JSONObject params;

  /** Construct a request message. */
  public DevtoolsRequestMessage(int id, String method) {
    super();
    this.id = id;
    this.method = method;
  }

  /** Set additional parameter for this request */
  protected void setParams(JSONObject params) {
    this.params = params;
  }

  /** Returns the id of the request. */
  public int getId() {
    return id;
  }

  /** Returns the method of the request. */
  public String getMethod() {
    return method;
  }

  /** Constructs the JSON message to send. */
  @SuppressWarnings("unchecked")
  @Override
  public JSONObject getJson() {
    json.clear();
    json.put("id", id);
    json.put("method", method);
    if (params != null) {
      json.put("params", params);
    }
    return json;
  }
}
