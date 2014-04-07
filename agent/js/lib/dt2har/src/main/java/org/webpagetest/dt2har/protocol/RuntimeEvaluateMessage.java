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
 * A Devtools message requesting that an expression be evaluated, which is useful for injecting
 * javascript.
 * <pre>
 * {
 *   "id": <number>,
 *   "method": "Runtime.evaluate",
 *   "params": {
 *     "expression": <string>,
 *     "objectGroup": <string>,
 *     "returnByValue": <boolean>
 *   }
 * }
 * </pre>
 */
public class RuntimeEvaluateMessage extends DevtoolsRequestMessage {

  /** Expresion to evaluate. */
  protected String expression;

  /** Symbolic group name that can be used to release multiple objects. */
  protected String objectGroup;

  /** True if the result is expected to be a JSON object that should be sent by value. */
  protected Boolean returnByValue;

  /**
   * Constructs a Devtools Remote Debugging Message to request that an expression on a global
   * object be evaluated.
   *
   * @param id An identifier that must increase incrementally on each subsequent request. It is
   *        used to match a response to its associated request.
   * @param expression Expression to evaluate.
   * @param objectGroup An optional symbolic group name that can be used to release multiple
   *        objects.
   * @param returnByValue An optional indication of whether the result is expected to be a JSON
   *        object that should be sent by value.
   */
  @SuppressWarnings("unchecked")
  RuntimeEvaluateMessage(int id, String expression, @Nullable String objectGroup,
      @Nullable Boolean returnByValue) {
    super(id, "Runtime.evaluate");
    JSONObject obj = new JSONObject();
    obj.put("expression", expression);
    if (objectGroup != null && !objectGroup.equals("")) {
      obj.put("objectGroup", objectGroup);
    }
    if (returnByValue != null) {
      obj.put("returnByValue", returnByValue);
    }
    setParams(obj);
    this.expression = expression;
    this.objectGroup = objectGroup;
    this.returnByValue = returnByValue;
  }

  /** Returns the expresion to evaluate. */
  public String getExpression() {
    return expression;
  }

  /** Returns the symbolic group name that can be used to release multiple objects. */
  public String getObjectGroup() {
    return objectGroup;
  }

  /** Returns true if the result is expected to be a JSON object that should be sent by value. */
  public Boolean isReturnByValue() {
    return returnByValue;
  }
}
