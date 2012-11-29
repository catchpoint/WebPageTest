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

import org.json.simple.JSONObject;
import org.json.simple.JSONValue;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.JUnit4;
import org.webpagetest.dt2har.protocol.DevtoolsMessageFactory;
import org.webpagetest.dt2har.protocol.NetworkDataReceivedMessage;
import org.webpagetest.dt2har.protocol.NetworkRequestWillBeSentMessage;
import org.webpagetest.dt2har.protocol.NetworkResponseReceivedMessage;

/**
 * Tests of HarResource class.
 */
@RunWith(JUnit4.class)
public class HarResourceTest {

  DevtoolsMessageFactory devtoolsMessageFactory = new DevtoolsMessageFactory();

  private NetworkRequestWillBeSentMessage synthesizeRequest() throws Exception {
    String requestStr =
        "{" +
            "\"method\":\"Network.requestWillBeSent\"," +
            "\"params\":{" +
                "\"documentURL\":\"http://aws1.mdw.la/static/index.html\"," +
                "\"frameId\":\"5032.2\",\"initiator\":{" +
                    "\"lineNumber\":6," +
                    "\"type\":\"parser\"," +
                    "\"url\":\"http://aws1.mdw.la/static/index.html\"}," +
                "\"loaderId\":\"5032.1\",\"request\":{" +
                    "\"headers\":{" +
                        "\"Referer\":\"http://aws1.mdw.la/static/index.html\"," +
                        "\"User-Agent\":\"Mozilla/5.0\"}," +
                "\"method\": \"GET\"," +
                "\"url\":\"http://aws1.mdw.la/static/image1.png\"}," +
            "\"requestId\": \"5032.13\"," +
            "\"timestamp\": 1348595421.201196}}";
    NetworkRequestWillBeSentMessage request = (NetworkRequestWillBeSentMessage)
        devtoolsMessageFactory.decodeDevtoolsJson((JSONObject) JSONValue.parse(requestStr));
    return request;
  }

  // Construct a response message with the desired parameters. Specify null for contentLength
  // to omit the Content-Length header.
  private NetworkResponseReceivedMessage synthesizeResponse(int status, boolean fromDiskCache,
      Integer contentLength, int responseHeadersLength) throws Exception {
    String fromDiskCacheStr = fromDiskCache ? "true" : "false";
    String contentLengthString = "";
    if (contentLength != null) {
      contentLengthString = "\"Content-Length\": \"" + contentLength + "\",";
    }
    String headersText = new String(new char[responseHeadersLength]).replace("\0", "x");

    String responseStr =
        "{" +
            "\"method\": \"Network.responseReceived\", " +
            "\"params\": {\"frameId\": \"5032.2\", " +
            "\"loaderId\": \"5032.1\", " +
            "\"requestId\": \"5032.13\", " +
            "\"response\": {" +
                "\"connectionId\": 84, " +
                "\"connectionReused\": true, " +
                "\"fromDiskCache\": " + fromDiskCacheStr + ", " +
                "\"headers\": {" +
                    "\"Accept-Ranges\": \"bytes\", " +
                    "\"Connection\": \"Keep-Alive\", " +
                    contentLengthString +
                    "\"Content-Encoding\": \"gzip\", " +
                    "\"Content-Type\": \"image/png\", " +
                    "\"Date\": \"Tue, 25 Sep 2012 17:50:22 GMT\", " +
                    "\"Keep-Alive\": \"timeout=15, max=99\", " +
                    "\"Last-Modified\": \"Thu, 13 Sep 2012 15:51:08 GMT\", " +
                    "\"Server\": \"Apache/2.2.22 (Amazon)\", " +
                    "\"Transfer-Encoding\": \"chunked\", " +
                    "\"Vary\": \"Accept-Encoding\"}, " +
                "\"headersText\": \"" +  headersText + "\", " +
                "\"requestHeaders\": {" +
                    "\"Accept\": \"*/*\", " +
                    "\"Accept-Charset\": \"ISO-8859-1,utf-8;q=0.7,*;q=0.3\", " +
                    "\"Accept-Encoding\": \"gzip,deflate,sdch\", " +
                    "\"Accept-Language\": \"en-US,en;q=0.8\", " +
                     "\"Connection\": \"keep-alive\", " +
                     "\"Host\": \"aws1.mdw.la\", " +
                     "\"Referer\": \"http://aws1.mdw.la/static/index.html\", " +
                     "\"User-Agent\": \"Mozilla/5.0 (Linux; Android 4.1.1; Galaxy Nexus " +
                         "Build/JRO03C) AppleWebKit/537.9 (KHTML, like Gecko) PTST " +
                         "Chrome/23.0.1260.0 Mobile Safari/537.9\"}, " +
                 "\"requestHeadersText\": \"GET /static/image1.png HTTP/1.1\r\nHost: " +
                     "aws1.mdw.la\r\nConnection: keep-alive\r\nUser-Agent: Mozilla/5.0 (Linux; " +
                     "Android 4.1.1; Galaxy Nexus Build/JRO03C) AppleWebKit/537.9 (KHTML, like " +
                     "Gecko) PTST Chrome/23.0.1260.0 Mobile Safari/537.9\r\nAccept: */*\r\n" +
                     "Referer: http://aws1.mdw.la/static/index.html\r\nAccept-Encoding: " +
                     "gzip,deflate,sdch\r\nAccept-Language: en-US,en;q=0.8\r\nAccept-Charset: " +
                     "ISO-8859-1,utf-8;q=0.7,*;q=0.3\r\n\r\n\", " +
                 "\"status\": " + status + ", " +
                 "\"statusText\": \"OK\", " +
                 "\"timing\": {" +
                     "\"connectEnd\": 483, " +
                     "\"connectStart\": 85, " +
                     "\"dnsEnd\": -1, " +
                     "\"dnsStart\": -1, " +
                     "\"proxyEnd\": -1, " +
                     "\"proxyStart\": -1, " +
                     "\"receiveHeadersEnd\": 605, " +
                     "\"requestTime\": 1348595421.3645809, " +
                     "\"sendEnd\": 514, " +
                     "\"sendStart\": 513, " +
                     "\"sslEnd\": -1, " +
                     "\"sslStart\": -1}, " +
                 "\"url\": \"http://aws1.mdw.la/static/image1.png\"}, " +
             "\"timestamp\": 1348595422.14696," +
             "\"type\": \"Image\"}}";

    NetworkResponseReceivedMessage response = (NetworkResponseReceivedMessage)
        devtoolsMessageFactory.decodeDevtoolsJson((JSONObject) JSONValue.parse(responseStr));
    return response;
  }

  private NetworkDataReceivedMessage synthesizeData(int dataLength, int encodedLength)
      throws Exception {
    String dataStr =
        "{" +
            "\"method\":\"Network.dataReceived\"," +
            "\"params\":{" +
                "\"dataLength\":" + dataLength + "," +
                "\"encodedDataLength\":" + encodedLength +
                ",\"requestId\":\"5032.13\"," +
                "\"timestamp\":1348595422.455373}}";
    NetworkDataReceivedMessage data = (NetworkDataReceivedMessage)
        devtoolsMessageFactory.decodeDevtoolsJson((JSONObject) JSONValue.parse(dataStr));
    return data;
  }

  // This is a regression test for b/7180686, wherein uncached resources have improper sizes.
  // The underlying problem is that devtools assumes agents use logic that mirrors Chrome's
  // devtools client implementation when deciding the size of a resource, conditionally
  // using content length, transfer volume, data length, and so on. (See
  // WebCore/inspector/front-end/NetworkRequest.js.)
  // This test ensures that we adhere to these conditions when receiving devtools messages
  // that we expect to trigger them and have observed in real pageloads.
  // (See https://velodrome.googleplex.com/taskdetail/view?task_id=35790147.)"
  @Test
  public void testGetTransferSize() throws Exception {
    HarResource resource = new HarResource("myPage");
    resource.setNetworkRequestWillBeSentMessage(synthesizeRequest());

    // Cached.
    resource.setNetworkResponseReceivedMessage(synthesizeResponse(200, true, null, 300));
    assertEquals(0L, (long) resource.getTransferSize());

    // 304.
    resource.setNetworkResponseReceivedMessage(synthesizeResponse(304, false, null, 300));
    assertEquals(0L, (long) resource.getTransferSize());

    // No encodedData and no Content-Length, so use dataLength
    resource.setNetworkResponseReceivedMessage(synthesizeResponse(200, false, null, 300));
    resource.addNetworkDataReceivedMessage(synthesizeData(3000, 0));
    assertEquals(3300L, (long) resource.getTransferSize());

    // No encodedDataLength, so use Content-Length.
    resource.setNetworkResponseReceivedMessage(synthesizeResponse(200, false, 1000, 300));
    assertEquals(1300L, (long) resource.getTransferSize());

    // EncodedDataLength is available, so use it.
    resource.addNetworkDataReceivedMessage(synthesizeData(3000, 2300));
    assertEquals(2300L, (long) resource.getTransferSize());
  }

  @Test
  public void testGetResponseBodySize() throws Exception {
    HarResource resource = new HarResource("myPage");
    resource.setNetworkRequestWillBeSentMessage(synthesizeRequest());
    resource.setNetworkResponseReceivedMessage(synthesizeResponse(200, false, 1000, 300));
    resource.addNetworkDataReceivedMessage(synthesizeData(3000, 2300));

    // The response body size should be equal to the total encoded data length (2300),
    // minus the response header size (300).
    assertEquals(2000L, (long) resource.getResponseBodySize());
  }
}
