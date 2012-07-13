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

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import org.json.simple.JSONObject;
import org.json.simple.JSONValue;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.JUnit4;

import java.math.BigDecimal;

/**
 * Unit tests of methods of the DevtoolsMessage class and derived classes. All outgoing messages
 * are tested to confirm that their constructors assembled the message JSON appropriately. All
 * incoming messages are tested that they are parsed correctly.
 */
@RunWith(JUnit4.class)
public class DevtoolsMessageTest {

  protected ResourceTiming synthesizeResourceTimingObject() {
    String jsonString = "{\"sslEnd\":-1,\"connectEnd\":366," +
        "\"requestTime\":1.328670831678717E9,\"connectStart\":277,\"proxyStart\":-1," +
        "\"receiveHeadersEnd\":446,\"sendStart\":367,\"sendEnd\":368,\"proxyEnd\":-1," +
        "\"dnsEnd\":277,\"sslStart\":-1,\"dnsStart\":276}";
    JSONObject jsonObject = (JSONObject) JSONValue.parse(jsonString);
    return new ResourceTiming(jsonObject);
  }

  /** Returns the headers portion of a Network.responseReceived JSON string. */
  protected String synthesizeHeadersString() {
    String headers = "{\"ETag\":\"\\\"2008a-61-4b850130e5ea3\\\"\",\"Date\":" +
        "\"Wed, 08 Feb 2012 03:13:53 GMT\",\"X-Associated-Content\":" +
        "\"http:\\/\\/www.foo.com\\/foo2.png\",\"Content-Length\":\"97\"," +
        "\"Last-Modified\":\"Mon, 06 Feb 2012 18:46:03 GMT\",\"Accept-Ranges\":\"bytes\"," +
        "\"Content-Type\":\"text\\/html; charset=UTF-8\",\"Connection\":\"close\"," +
        "\"Server\":\"Apache\\/2.2.21 (Amazon)\"}";
    return headers;
  }

  /** Returns the headers text portion of a Network.responseReceived JSON string. */
  protected String synthesizeHeadersText() {
    String headersText =
        "\"HTTP\\/1.1 200 OK\r\nDate: Wed, 08 Feb 2012 03:13:53 " +
        "GMT\r\nServer: Apache\\/2.2.21 (Amazon)\r\nLast-Modified: Mon, 06 Feb 2012 " +
        "18:46:03 GMT\r\nETag: \\\"2008a-61-4b850130e5ea3\\\"\r\nAccept-Ranges: " +
        "bytes\r\nContent-Length: 97\r\nX-Associated-Content: " +
        "http:\\/\\/www.foo.com\\/foo2.png\r\nConnection:" +
        " close\r\nContent-Type: text\\/html; charset=UTF-8\r\n\r\n\"";
    return headersText;
  }

  /** Returns the request headers text portion of a Network.responseReceived JSON string. */
  protected String synthesizeRequestHeadersText() {
    String requestHeadersText =
        "\"GET \\/simple.html " +
        "HTTP\\/1.1\r\nHost: 184.73.115.184\r\nConnection: keep-alive\r\nUser-Agent: " +
        "Mozilla\\/5.0 (Linux; U; Android 3.1; en-us; Build\\/IRM19) " +
        "AppleWebKit\\/535.7 (KHTML, like Gecko) CrMo\\/16.0.912.75 Mobile " +
        "Safari\\/535.7\r\nAccept: text\\/html,application\\/xhtml+xml," +
        "application\\/xml;q=0.9,*\\/*;q=0.8\r\nAccept-Encoding: gzip,deflate," +
        "sdch\r\nAccept-Language: en-US,en;q=0.8\r\nAccept-Charset: ISO-8859-1," +
        "utf-8;q=0.7,*;q=0.3\r\n\r\n\"";
    return requestHeadersText;
  }

  /** Returns the request headers portion of a Network.responseReceived JSON string. */
  protected String synthesizeRequestHeaders() {
    String requestHeaders =
        "{\"Accept-Language\":\"en-US,en;q=0.8\",\"Host\":" +
        "\"www.foo.com\",\"Accept-Charset\":\"ISO-8859-1,utf-8;q=0.7,*;q=0.3\"," +
        "\"Accept-Encoding\":\"gzip,deflate,sdch\",\"User-Agent\":\"Mozilla\\/5.0 " +
        "(Linux; U; Android 3.1; en-us; Build\\/IRM19) AppleWebKit\\/535.7 (KHTML, " +
        "like Gecko) CrMo\\/16.0.912.75 Mobile Safari\\/535.7\",\"Accept\":" +
        "\"text\\/html,application\\/xhtml+xml,application\\/xml;q=0.9,*\\/*;q=0.8\"," +
        "\"Connection\":\"keep-alive\"}";
    return requestHeaders;
  }

  /** Returns the response portion of a Network.responseReceived JSON string. */
  protected String synthesizeNetworkResponseReceived() {
    String networkResponseReceived =
        "{\"headersText\":" + synthesizeHeadersText() + "," +
        "\"headers\":" + synthesizeHeadersString() + ",\"connectionReused\":false," +
        "\"requestHeaders\":" + synthesizeRequestHeaders() +
        ",\"status\":200,\"connectionId\":17," +
        "\"statusText\":\"OK\",\"requestHeadersText\":" + synthesizeRequestHeadersText() +
        ",\"timing\":{\"sslEnd\":-1,\"connectEnd\":366," +
        "\"requestTime\":1.328670831678717E9,\"connectStart\":277,\"proxyStart\":-1," +
        "\"receiveHeadersEnd\":446,\"sendStart\":367,\"sendEnd\":368,\"proxyEnd\":-1," +
        "\"dnsEnd\":277,\"sslStart\":-1,\"dnsStart\":276},\"mimeType\":\"text\\/html\"," +
        "\"url\":\"http:\\/\\/www.foo.com\\/simple.html\",\"fromDiskCache\":false}";
    return networkResponseReceived;
  }

  /** Tests parsing of {@code ErrorResponseMessage}. */
  @Test
  public void errorResponseMessage() throws Exception {
    String error = "{\"reason\":\"Unsupported\"}";
    String jsonString = "{\"id\":1,\"error\":" + error + "}";
    JSONObject jsonObject = (JSONObject) JSONValue.parse(jsonString);
    JSONObject errorJson = (JSONObject) JSONValue.parse(error);
    ErrorResponseMessage message = new ErrorResponseMessage(jsonObject);
    assertEquals(1, message.getId());
    assertTrue(message.getError().equals(errorJson));
  }

  /** Tests construction of {@code NetworkClearBrowserCacheMessage} JSON. */
  @Test
  public void networkClearBrowserCacheMessage() {
    String expected = "{\"id\":1,\"method\":\"Network.clearBrowserCache\"}";
    DevtoolsRequestMessage message = new NetworkClearBrowserCacheMessage(1);
    assertEquals(expected, message.getJson().toJSONString());
    assertTrue(message.getMethod().equals("Network.clearBrowserCache"));
    assertEquals(1, message.getId());
  }

  /** Tests construction of {@code NetworkClearBrowserCookiesMessage} JSON. */
  @Test
  public void networkClearBrowserCookiesMessage() {
    String expected = "{\"id\":1,\"method\":\"Network.clearBrowserCookies\"}";
    DevtoolsRequestMessage message = new NetworkClearBrowserCookiesMessage(1);
    assertEquals(expected, message.getJson().toJSONString());
    assertTrue(message.getMethod().equals("Network.clearBrowserCookies"));
    assertEquals(1, message.getId());
  }

  /** Tests parsing of {@code NetworkDataReceivedMessage}. */
  @Test
  public void networkDataReceivedMessage() throws Exception {
    String jsonString =
      "{\"method\":\"Network.dataReceived\",\"params\":{\"timestamp\":1.328670832149145E9," +
      "\"requestId\":\"15832.2\",\"encodedDataLength\":424,\"dataLength\":97}}";
    JSONObject jsonObject = (JSONObject) JSONValue.parse(jsonString);
    NetworkDataReceivedMessage message = new NetworkDataReceivedMessage(jsonObject);
    assertEquals(97, message.dataLength);
    assertEquals(424, message.encodedDataLength);
    assertTrue(message.method.equals("Network.dataReceived"));
    assertTrue(message.requestId.equals("15832.2"));
    assertEquals(new BigDecimal("1.328670832149145E9"), message.getTimestamp());
  }

  /** Tests construction of {@code NetworkEnableMessage} JSON. */
  @Test
  public void networkEnableMessage() {
    String expected = "{\"id\":1,\"method\":\"Network.enable\"}";
    DevtoolsRequestMessage message = new NetworkEnableMessage(1);
    assertEquals(expected, message.getJson().toJSONString());
    assertTrue(message.getMethod().equals("Network.enable"));
    assertEquals(1, message.getId());
  }

  /** Tests construction of {@code NetworkGetResponseBodyMessage} JSON. */
  @Test
  public void networkGetResponseBodyMessage() {
    String expected =
        "{\"id\":1,\"method\":\"Network.getResponseBody\",\"params\":{\"requestId\":\"15832.2\"}}";
    DevtoolsRequestMessage message =
        new NetworkGetResponseBodyMessage(1, "15832.2");
    assertEquals(expected, message.getJson().toJSONString());
    assertTrue(message.getMethod().equals("Network.getResponseBody"));
    assertEquals(1, message.getId());
    assertTrue(((NetworkGetResponseBodyMessage) message).getRequestId().equals("15832.2"));
  }

  /** Tests parsing of {@code NetworkGetResponseBodyResponseMessage}. */
  @Test
  public void networkGetResponseBodyResponseMessage() throws Exception {
    String jsonString = "{\"id\":5,\"result\":{\"body\":\"iVBErkJggg==\",\"base64Encoded\":true}}";
    JSONObject jsonObject = (JSONObject) JSONValue.parse(jsonString);
    NetworkGetResponseBodyResponseMessage message =
        new NetworkGetResponseBodyResponseMessage(jsonObject);
    assertTrue(message.getBody().equals("iVBErkJggg=="));
    assertEquals(5, message.getId());
    assertTrue(message.isBase64Encoded());
  }

  /** Tests parsing of {@code NetworkLoadingFailedMessage}. */
  @Test
  public void networkLoadingFailedMessage() throws Exception {
    String jsonString = "{\"method\":\"Network.loadingFailed\",\"params\":" +
        "{\"timestamp\":1.328670832132971E9,\"requestId\":\"15832.2\", " +
        "\"errorText\":\"Out of memory\",\"canceled\":false}}";
    JSONObject jsonObject = (JSONObject) JSONValue.parse(jsonString);
    NetworkLoadingFailedMessage message = new NetworkLoadingFailedMessage(jsonObject);
    assertTrue(message.getMethod().equals("Network.loadingFailed"));
    assertTrue(message.getRequestId().equals("15832.2"));
    assertEquals(new BigDecimal("1.328670832132971E9"), message.getTimestamp());
    assertTrue(message.getErrorText().equals("Out of memory"));
    assertFalse(message.isCanceled());
  }

  /** Tests parsing of {@code NetworkLoadingFinishedMessage}. */
  @Test
  public void networkLoadingFinishedMessage() throws Exception {
    String jsonString =
        "{\"method\":\"Network.loadingFinished\",\"params\":" +
        "{\"timestamp\":1.328670832132971E9,\"requestId\":\"15832.2\"}}";
    JSONObject jsonObject = (JSONObject) JSONValue.parse(jsonString);
    NetworkLoadingFinishedMessage message = new NetworkLoadingFinishedMessage(jsonObject);
    assertTrue(message.getMethod().equals("Network.loadingFinished"));
    assertTrue(message.getRequestId().equals("15832.2"));
    assertEquals(new BigDecimal("1.328670832132971E9"), message.getTimestamp());
  }

  /** Tests parsing of {@code NetworkRequestServedFromCacheMessage}. */
  @Test
  public void networkRequestServedFromCacheMessage() throws Exception {
    String jsonString =
        "{\"method\":\"Network.requestServedFromCache\",\"params\":{\"requestId\":\"15832.2\"}}";
    JSONObject jsonObject = (JSONObject) JSONValue.parse(jsonString);
    DevtoolsMessageFactory factory = new DevtoolsMessageFactory();
    NetworkRequestServedFromCacheMessage message =
        (NetworkRequestServedFromCacheMessage) factory.decodeDevtoolsJson(jsonObject);
    assertTrue(message.getMethod().equals("Network.requestServedFromCache"));
    assertTrue(message.getRequestId().equals("15832.2"));
  }

  /** Tests parsing of {@code NetworkRequestWillBeSentMessage}. */
  @Test
  public void networkRequestWillBeSentMessage() throws Exception {
    String request =
        "{\"headers\":{\"User-Agent\":\"Mozilla\\/5.0 (Linux; U; Android 3.1; en-us; " +
        "Build\\/IRM19) AppleWebKit\\/535.7 (KHTML, like Gecko) CrMo\\/16.0.912.75 " +
        "Mobile Safari\\/535.7\",\"Accept\":\"text\\/html,application\\/xhtml+xml," +
        "application\\/xml;q=0.9,*\\/*;q=0.8\"},\"method\":\"GET\"," +
        "\"url\":\"http:\\/\\/www.foo.com\\/foo.png\"}";
    String jsonString = "{\"method\":\"Network.requestWillBeSent\",\"params\":" +
        "{\"timestamp\":1.328670831668585E9,\"frameId\":\"15832.2\",\"loaderId\":\"15832.1\"," +
        "\"initiator\":{\"type\":\"other\"},\"requestId\":\"15832.2\",\"request\":" + request +
        ",\"documentURL\":" + "\"http:\\/\\/www.foo.com\",\"stackTrace\":[]}}";
    JSONObject jsonObject = (JSONObject) JSONValue.parse(jsonString);
    NetworkRequestWillBeSentMessage message = new NetworkRequestWillBeSentMessage(jsonObject);
    assertTrue(message.getDocumentUrl().equals("http://www.foo.com"));
    assertTrue(message.getRequest().getUrl().equals("http://www.foo.com/foo.png"));
    assertEquals(JSONValue.parse("{\"type\":\"other\"}"), message.getInitiator());
    assertTrue(message.getLoaderId().equals("15832.1"));
    assertTrue(message.getMethod().equals("Network.requestWillBeSent"));
    assertNull(message.getRedirectResponse());
    assertTrue(message.getRequest().getJson().equals(JSONValue.parse(request)));
    assertTrue(message.getRequestId().equals("15832.2"));
    assertEquals(new BigDecimal("1.328670831668585E9"), message.getTimestamp());
  }

  /** Tests parsing of {@code NetworkResponseReceivedMessage}. */
  @Test
  public void networkResponseReceivedMessage() throws Exception {
    String response = synthesizeNetworkResponseReceived();
    String jsonString = "{\"method\":\"Network.responseReceived\",\"params\":{\"response\":" +
        response +
        ",\"timestamp\":1.328670832131262E9,\"requestId\":\"15832.2\",\"type\":\"Document\"}}";
    JSONObject jsonObject = (JSONObject) JSONValue.parse(jsonString);
    NetworkResponseReceivedMessage message = new NetworkResponseReceivedMessage(jsonObject);
    assertTrue(message.getMethod().equals("Network.responseReceived"));
    assertTrue(message.getRequestId().equals("15832.2"));
    assertTrue(message.getType().equals("Document"));
    assertTrue(message.getResponse().equals(new Response((JSONObject) JSONValue.parse(response))));
    assertEquals(new BigDecimal("1.328670832131262E9"), message.getTimestamp());
  }

  /** Tests parsing of {@code PageDomContentEventFiredMessage}. */
  @Test
  public void pageDomContentEventFiredMessage() throws Exception {
    String jsonString =
        "{\"method\":\"Page.domContentEventFired\",\"params\":{\"timestamp\":1.328670832149877E9}}";
    JSONObject jsonObject = (JSONObject) JSONValue.parse(jsonString);
    PageDomContentEventFiredMessage message = new PageDomContentEventFiredMessage(jsonObject);
    assertTrue(message.getMethod().equals("Page.domContentEventFired"));
    assertEquals(new BigDecimal("1.328670832149877E9"), message.getTimestamp());
  }

  /** Tests construction of {@code PageEnableMessage} JSON. */
  @Test
  public void pageEnableMessage() {
    String expected = "{\"id\":1,\"method\":\"Page.enable\"}";
    DevtoolsRequestMessage message = new PageEnableMessage(1);
    assertEquals(expected, message.getJson().toJSONString());
    assertTrue(message.getMethod().equals("Page.enable"));
    assertEquals(1, message.getId());
  }

  /** Tests parsing of {@code PageLoadEventFiredMessage}. */
  @Test
  public void pageLoadEventFiredMessage() throws Exception {
    String jsonString =
        "{\"method\":\"Page.loadEventFired\",\"params\":{\"timestamp\":1.328670832433752E9}}";
    JSONObject jsonObject = (JSONObject) JSONValue.parse(jsonString);
    PageLoadEventFiredMessage message = new PageLoadEventFiredMessage(jsonObject);
    assertTrue(message.getMethod().equals("Page.loadEventFired"));
    assertEquals(new BigDecimal("1.328670832433752E9"), message.getTimestamp());
  }

  /** Tests construction of {@code PageNavigateMessage} JSON. */
  @Test
  public void pageNavigateMessage() {
    String expected =
        "{\"id\":1,\"method\":\"Page.navigate\"," +
        "\"params\":{\"url\":\"http:\\/\\/www.google.com\"}}";
    DevtoolsRequestMessage message = new PageNavigateMessage(1, "http://www.google.com");
    assertEquals(expected, message.getJson().toJSONString());
  }

  /** Tests construction of {@code PageOpenMessage} JSON. */
  @Test
  public void pageOpenMessage() {
    String expected =
        "{\"id\":1,\"method\":\"Page.open\",\"params\":{\"newWindow\":false," +
        "\"url\":\"http:\\/\\/www.google.com\"}}";
    DevtoolsRequestMessage message = new PageOpenMessage(1, "http://www.google.com");
    assertEquals(expected, message.getJson().toJSONString());
    assertTrue(message.getMethod().equals("Page.open"));
    assertEquals(1, message.getId());
    assertTrue(((PageOpenMessage) message).getUrl().equals("http://www.google.com"));
  }

  /** Tests construction of {@code RuntimeEvaluateMessage} JSON. */
  @Test
  public void runtimeEvaluateMessage() {
    String expected = "{\"id\":1,\"method\":\"Runtime.evaluate\",\"params\":{\"expression\":" +
        "\"window.performance.timing\"}}";
    DevtoolsRequestMessage message = new RuntimeEvaluateMessage(
        1, "window.performance.timing", null, null);
    assertEquals(expected, message.getJson().toJSONString());
    assertTrue(message.getMethod().equals("Runtime.evaluate"));
    assertEquals(1, message.getId());
    assertTrue(
        ((RuntimeEvaluateMessage) message).getExpression().equals("window.performance.timing"));
    assertNull(((RuntimeEvaluateMessage) message).getObjectGroup());
    assertNull(((RuntimeEvaluateMessage) message).isReturnByValue());
  }

  /** Tests construction of {@code RuntimeGetPropertiesMessage} JSON. */
  @Test
  public void runtimeGetPropertiesMessage() {
    String expected = "{\"id\":1,\"method\":\"Runtime.getProperties\",\"params\":" +
        "{\"objectId\":\"{\\\"injectedScriptId\\\":1,\\\"id\\\":1}\"}}";
    DevtoolsRequestMessage message = new RuntimeGetPropertiesMessage(
        1, "{\"injectedScriptId\":1,\"id\":1}", null);
    assertEquals(expected, message.getJson().toJSONString());
    assertTrue(message.getMethod().equals("Runtime.getProperties"));
    assertEquals(1, message.getId());
    assertTrue(((RuntimeGetPropertiesMessage) message)
        .getRemoteObjectId().equals("{\"injectedScriptId\":1,\"id\":1}"));
    assertNull(((RuntimeGetPropertiesMessage) message).isOwnProperties());
  }

  /**
   * Tests parsing of {@code RuntimeResponseMessage} in response to {@code RuntimeEvaluateMessage}.
   */
  @Test
  public void runtimeEvaluateResponseMessage() throws Exception {
    String result = "[{\"configurable\":true,\"name\":\"redirectEnd\"," +
        "\"enumerable\":true,\"writable\":true,\"value\":{\"description\":\"0\"," +
        "\"value\":0,\"type\":\"number\"}},{\"configurable\":true,\"name\":\"responseStart\"," +
        "\"enumerable\":true,\"writable\":true,\"value\":{\"description\":\"1326131479648\"," +
        "\"value\":1326131479648,\"type\":\"number\"}},{\"configurable\":true," +
        "\"name\":\"loadEventStart\",\"enumerable\":true,\"writable\":true," +
        "\"value\":{\"description\":\"1326131480145\",\"value\":1326131480145," +
        "\"type\":\"number\"}}]";
    String jsonString =
        "{\"id\":8,\"result\":{\"result\":" + result + "}}";
    JSONObject jsonObject = (JSONObject) JSONValue.parse(jsonString);
    RuntimeResponseMessage message = new RuntimeResponseMessage(jsonObject);
    assertEquals(8, message.getId());
    assertTrue(message.getResultAsJsonArray().equals(JSONValue.parse(result)));
  }

  /**
   * Tests parsing of {@code RuntimeResponseMessage} in response to
   * {@code RuntimeGetPropertiesMessage}.
   */
  @Test
  public void runtimeGetPropertiesResponseMessage() throws Exception {
    String result = "{\"description\":\"PerformanceTiming\",\"objectId\":" +
        "\"{\\\"injectedScriptId\\\":1,\\\"id\\\":1}\",\"className\":" +
        "\"PerformanceTiming\",\"type\":\"object\"}";
    String jsonString = "{\"id\":1,\"result\":{\"result\":" + result + "}}";
    JSONObject jsonObject = (JSONObject) JSONValue.parse(jsonString);
    RuntimeResponseMessage message = new RuntimeResponseMessage(jsonObject);
    assertEquals(1, message.getId());
    assertTrue(message.getObjectId().equals("{\"injectedScriptId\":1,\"id\":1}"));
    assertTrue(message.getResultAsJsonObject().equals(JSONValue.parse(result)));
  }

  /**
   * Tests the constructor and get methods of the Resource class. Confirms that attempts to
   * retrieve missing optional fields results in an exception being thrown.
   */
  @Test
  public void response() throws Exception {
    String headersTextComparison =
        "HTTP/1.1 200 OK\r\nDate: Wed, 08 Feb 2012 03:13:53 " +
        "GMT\r\nServer: Apache/2.2.21 (Amazon)\r\nLast-Modified: Mon, 06 Feb 2012 " +
        "18:46:03 GMT\r\nETag: \"2008a-61-4b850130e5ea3\"\r\nAccept-Ranges: " +
        "bytes\r\nContent-Length: 97\r\nX-Associated-Content: " +
        "http://www.foo.com/foo2.png\r\nConnection:" +
        " close\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n";

    String requestHeadersTextComparison =
        "GET /simple.html " +
        "HTTP/1.1\r\nHost: 184.73.115.184\r\nConnection: keep-alive\r\nUser-Agent: " +
        "Mozilla/5.0 (Linux; U; Android 3.1; en-us; Build/IRM19) " +
        "AppleWebKit/535.7 (KHTML, like Gecko) CrMo/16.0.912.75 Mobile " +
        "Safari/535.7\r\nAccept: text/html,application/xhtml+xml," +
        "application/xml;q=0.9,*/*;q=0.8\r\nAccept-Encoding: gzip,deflate," +
        "sdch\r\nAccept-Language: en-US,en;q=0.8\r\nAccept-Charset: ISO-8859-1," +
        "utf-8;q=0.7,*;q=0.3\r\n\r\n";

    // Test that a fully populated response is constructed and accessed correctly.
    JSONObject jsonObject = (JSONObject) JSONValue.parse(synthesizeNetworkResponseReceived());
    Response response = new Response(jsonObject);
    assertEquals(17, response.getConnectionId().intValue());
    assertFalse(response.isConnectionReused());
    assertFalse(response.isFromDiskCache());
    assertTrue(response.getHeaders().equals(JSONValue.parse(synthesizeHeadersString())));
    assertTrue(response.getHeadersText().equals(headersTextComparison));
    assertTrue(response.getMimeType().equals("text/html"));
    assertTrue(response.getRequestHeaders().equals(JSONValue.parse(synthesizeRequestHeaders())));
    assertTrue(response.getRequestHeadersText().equals(requestHeadersTextComparison));
    assertEquals(200, response.getStatus().intValue());
    assertTrue(response.getStatusText().equals("OK"));
    assertTrue(response.getTiming().equals(synthesizeResourceTimingObject()));
    assertTrue(response.getUrl().equals("http://www.foo.com/simple.html"));
  }

  @Test
  public void responseWithoutOptionalInformation() throws Exception {
    String jsonStringNoOptionalInformation =
        "{\"headers\":" + synthesizeHeadersString() + ",\"connectionReused\":false," +
        "\"status\":200,\"connectionId\":17," +
        "\"statusText\":\"OK\",\"mimeType\":\"text\\/html\"," +
        "\"url\":\"http:\\/\\/www.foo.com\\/simple.html\"}";

    // Test that optional fields throw an exception if accessed when not populated.
    JSONObject jsonObjectNoOptional = (JSONObject) JSONValue.parse(jsonStringNoOptionalInformation);
    Response responseNoOptional = new Response(jsonObjectNoOptional);
    assertEquals(17, responseNoOptional.getConnectionId().intValue());
    assertFalse(responseNoOptional.isConnectionReused());
    try {
      Boolean b = responseNoOptional.isFromDiskCache();
      fail();
    } catch (OptionalInformationUnavailableException expected) {
      assertTrue(expected.getKey().equals("fromDiskCache"));
      // pass
    }
    assertTrue(responseNoOptional.getHeaders().equals(JSONValue.parse(synthesizeHeadersString())));
    try {
      String s = responseNoOptional.getHeadersText();
      fail();
    } catch (OptionalInformationUnavailableException expected) {
      assertTrue(expected.getKey().equals("headersText"));
      // pass
    }
    assertTrue(responseNoOptional.getMimeType().equals("text/html"));
    try {
      JSONObject j = responseNoOptional.getRequestHeaders();
      fail();
    } catch (OptionalInformationUnavailableException expected) {
      assertTrue(expected.getKey().equals("requestHeaders"));
      // pass
    }
    try {
      String s = responseNoOptional.getRequestHeadersText();
      fail();
    } catch (OptionalInformationUnavailableException expected) {
      assertTrue(expected.getKey().equals("requestHeadersText"));
      // pass
    }
    assertEquals(200, responseNoOptional.getStatus().intValue());
    assertTrue(responseNoOptional.getStatusText().equals("OK"));
    try {
      ResourceTiming r = responseNoOptional.getTiming();
    } catch (OptionalInformationUnavailableException expected) {
      assertTrue(expected.getKey().equals("timing"));
      // pass
    }
    assertTrue(responseNoOptional.getUrl().equals("http://www.foo.com/simple.html"));
  }

  @Test
  public void request() throws Exception {
    // Test that a fully populated request is constructed and accessed correctly.
    String headers = "{\"User-Agent\":\"Mozilla\\/5.0 (Linux; U; Android 3.1; en-us; " +
        "Build\\/IRM19) AppleWebKit\\/535.7 (KHTML, like Gecko) CrMo\\/16.0.912.75 " +
        "Mobile Safari\\/535.7\",\"Accept\":\"text\\/html,application\\/xhtml+xml," +
        "application\\/xml;q=0.9,*\\/*;q=0.8\"}";
    String text =
        "{\"headers\":" + headers + ",\"method\":\"GET\"," +
        "\"url\":\"http:\\/\\/www.foo.com\\/foo.png\",\"postData\":\"foo\"}";
    JSONObject jsonObject = (JSONObject) JSONValue.parse(text);
    Request request = new Request(jsonObject);
    assertTrue(request.getHeaders().equals(JSONValue.parse(headers)));
    assertEquals("GET", request.getMethod());
    assertEquals("foo", request.getPostData());
    assertEquals("http://www.foo.com/foo.png", request.getUrl());
  }

  @Test
  public void requestWithoutOptionalInformation() throws Exception {
    // Test that optional fields throw an exception if accessed when not populated.
    String headers = "{\"User-Agent\":\"Mozilla\\/5.0 (Linux; U; Android 3.1; en-us; " +
        "Build\\/IRM19) AppleWebKit\\/535.7 (KHTML, like Gecko) CrMo\\/16.0.912.75 " +
        "Mobile Safari\\/535.7\",\"Accept\":\"text\\/html,application\\/xhtml+xml," +
        "application\\/xml;q=0.9,*\\/*;q=0.8\"}";
    String text =
        "{\"headers\":" + headers + ",\"method\":\"GET\"," +
        "\"url\":\"http:\\/\\/www.foo.com\\/foo.png\"}";
    JSONObject jsonObject = (JSONObject) JSONValue.parse(text);
    Request request = new Request(jsonObject);
    assertTrue(request.getHeaders().equals(JSONValue.parse(headers)));
    assertEquals("GET", request.getMethod());
    try {
      String postData = request.getPostData();
      fail();
    } catch (OptionalInformationUnavailableException expected) {
      // pass
    }
    assertEquals("http://www.foo.com/foo.png", request.getUrl());
  }

  /** Tests the constructor and get methods of the ResourceTiming class. */
  @Test
  public void resourceTiming() {
    ResourceTiming resourceTiming = synthesizeResourceTimingObject();
    assertEquals(new BigDecimal("1.328670831678717E9"), resourceTiming.getRequestTime());
    assertEquals(277, resourceTiming.getConnectStart().intValue());
    assertEquals(366, resourceTiming.getConnectEnd().intValue());
    assertEquals(-1, resourceTiming.getProxyStart().intValue());
    assertEquals(-1, resourceTiming.getProxyEnd().intValue());
    assertEquals(446, resourceTiming.getReceiveHeadersEnd().intValue());
    assertEquals(367, resourceTiming.getSendStart().intValue());
    assertEquals(368, resourceTiming.getSendEnd().intValue());
    assertEquals(277, resourceTiming.getDnsEnd().intValue());
    assertEquals(276, resourceTiming.getDnsStart().intValue());
    assertEquals(-1, resourceTiming.getSslStart().intValue());
    assertEquals(-1, resourceTiming.getSslEnd().intValue());
  }
}
