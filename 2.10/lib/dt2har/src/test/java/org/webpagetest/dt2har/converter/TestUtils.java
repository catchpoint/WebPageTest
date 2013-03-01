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

package org.webpagetest.dt2har.converter;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.webpagetest.dt2har.protocol.DevtoolsMessage;
import org.webpagetest.dt2har.protocol.DevtoolsMessageFactory;
import org.webpagetest.dt2har.protocol.MalformedDevtoolsMessageException;

import org.json.simple.JSONArray;
import org.json.simple.JSONAware;
import org.json.simple.JSONObject;
import org.json.simple.JSONValue;

import java.io.IOException;

/**
 * Utilities class for ChromeBridge unit tests.
 */
public class TestUtils {

  /**
   * Loads a JSON text from a resource and returns the resulting JSONObject.
   *
   * @param jsonResourcePath The path to the resource file containing JSON message(s),
   * @throws IOException if loading the test data fails.
   */
  @SuppressWarnings("unchecked")
  public static<T extends JSONAware> T loadJsonFromResource(String jsonResourcePath)
      throws IOException {
    String jsonString = null;
    jsonString = Resources.toString(Resources.getResource(jsonResourcePath), Charsets.UTF_8);
    return (T) JSONValue.parse(jsonString);
  }

  /**
   * Populates the given {@code HarObject} with test data.
   * @param factory The factory that decodes Devtools json
   * @param har The object to populate.
   * @param devtoolsMessagesFile The path to a file containing a JSONArray of Devtools messages.
   * @throws MalformedDevtoolsMessageException If the test data contains corrupt messages.
   * @throws IOException If an error occurs when reading the test har file.
   */
  public static void populateTestHar(
      DevtoolsMessageFactory factory, HarObject har, String devtoolsMessagesFile)
          throws MalformedDevtoolsMessageException, IOException {
    int cnt = 0;
    JSONArray devtoolsTrace = loadJsonFromResource(devtoolsMessagesFile);
    for (Object o : devtoolsTrace) {
      ++cnt;
      String msg = JSONValue.toJSONString(o);
      JSONObject json = (JSONObject) JSONValue.parse(msg);
      DevtoolsMessage dm = factory.decodeDevtoolsJson(json);
      har.addDevtoolsLog(devtoolsTrace);
      har.addMessage(dm);
    }
  }
}
