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

import com.google.common.annotations.VisibleForTesting;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

/**
 * A Devtools message representing responses from the "Runtime" category of requests.
 * <pre>
 * {
 *   "id": <number>,
 *   "error": <object>,
 *   "result": {
 *     "result": <RemoteObject>,
 *     "wasThrown": <boolean> // optional
 *   }
 * }
 * </pre>
 */
public class RuntimeResponseMessage extends DevtoolsResponseMessage {

  /** The nested result object in the JSON message. */
  protected Object resultWithinResult;

  /** True if the result was thrown during the evaluation. */
  protected Boolean wasThrown;

  /** Constructs a response message for runtime requests. */
  RuntimeResponseMessage(JSONObject message) {
    super(message);
    JSONObject result = (JSONObject) message.get("result");
    resultWithinResult = result.get("result");
    wasThrown = (Boolean) result.get("wasThrown");
  }

  /**
   * Get the result of a request as a JSONObject. Valid for {@code Runtime.evaluate} and
   * {@code Runtime.getProperties}
   */
  public JSONObject getResultAsJsonObject() {
    return (JSONObject) resultWithinResult;
  }

  /**
   * Get the result of a request as a JSONArray. Valid for {@code Runtime.getProperties} when
   * getting timing information.
   */
  public JSONArray getResultAsJsonArray() {
    return (JSONArray) resultWithinResult;
  }

  /** Returns the result of a request. */
  @VisibleForTesting
  public Object getResult() {
    return resultWithinResult;
  }

  /** Indicate whether the result of {@code Runtime.evaluate} was thrown. */
  public Boolean getWasThrown() {
    return wasThrown;
  }

  /**
   * Returns the object ID if one exists or null otherwise. The object ID should exists for a
   * {@code Runtime.evaluate} message.
   */
  public String getObjectId() {
    JSONObject resultObject = (JSONObject) resultWithinResult;
    if (resultObject.containsKey("objectId")) {
      return (String) resultObject.get("objectId");
    }
    return null;
  }
}
