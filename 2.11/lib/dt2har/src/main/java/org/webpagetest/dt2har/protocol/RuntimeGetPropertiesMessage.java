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

import javax.annotation.Nullable;

/**
 * A Devtools message requesting the properties of a given object, e.g., Navigation timings.
 * <pre>
 * {
 *   "id": <number>,
 *   "method": "Runtime.getProperties",
 *   "params": {
 *     "objectId": <RemoteObjectId>,
 *     "ownProperties": <boolean>
 *   }
 * }
 * </pre>
 */
public class RuntimeGetPropertiesMessage extends DevtoolsRequestMessage {

  /** Identifier of the object to return properties for. */
  protected String remoteObjectId;

  /**
   * If true, requests properties belonging only to the element itself, not to its prototype chain.
   */
  protected Boolean ownProperties;

  /**
   * Constructs a Devtools Remote Debugging Message to request the properties of a given object.
   * The object group of the result is inherited from the target object.
   *
   * @param id An identifier that must increase incrementally on each subsequent request. It is
   *        used to match a response to its associated request.
   * @param remoteObjectId Identifier of the object to return properties for.
   * @param ownProperties If true, requests properties belonging only to the element itself, not to
   *        its prototype chain.
   */
  @SuppressWarnings("unchecked")
  RuntimeGetPropertiesMessage(
      int id, String remoteObjectId, @Nullable Boolean ownProperties) {
    super(id, "Runtime.getProperties");
    JSONObject obj = new JSONObject();
    obj.put("objectId", remoteObjectId);
    if (ownProperties != null) {
      obj.put("ownProperties", ownProperties);
    }
    setParams(obj);
    this.remoteObjectId = remoteObjectId;
    this.ownProperties = ownProperties;
  }

  /** Returns the identifier of the object to return properties for. */
  protected String getRemoteObjectId() {
    return remoteObjectId;
  }

  /**
   * Returns true if the request is for properties belonging only to the element itself, not to
   * its prototype chain.
   */
  protected Boolean isOwnProperties() {
    return ownProperties;
  }
}
