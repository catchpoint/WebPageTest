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
 * A Devtools message indicating that the loading of a resource has failed.
 * <pre>
 * {
 *   "method": "Network.loadingFailed",
 *   "params": {
 *     "requestId": <RequestId>,
 *     "timestamp": <Timestamp>,
 *     "errorText": <string>,
 *     "canceled": <boolean>
 *   }
 * }
 * </pre>
 */
public class NetworkLoadingFailedMessage extends DevtoolsNetworkEventMessage {

  /** A user-friendly error message. */
  protected String errorText;

  /** True if loading was canceled. */
  protected Boolean canceled;

  /** Constructs a message indicating that the loading of a resource has failed. */
  NetworkLoadingFailedMessage(JSONObject json) {
    super(json);
    errorText = (String) params.get("errorText");
    if (params.containsKey("canceled")) {
      canceled = (Boolean) params.get("canceled");
    }
  }

  /** Returns the error text associated with this message. */
  public String getErrorText() {
    return errorText;
  }

  /** Returns true if loading of the associated resource was canceled. */
  public Boolean isCanceled() {
    return canceled;
  }
}
