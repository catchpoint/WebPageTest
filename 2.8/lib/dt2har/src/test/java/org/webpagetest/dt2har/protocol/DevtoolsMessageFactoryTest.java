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

import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import org.json.simple.JSONObject;
import org.json.simple.JSONValue;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.JUnit4;

/**
 * Unit tests of DevtoolsMessageFactory. The tests verify that the factory can decode all recognized
 * Devtools messages and throws an exception on an unrecognized message.
 */
@RunWith(JUnit4.class)
public class DevtoolsMessageFactoryTest {

  /**
   * Tests the decoding of all recognized devtools messages and that a
   * {@code MalformedDevtoolsMessage} exception is thrown when an unrecognized message is
   * encountered.
   */
  @Test
  public void factoryDecodingOfMessages() throws Exception {
    DevtoolsMessageFactory factory = new DevtoolsMessageFactory();
    String error = "{\"reason\":\"Unsupported\"}";
    String jsonString = "{\"id\":1,\"error\":" + error + "}";
    JSONObject jsonObject = (JSONObject) JSONValue.parse(jsonString);
    assertTrue(factory.decodeDevtoolsJson(jsonObject) instanceof ErrorResponseMessage);

    jsonString =
      "{\"method\":\"Network.dataReceived\",\"params\":{\"timestamp\":1.328670832149145E9," +
      "\"requestId\":\"15832.2\",\"encodedDataLength\":424,\"dataLength\":97}}";
    jsonObject = (JSONObject) JSONValue.parse(jsonString);
    assertTrue(factory.decodeDevtoolsJson(jsonObject) instanceof NetworkDataReceivedMessage);

    jsonString = "{\"id\":5,\"result\":{\"body\":\"iVBErkJggg==\",\"base64Encoded\":true}}";
    jsonObject = (JSONObject) JSONValue.parse(jsonString);
    assertTrue(factory.decodeDevtoolsJson(jsonObject)
        instanceof NetworkGetResponseBodyResponseMessage);

    jsonString = "{\"method\":\"Network.loadingFailed\",\"params\":" +
        "{\"timestamp\":1.328670832132971E9,\"requestId\":\"15832.2\", " +
        "\"errorText\":\"Out of memory\",\"canceled\":false}}";
    jsonObject = (JSONObject) JSONValue.parse(jsonString);
    assertTrue(factory.decodeDevtoolsJson(jsonObject) instanceof NetworkLoadingFailedMessage);

    jsonString =
        "{\"method\":\"Network.loadingFinished\",\"params\":" +
        "{\"timestamp\":1.328670832132971E9,\"requestId\":\"15832.2\"}}";
    jsonObject = (JSONObject) JSONValue.parse(jsonString);
    assertTrue(factory.decodeDevtoolsJson(jsonObject) instanceof NetworkLoadingFinishedMessage);

    jsonString =
        "{\"method\":\"Network.requestServedFromCache\",\"params\":{\"requestId\":\"15832.2\"}}";
    jsonObject = (JSONObject) JSONValue.parse(jsonString);
    assertTrue(factory.decodeDevtoolsJson(jsonObject)
        instanceof NetworkRequestServedFromCacheMessage);

    jsonString = "{\"method\":\"Network.requestWillBeSent\",\"params\":" +
        "{\"timestamp\":1.328670831668585E9,\"frameId\":\"15832.2\",\"loaderId\":\"15832.1\"," +
        "\"initiator\":{\"type\":\"other\"},\"requestId\":\"15832.2\",\"request\":{}" +
        ",\"documentURL\":" + "\"http:\\/\\/www.foo.com\",\"stackTrace\":[]}}";
    jsonObject = (JSONObject) JSONValue.parse(jsonString);
    assertTrue(factory.decodeDevtoolsJson(jsonObject) instanceof NetworkRequestWillBeSentMessage);

    jsonString = "{\"method\":\"Network.responseReceived\",\"params\":{\"response\":{}" +
        ",\"timestamp\":1.328670832131262E9,\"requestId\":\"15832.2\",\"type\":\"Document\"}}";
    jsonObject = (JSONObject) JSONValue.parse(jsonString);
    assertTrue(factory.decodeDevtoolsJson(jsonObject) instanceof NetworkResponseReceivedMessage);

    jsonString =
        "{\"method\":\"Page.domContentEventFired\",\"params\":{\"timestamp\":1.328670832149877E9}}";
    jsonObject = (JSONObject) JSONValue.parse(jsonString);
    assertTrue(factory.decodeDevtoolsJson(jsonObject) instanceof PageDomContentEventFiredMessage);

    jsonString =
        "{\"method\":\"Page.loadEventFired\",\"params\":{\"timestamp\":1.328670832433752E9}}";
    jsonObject = (JSONObject) JSONValue.parse(jsonString);
    assertTrue(factory.decodeDevtoolsJson(jsonObject) instanceof PageLoadEventFiredMessage);

    jsonString =
        "{\"id\":8,\"result\":{\"result\":" + "[]" + "}}";
    jsonObject = (JSONObject) JSONValue.parse(jsonString);
    assertTrue(factory.decodeDevtoolsJson(jsonObject) instanceof RuntimeResponseMessage);

    jsonString = "{\"id\":1,\"result\":{\"result\":{\"a\":\"b\"}}}";
    jsonObject = (JSONObject) JSONValue.parse(jsonString);
    assertTrue(factory.decodeDevtoolsJson(jsonObject) instanceof RuntimeResponseMessage);

    jsonString = "{\"method\":\"Network.undefinedMessageType\",\"params\":" +
        "{\"timestamp\":1.328670832132971E9,\"requestId\":\"15832.2\"}}";
    jsonObject = (JSONObject) JSONValue.parse(jsonString);
    try {
      DevtoolsMessage message = factory.decodeDevtoolsJson(jsonObject);
      fail();
    } catch (MalformedDevtoolsMessageException expected) {
      // pass
    }
  }
}
