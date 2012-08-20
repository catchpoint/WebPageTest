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

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;

import org.easymock.EasyMock;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONValue;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.JUnit4;
import org.webpagetest.dt2har.protocol.DevtoolsMessage;
import org.webpagetest.dt2har.protocol.DevtoolsMessageFactory;
import org.webpagetest.dt2har.protocol.MalformedDevtoolsMessageException;
import org.webpagetest.dt2har.protocol.NetworkGetResponseBodyResponseMessage;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Tests of the HarObject class, which is responsible for HAR construction.
 */
@RunWith(JUnit4.class)
public class HarObjectTest {

  private static final String DEVTOOLS_MESSAGES_JSON =
      "org/webpagetest/dt2har/converter/testdata/chrome-trace.json";
  private static final String DEVTOOLS_MESSAGES_WITH_REDIRECTS_JSON =
      "org/webpagetest/dt2har/converter/testdata/chrome-trace-redirects.json";
  private static final String GOLDEN_HAR =
      "org/webpagetest/dt2har/converter/testdata/chrome.har";

  DevtoolsMessageFactory devtoolsMessageFactory = new DevtoolsMessageFactory();

  private NetworkGetResponseBodyResponseMessage synthesizeResourceContentResponseMessage()
      throws MalformedDevtoolsMessageException {
    String responseString =
        "{\"id\":4,\"result\":{\"body\":\"<HTML>\\n<BODY>\\n<P>Hello World<\\/P>\\n" +
        "<IMG SRC=\\\"http:\\/\\/184.73.115.184\\/gaga\\/foo.png\\\">\\n" +
        "<IMG SRC=\\\"http:\\/\\/184.73.115.184\\/gaga\\/foo2.png\\\">\\n<\\/BODY>\\n" +
        "<\\/HTML>\\n\",\"base64Encoded\":false}}";
    JSONObject json = (JSONObject) JSONValue.parse(responseString);
    return (NetworkGetResponseBodyResponseMessage)
        devtoolsMessageFactory.decodeDevtoolsJson(json);
  }

  /** Tests functionality of addResourceContentMessage. */
  @Test
  public void addResourceContentMessage() throws Exception {
    HarObject har = new HarObject();
    har.resources.put("23255.2", new HarResource());
    NetworkGetResponseBodyResponseMessage response = synthesizeResourceContentResponseMessage();
    har.addResourceContentMessage(response, "23255.2");
    assertEquals(response.getJson(), har.resources.get("23255.2")
        .getNetworkGetResponseBodyResponseMessage().getJson());
    try {
      har.addResourceContentMessage(synthesizeResourceContentResponseMessage(), "23255.9");
      fail();
    } catch (HarConstructionException expectedException) {
      /* Exception is expected because resource with ID 23255.9 does not exist. */
    }
    try {
      har.addResourceContentMessage(synthesizeResourceContentResponseMessage(), "23255.2");
      fail();
    } catch (HarConstructionException expectedException) {
      /* Exception is expected because content already added to this resource. */
    }
  }

  /** Tests that a synthetic HarObject contains the correct content. */
  @Test
  public void harContent() throws Exception {
    HarObject har = new HarObject();
    TestUtils.populateTestHar(devtoolsMessageFactory, har, DEVTOOLS_MESSAGES_JSON);
    har.createHarFromMessages();

    JSONObject harComparison = TestUtils.loadJsonFromResource(GOLDEN_HAR);

    JSONObject harObj = har.getHar();
    JSONObject harlog = (JSONObject) harObj.get("log");
    JSONArray entries = (JSONArray) harlog.get("entries");
    JSONObject entry = (JSONObject) entries.get(3);
    JSONObject response = (JSONObject) entry.get("response");
    JSONObject content = (JSONObject) response.get("content");
    JSONArray pages = (JSONArray) harlog.get("pages");
    JSONObject page = (JSONObject) pages.get(0);
    JSONObject charlog = (JSONObject) harComparison.get("log");
    JSONArray cpages = (JSONArray) charlog.get("pages");
    JSONObject cpage = (JSONObject) cpages.get(0);
    String ctitle = (String) cpage.get("title");
    JSONArray cpageTimings = (JSONArray) cpage.get("pageTimings");
    JSONObject cpageTiming = (JSONObject) cpageTimings.get(0);
    Long cnavStartTime = (Long) cpageTiming.get("navigationStartTime");
    Long conContentLoad = (Long) cpageTiming.get("onContentLoad");
    Long conLoad = (Long) cpageTiming.get("onLoad");
    JSONArray devtools = (JSONArray) harlog.get("_chrome_devtools_log");
    int devtoolsMessageCount = 0;
    for (Object msg : devtools) {
      if (msg instanceof JSONObject) {
        devtoolsMessageCount++;
      }
    }
    // invariant: bodySize + compression == size
    assertEquals(2900L, response.get("bodySize"));
    assertEquals(6929L, content.get("size"));
    assertEquals(4029L, content.get("compression"));

    assertEquals(har.getFirstRequest().getDocumentUrl(), ctitle);
    assertEquals(1314123547541L, har.getPageTimings().get("navigationStartTime"));
    assertEquals(1021L, har.getPageTimings().get("onContentLoad"));
    assertEquals(1120L, har.getPageTimings().get("onLoad"));
    assertEquals(25, devtools.size());
  }

  /** Tests that various methods succeed or fail before and after HAR population. */
  @Test
  public void harPopulationState() throws Exception {
    HarObject har = new HarObject();
    try {
      JSONObject harJson = har.getHar();
      fail();
    } catch (IllegalStateException e) {
      /* Exception is expected since HAR has not been populated yet. */
    }
    try {
      JSONObject pageTimings = har.getPageTimings();
      fail();
    } catch (IllegalStateException e) {
      /* Exception is expected since HAR has not been populated yet. */
    }
    TestUtils.populateTestHar(devtoolsMessageFactory, har, DEVTOOLS_MESSAGES_JSON);
    har.createHarFromMessages();

    // These should now succeed
    JSONObject harJson = har.getHar();
    JSONObject pageTimings = har.getPageTimings();
    try {
      har.addResourceContentMessage(synthesizeResourceContentResponseMessage(), "23255.2");
      fail();
    } catch (IllegalStateException e) {
      /* Exception is expected because HAR already populated */
    }
    try {
      TestUtils.populateTestHar(devtoolsMessageFactory, har, DEVTOOLS_MESSAGES_JSON);
      fail();
    } catch (IllegalStateException e) {
      /* Exception is expected because HAR already populated */
    }
    try {
      har.createHarFromMessages();
      fail();
    } catch (IllegalStateException e) {
      /* Exception is expected because HAR already populated */
    }

    har.clearData();
    try {
      harJson = har.getHar();
      fail();
    } catch (IllegalStateException e) {
      /* Exception is expected since HAR has been cleared */
    }
  }

  /** Tests that Har resources are sorted properly by request time. */
  @Test
  public void sortHarResources() throws Exception {
    HarResource a = EasyMock.createMock(HarResource.class);
    HarResource b = EasyMock.createMock(HarResource.class);
    HarResource c = EasyMock.createMock(HarResource.class);
    HarResource d = EasyMock.createMock(HarResource.class);
    EasyMock.expect(a.getRequestTime()).andReturn(new BigDecimal(1.328670831670000E9)).anyTimes();
    EasyMock.expect(b.getRequestTime()).andReturn(new BigDecimal(1.328670831660000E9)).anyTimes();
    EasyMock.expect(c.getRequestTime()).andReturn(new BigDecimal(1.328670831650000E9)).anyTimes();
    EasyMock.expect(d.getRequestTime()).andReturn(null).anyTimes();
    EasyMock.replay(a, b, c, d);
    HashMap<String, HarResource> map = Maps.newHashMap();
    map.put("1.1", a);
    map.put("2.2", b);
    map.put("3.3", c);
    map.put("4.4", d);
    HarObject har = new HarObject();
    List<Map.Entry<String, HarResource>> list = Lists.newArrayList(map.entrySet());
    har.sortHarResources(list);
    String[] sortedRequestIds = { "4.4", "3.3", "2.2", "1.1"};
    int i = 0;
    for (Map.Entry<String, HarResource> resource : list) {
      assertTrue(resource.getKey().equals(sortedRequestIds[i++]));
    }
    EasyMock.verify(a, b, c, d);
  }

  private DevtoolsMessage[] synthesizeRequestResponsePair(
      String url, BigDecimal requestTime, BigDecimal responseTime, BigDecimal loadTime,
      boolean connectionReused, long dnsStart, long dnsEnd, long connectStart, long connectEnd,
      long sslStart, long sslEnd, long proxyStart, long proxyEnd,
      long sendStart, long sendEnd, long receiveHeadersEnd)
      throws MalformedDevtoolsMessageException {

    DevtoolsMessage[] retval = new DevtoolsMessage[3];

    String requestJson =
        "{\"method\": \"Network.requestWillBeSent\", \"params\":" +
        "{\"documentURL\": \"" + url + "\", \"initiator\": { \"type\": \"other\"}," +
        "\"loaderId\": \"16233.1\", \"request\": {\"headers\": {}, \"method\": \"GET\"," +
        "\"url\": \"" + url + "\"}, \"requestId\": \"16233.2\", \"stackTrace\": []," +
        "\"timestamp\": " + requestTime.toString() + "}}";

    retval[0] = devtoolsMessageFactory.decodeDevtoolsJson(
        (JSONObject) JSONValue.parse(requestJson));

    String responseJson =
        "{\"method\": \"Network.responseReceived\", \"params\":" +
        "{\"frameId\": \"16233.2\", \"loaderId\": \"16233.1\", \"requestId\": \"16233.2\"," +
        "\"response\": {\"connectionId\": 26, \"connectionReused\": " + connectionReused +
        "\"headers\": {}, \"headersText\": \"\", \"bodySize\": 850," +
        "\"timing\": { ";
    responseJson += "\"requestTime\": " + requestTime.toString() + ", ";
    responseJson += "\"dnsStart\": " + dnsStart + ", ";
    responseJson += "\"dnsEnd\": " + dnsEnd + ", ";
    responseJson += "\"connectStart\": " + connectStart + ", ";
    responseJson += "\"connectEnd\": " + connectEnd + ", ";
    responseJson += "\"sslStart\": " + sslStart + ", ";
    responseJson += "\"sslEnd\": " + sslEnd + ", ";
    responseJson += "\"proxyStart\": " + proxyStart + ", ";
    responseJson += "\"proxyEnd\": " + proxyEnd + ", ";
    responseJson += "\"sendStart\": " + sendStart + ", ";
    responseJson += "\"sendEnd\": " + sendEnd + ", ";
    responseJson += "\"receiveHeadersEnd\": " + receiveHeadersEnd + ", ";
    responseJson += "}, \"url\": \"" + url + "\",}, \"timestamp\": " + responseTime.toString() +
        ", \"type\": \"Document\"}}";

    retval[1] = devtoolsMessageFactory.decodeDevtoolsJson(
        (JSONObject) JSONValue.parse(responseJson));

    String networkLoadingFinishedJson =
        "{\"method\": \"Network.loadingFinished\", \"params\": { " +
        "\"requestId\": \"16233.2\", \"timestamp\": " + loadTime.toString() + "}}";

    retval[2] = devtoolsMessageFactory.decodeDevtoolsJson(
        (JSONObject) JSONValue.parse(networkLoadingFinishedJson));

    return retval;
  }

  /** Tests that devtools timing information is properly interpreted. */
  @Test
  public void harDevtoolsTimingInfo() throws Exception {
    long requestTimeSec = 1000L;
    long responseTimeSec = requestTimeSec + 10L;
    long loadTimeSec = requestTimeSec + 30L;

    HarObject har = new HarObject();
    DevtoolsMessage[] dmsgs = synthesizeRequestResponsePair(
        "http://www.test.com",
        new BigDecimal(requestTimeSec),
        new BigDecimal(responseTimeSec),
        new BigDecimal(loadTimeSec),
        false, 0, 10, 20, 40, -1, -1, -1, -1, 112, 124, 148);
    for (DevtoolsMessage dm : dmsgs) {
      har.addMessage(dm);
    }
    har.createHarFromMessages();
    JSONObject jsonHar = har.getHar();

    JSONObject log = (JSONObject) jsonHar.get("log");
    JSONArray entries = (JSONArray) log.get("entries");
    JSONObject entry0 = (JSONObject) entries.get(0);
    JSONObject timings = (JSONObject) entry0.get("timings");

    // Without connection reuse, the 'connect' time is ((connectEnd - connectStart) - dns).
    assertEquals(10L, timings.get("dns"));
    assertEquals(0L, timings.get("blocked"));
    assertEquals(10L, timings.get("connect"));
    assertEquals(12L, timings.get("send"));
    assertEquals(24L, timings.get("wait"));
    assertEquals(loadTimeSec * 1000 - (requestTimeSec * 1000 + 148), timings.get("receive"));
  }

  /** Tests that devtools timing information is properly interpreted with connection reuse. */
  @Test
  public void harDevtoolsTimingInfoWithConnectionReuse() throws Exception {
    long requestTimeSec = 1000L;
    long responseTimeSec = requestTimeSec + 10L;
    long loadTimeSec = requestTimeSec + 30L;

    HarObject har = new HarObject();
    DevtoolsMessage[] dmsgs = synthesizeRequestResponsePair(
        "http://www.test.com",
        new BigDecimal(requestTimeSec),
        new BigDecimal(responseTimeSec),
        new BigDecimal(loadTimeSec),
        true, 0, 10, 20, 40, -1, -1, -1, -1, 112, 124, 148);
    for (DevtoolsMessage dm : dmsgs) {
      har.addMessage(dm);
    }
    har.createHarFromMessages();
    JSONObject jsonHar = har.getHar();

    JSONObject log = (JSONObject) jsonHar.get("log");
    JSONArray entries = (JSONArray) log.get("entries");
    JSONObject entry0 = (JSONObject) entries.get(0);
    JSONObject timings = (JSONObject) entry0.get("timings");

    // With connection reuse, 'blocked' time is (connectEnd - connectStart).
    assertEquals(10L, timings.get("dns"));
    assertEquals(20L, timings.get("blocked"));
    assertEquals(-1L, timings.get("connect"));
    assertEquals(12L, timings.get("send"));
    assertEquals(24L, timings.get("wait"));
    assertEquals(loadTimeSec * 1000 - (requestTimeSec * 1000 + 148), timings.get("receive"));
  }

  /** Tests that a netlog is gzipped and base64 encoded and placed correctly in a HAR. */
  @Test
  @SuppressWarnings("unchecked")
  public void testAddNetLogToHar() throws Exception {
    JSONObject har = new JSONObject();
    har.put("log", new JSONObject());
    String netlog = "net log test";
    HarObject harObject = new HarObject();
    harObject.embedNetLogInHar(netlog.getBytes(), har);
    String targetHar =
        "{\"log\":{\"_chrome_net_log\":\"H4sIAAAAAAAAAMtLLVHIyU9XKEktLgEATNzXMQwAAAA=\"}}";
    assertEquals(targetHar, har.toString());
  }

  @Test
  @SuppressWarnings("unchecked")
  public void testDoubleRedirect() throws Exception {
    // Tests that a doubly-redirected URL is represented correctly in the HAR
    // and also test that a redirected subresource is represented correctly.
    // Redirect responses should appear in the HAR as entries.

    HarObject har = new HarObject();
    TestUtils.populateTestHar(devtoolsMessageFactory, har, DEVTOOLS_MESSAGES_WITH_REDIRECTS_JSON);
    har.createHarFromMessages();

    // In the devtools trace, http://ms3... redirects to http://ms2... which in turn
    // redirects to http://ms... Also, http://ms...org/rss.png redirects to
    // http://www.critical...images/rss.png.
    String urls[] = {
        "http://ms3.aaaaaaaa.org/",
        "http://ms2.aaaaaaaa.org/",
        "http://ms.aaaaaaaa.org/",
        "http://ms.aaaaaaaa.org/FileEBMotherboard.jpeg",
        "http://ms.aaaaaaaa.org/rss.png",
        "http://www.criticalexponent.org/blog/wp-includes/images/rss.png"
    };

    JSONObject harObj = har.getHar();
    JSONObject harlog = (JSONObject) harObj.get("log");
    JSONArray entries = (JSONArray) harlog.get("entries");
    assertEquals(6, entries.size());

    for (int i = 0; i < 6; i++) {
      JSONObject entry = (JSONObject) entries.get(i);
      JSONObject request = (JSONObject) entry.get("request");
      String url = (String) request.get("url");
      assertEquals(urls[i], url);
    }
  }

}
