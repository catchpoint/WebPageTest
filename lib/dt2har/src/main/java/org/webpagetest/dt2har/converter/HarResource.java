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

import com.google.common.annotations.VisibleForTesting;
import com.google.common.base.Preconditions;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.webpagetest.dt2har.protocol.NetworkDataReceivedMessage;
import org.webpagetest.dt2har.protocol.NetworkGetResponseBodyResponseMessage;
import org.webpagetest.dt2har.protocol.NetworkLoadingFinishedMessage;
import org.webpagetest.dt2har.protocol.NetworkRequestServedFromCacheMessage;
import org.webpagetest.dt2har.protocol.NetworkRequestWillBeSentMessage;
import org.webpagetest.dt2har.protocol.NetworkResponseReceivedMessage;
import org.webpagetest.dt2har.protocol.OptionalInformationUnavailableException;
import org.webpagetest.dt2har.protocol.Response;

import java.math.BigDecimal;
import java.text.Format;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Class that represents a page resource and converts it to a HAR entry. The class collects
 * messages related to resource requests, responses, and content from Chrome and extracts
 * information from them to construct a HAR entry.
 */
public class HarResource {
  private static final Logger logger = Logger.getLogger(HarResource.class.getName());

  // HAR keys
  static final String HAR_ENTRY_PAGEREF = "pageref";
  static final String HAR_ENTRY_STARTED_DATE_TIME = "startedDateTime";
  static final String HAR_ENTRY_TIME = "time";
  static final String HAR_ENTRY_REQUEST = "request";
  static final String HAR_ENTRY_RESPONSE = "response";
  static final String HAR_ENTRY_CACHE = "cache";
  static final String HAR_ENTRY_TIMINGS = "timings";
  static final String HAR_ENTRY_SERVER_IP_ADDRESS = "serverIPAddress";
  static final String HAR_ENTRY_CONNECTION = "connection";

  static final String HAR_REQUEST_METHOD = "method";
  static final String HAR_REQUEST_URL = "url";
  static final String HAR_REQUEST_HTTP_VERSION = "httpVersion";
  static final String HAR_REQUEST_COOKIES = "cookies";
  static final String HAR_REQUEST_HEADERS = "headers";
  static final String HAR_REQUEST_QUERY_STRING = "queryString";
  static final String HAR_REQUEST_POST_DATA = "postData";
  static final String HAR_REQUEST_HEADERS_SIZE = "headersSize";
  static final String HAR_REQUEST_BODY_SIZE = "bodySize";

  static final String HAR_RESPONSE_HTTP_VERSION = "httpVersion";
  static final String HAR_RESPONSE_STATUS = "status";
  static final String HAR_RESPONSE_STATUS_TEXT = "statusText";
  static final String HAR_RESPONSE_COOKIES = "cookies";
  static final String HAR_RESPONSE_HEADERS = "headers";
  static final String HAR_RESPONSE_CONTENT = "content";
  static final String HAR_RESPONSE_REDIRECT_URL = "redirectURL";
  static final String HAR_RESPONSE_HEADERS_SIZE = "headersSize";
  static final String HAR_RESPONSE_BODY_SIZE = "bodySize";

  static final String HAR_REQUEST_HEADERS_NAME = "name";
  static final String HAR_REQUEST_HEADERS_VALUE = "value";

  static final String HAR_RESPONSE_HEADERS_NAME = "name";
  static final String HAR_RESPONSE_HEADERS_VALUE = "value";

  static final String HAR_CONTENT_SIZE = "size";
  static final String HAR_CONTENT_COMPRESSION = "compression";
  static final String HAR_CONTENT_TEXT = "text";
  static final String HAR_CONTENT_MIME_TYPE = "mimeType";

  static final String HAR_TIMINGS_BLOCKED = "blocked";
  static final String HAR_TIMINGS_CONNECT = "connect";
  static final String HAR_TIMINGS_DNS = "dns";
  static final String HAR_TIMINGS_RECEIVE = "receive";
  static final String HAR_TIMINGS_SEND = "send";
  static final String HAR_TIMINGS_SSL = "ssl";
  static final String HAR_TIMINGS_WAIT = "wait";

  static final String HAR_COMMENT = "comment";

  // HAR default values
  static final String HAR_ENTRY_PAGEREF_DEFAULT = "page_0";
  static final String HAR_EMPTY_STRING = "";

  // other string constants
  static final String JPEG_IMAGE = "image/jpeg";

  NetworkRequestWillBeSentMessage request;        // Network.requestWillBeSent
  NetworkResponseReceivedMessage response;        // Network.responseReceived
  Response redirectResponse;                      // Embedded in Network.requestWillBeSent
  List<NetworkDataReceivedMessage> data;          // Network.dataReceived
  NetworkLoadingFinishedMessage loaded;           // Network.loadingFinished
  NetworkRequestServedFromCacheMessage cached;    // Network.resourcedMarkedAsCached
  NetworkGetResponseBodyResponseMessage content;  // has "id" and "result" -> "content"

  @VisibleForTesting
  public HarResource() {
    data = new ArrayList<NetworkDataReceivedMessage>();
  }

  void setNetworkRequestWillBeSentMessage(NetworkRequestWillBeSentMessage msg) {
    request = msg;
  }

  @VisibleForTesting
  public void setNetworkResponseReceivedMessage(NetworkResponseReceivedMessage msg) {
    Preconditions.checkState(redirectResponse == null);
    response = msg;
  }

  public void setRedirectResponseMessage(Response msg) {
    Preconditions.checkState(response == null);
    redirectResponse = msg;
  }

  void addNetworkDataReceivedMessage(NetworkDataReceivedMessage msg) {
    data.add(msg);
  }

  void setNetworkLoadingFinishedMessage(NetworkLoadingFinishedMessage msg) {
    loaded = msg;
  }

  void setNetworkRequestServedFromCacheMessage(NetworkRequestServedFromCacheMessage msg) {
    cached = msg;
  }

  void setNetworkGetResponseBodyResponseMessage(NetworkGetResponseBodyResponseMessage msg) {
    content = msg;
  }

  public NetworkRequestWillBeSentMessage getNetworkRequestWillBeSentMessage() {
    return request;
  }

  NetworkResponseReceivedMessage getNetworkResponseReceivedMessage() {
    return response;
  }

  Response getRedirectResponseMessage() {
    return redirectResponse;
  }

  /**
   * Returns the Response, which is either in redirectResponse or
   * response.getResponse(), and never both.
   */
  Response getResponse() {
    if (redirectResponse != null) {
      return redirectResponse;
    } else {
      return response.getResponse();
    }
  }

  List<NetworkDataReceivedMessage> getNetworkDataReceivedMessages() {
    return data;
  }

  NetworkLoadingFinishedMessage getNetworkLoadingFinishedMessage() {
    return loaded;
  }

  NetworkRequestServedFromCacheMessage getNetworkRequestServedFromCacheMessage() {
    return cached;
  }

  NetworkGetResponseBodyResponseMessage getNetworkGetResponseBodyResponseMessage() {
    return content;
  }

  /** Returns whether enough Devtools message information is present to create a HAR resource. */
  public boolean isComplete() {
    if (request == null) {
      logger.warning("No NetworkRequestWillBeSentMessage available for resource.");
      return false;
    }
    // To be considered complete, a resource must either have a response and be loaded,
    // or have a redirect response.
    if (redirectResponse == null) {
      if (response == null) {
        logger.warning("No NetworkResponseReceivedMessage available for resource.");
        return false;
      }
      if (loaded == null) {
        logger.warning("No NetworkLoadingFinishedMessage available for resource.");
        return false;
      }
    }
    return true;
  }

  /**
   * Create a message to get the content of a resource
   * @return The message
   */
  public String createGetResourceContentMessage() {
    // We require information from a resource request message to construct the message to get
    // the resource content. Occasionally, this isn't available.
    if (request == null) {
      //TODO: Create a HarResourceException class and throw it here.
      return null;
    }
    return request.getRequestId();
  }

  /**
   * Create an "Entry" record in a HAR
   * @return The record
   */
  @SuppressWarnings("unchecked")
  public JSONObject createHarEntry() {
    JSONObject harEntry = new JSONObject();
    BigDecimal requestTime = getRequestTime();
    JSONObject timings = createHarTimings();

    long time = 0;
    if (timings != null) {
      for (Object key : timings.keySet()) {
        if (!((String) key).equals(HAR_COMMENT)) {
          Long value = (Long) timings.get(key);
          time += value > 0L ? value : 0L;
        }
      }
    }
    harEntry.put(HAR_ENTRY_PAGEREF, HAR_ENTRY_PAGEREF_DEFAULT);
    harEntry.put(HAR_ENTRY_STARTED_DATE_TIME, getISO8601Time(requestTime));
    harEntry.put(HAR_ENTRY_TIME, time);
    harEntry.put(HAR_ENTRY_REQUEST, createHarRequest());
    harEntry.put(HAR_ENTRY_RESPONSE, createHarResponse());
    harEntry.put(HAR_ENTRY_CACHE, createHarCache());
    harEntry.put(HAR_ENTRY_TIMINGS, timings);

    // TODO: get this information
    // harEntry.put(HAR_ENTRY_SERVER_IP_ADDRESS, ip); // Optional
    // harEntry.put(HAR_ENTRY_CONNECTION, connection); //Optional

    return harEntry;
  }

  @SuppressWarnings("unchecked")
  private JSONObject createHarRequest() {

    //    "request": {
    //      "method": "GET",
    //      "url": "http://www.example.com/path/?param=value",
    //      "httpVersion": "HTTP/1.1",
    //      "cookies": [],
    //      "headers": [],
    //      "queryString" : [],
    //      "postData" : {},
    //      "headersSize" : 150,
    //      "bodySize" : 0,
    //      "comment" : "",
    //    },

    Long headersSize = getRequestHeadersSize();

    JSONObject harRequest = new JSONObject();
    harRequest.put(HAR_REQUEST_METHOD, request.getRequest().getMethod());
    harRequest.put(HAR_REQUEST_URL, request.getRequest().getUrl());
    harRequest.put(HAR_REQUEST_HTTP_VERSION, getHttpVersion());
    harRequest.put(HAR_REQUEST_COOKIES, createHarCookies());
    harRequest.put(HAR_REQUEST_HEADERS, createHarRequestHeaders());
    harRequest.put(HAR_REQUEST_QUERY_STRING, createHarQueryString());
    JSONObject postData = createHarPostData();
    if (postData != null) {
      harRequest.put(HAR_REQUEST_POST_DATA, createHarPostData());
    }
    if (headersSize == null) {
      harRequest.put(HAR_REQUEST_HEADERS_SIZE, -1);
    } else {
      harRequest.put(HAR_REQUEST_HEADERS_SIZE, headersSize);
    }
    Long requestBodySize = 0L;
    try {
      requestBodySize = (long) request.getRequest().getPostData().length();
    } catch (OptionalInformationUnavailableException e) {
      logger.fine("No post data");
    }
    harRequest.put(HAR_REQUEST_BODY_SIZE, requestBodySize);
    return harRequest;
  }

  @SuppressWarnings("unchecked")
  private JSONObject createHarResponse() {

    //    "response": {
    //      "status": 200,
    //      "statusText": "OK",
    //      "httpVersion": "HTTP/1.1",
    //      "cookies": [],
    //      "headers": [],
    //      "content": {},
    //      "redirectURL": "",
    //      "headersSize" : 160,
    //      "bodySize" : 850,
    //      "comment" : ""
    //    },

    JSONObject harResponse = new JSONObject();
    Long status = getResponse().getStatus();
    String statusText = getResponse().getStatusText();
    String httpVersion = getHttpVersion();
    Long headersSize = getResponseHeadersSize();
    Long bodySize = getResponseBodySize();

    harResponse.put(HAR_RESPONSE_HTTP_VERSION, httpVersion);
    harResponse.put(HAR_RESPONSE_STATUS, status);
    harResponse.put(HAR_RESPONSE_STATUS_TEXT, statusText);
    harResponse.put(HAR_RESPONSE_COOKIES, createHarCookies());
    harResponse.put(HAR_RESPONSE_HEADERS, createHarResponseHeaders());
    harResponse.put(HAR_RESPONSE_CONTENT, createHarContent());
    // TODO: get redirectURL
    harResponse.put(HAR_RESPONSE_REDIRECT_URL, HAR_EMPTY_STRING);
    harResponse.put(HAR_RESPONSE_HEADERS_SIZE, headersSize);
    harResponse.put(HAR_RESPONSE_BODY_SIZE, bodySize);
    return harResponse;
  }

  private JSONArray createHarCookies() {

    //    "cookies": [
    //                {
    //                    "name": "TestCookie",
    //                    "value": "Cookie Value",
    //                    "path": "/",
    //                    "domain": "www.janodvarko.cz",
    //                    "expires": "2009-07-24T19:20:30.123+02:00",
    //                    "httpOnly": false,
    //                    "secure": false,
    //                    "comment": "",
    //                }
    //            ]

    JSONArray harCookies = new JSONArray();
    // TODO: get cookie info
    return harCookies;
  }

  @SuppressWarnings("unchecked")
  private JSONArray createHarRequestHeaders() {

    //    "headers": [
    //                {
    //                    "name": "Accept-Encoding",
    //                    "value": "gzip,deflate",
    //                    "comment": ""
    //                },
    //                {
    //                    "name": "Accept-Language",
    //                    "value": "en-us,en;q=0.5",
    //                    "comment": ""
    //                }
    //            ]

    JSONArray harRequestHeaders = new JSONArray();
    JSONObject requestHeaders = request.getRequest().getHeaders();
    for (Object key : requestHeaders.keySet()) {
      String value = (String) requestHeaders.get(key);
      JSONObject harRequestHeader = new JSONObject();
      harRequestHeader.put(HAR_REQUEST_HEADERS_NAME, ((String) key).toLowerCase());
      harRequestHeader.put(HAR_REQUEST_HEADERS_VALUE, value);
      harRequestHeaders.add(harRequestHeader);
      }
    return harRequestHeaders;
  }

  @SuppressWarnings("unchecked")
  private JSONArray createHarResponseHeaders() {

    //    "headers": [
    //                {
    //                    "name": "Accept-Encoding",
    //                    "value": "gzip,deflate",
    //                    "comment": ""
    //                },
    //                {
    //                    "name": "Accept-Language",
    //                    "value": "en-us,en;q=0.5",
    //                    "comment": ""
    //                }
    //            ]

    JSONArray harResponseHeaders = new JSONArray();
    JSONObject responseHeaders = getResponse().getHeaders();
    for (Object key : responseHeaders.keySet()) {
      String value = (String) responseHeaders.get(key);
      JSONObject harResponseHeader = new JSONObject();
      harResponseHeader.put(HAR_RESPONSE_HEADERS_NAME, ((String) key).toLowerCase());
      harResponseHeader.put(HAR_RESPONSE_HEADERS_VALUE, value);
      harResponseHeaders.add(harResponseHeader);
    }
    return harResponseHeaders;
  }

  private JSONArray createHarQueryString() {
    // TODO: need to fetch with a query string to construct this.

    //    "queryString": [
    //                    {
    //                        "name": "param1",
    //                        "value": "value1",
    //                        "comment": ""
    //                    },
    //                    {
    //                        "name": "param1",
    //                        "value": "value1",
    //                        "comment": ""
    //                    }
    //                ]
    JSONArray harQueryString = new JSONArray();
    return harQueryString;
  }

  private JSONObject createHarPostData() {
    // TODO: need to post data to construct this.

    //    "postData": {
    //      "mimeType": "multipart/form-data",
    //      "params": [],
    //      "text" : "plain posted data",
    //      "comment": ""
    //    }

    return null;
  }

  @SuppressWarnings("unchecked")
  private JSONObject createHarContent() {

    //    "content": {
    //        "size": 33,
    //        "compression": 0,
    //        "mimeType": "text/html; charset="utf-8",
    //        "text": "<html><head></head><body/></html>\n",
    //        "comment": ""
    //    }

    JSONObject harContent = new JSONObject();
    Long dataSize = 0L;
    Long encodedSize = 0L;
    Long compression = 0L;
    String text = "";
    String mimeType = getResponse().getMimeType();
    StringBuilder comment = new StringBuilder("");

    for (NetworkDataReceivedMessage dataMsg : data) {
      dataSize += dataMsg.getDataLength();
      encodedSize += dataMsg.getEncodedDataLength();
    }
    if (content != null) {
      text = content.getBody();
    } else {
      comment.append("Devtools messages provided no response content for this resource. ");
      logger.log(Level.WARNING,
          "no content available for resource {0}", request.getRequest().getUrl());
    }
    if (dataSize >= encodedSize) {
      compression = dataSize - encodedSize;
    } else {
      comment.append("Encoded size is greater than inflated data size. ");
    }

    // Remove a trailing space if there is one.
    if (comment.length() > 0 && comment.lastIndexOf(" ") == comment.length() - 1) {
      comment.deleteCharAt(comment.length() - 1);
    }
    harContent.put(HAR_CONTENT_SIZE, dataSize);
    harContent.put(HAR_CONTENT_COMPRESSION, compression);
    harContent.put(HAR_CONTENT_TEXT, text);
    harContent.put(HAR_CONTENT_MIME_TYPE, mimeType);
    harContent.put(HAR_COMMENT, comment.toString());

    return harContent;
  }

  private JSONObject createHarCache() {

    //    "cache": {
    //      "beforeRequest": {},
    //      "afterRequest": {},
    //      "comment": ""
    //    }

    JSONObject harCache = new JSONObject();
    /* TODO: use cache info if available and
     * call jsonBeforeRequest and jsonAfterRequest
     */
    // if cached info is in the messages, do something like this:
    // harCache.put("beforeRequest", jsonBeforeRequest(r));
    // harCache.put("afterRequest", jsonAfterRequest(r));
    // harCache.put("comment", comment);
    return harCache;
  }

  @SuppressWarnings("unchecked")
  private JSONObject createHarTimings() {

    //    "timings": {
    //      "blocked": 0,
    //      "dns": -1,
    //      "connect": 15,
    //      "send": 20,
    //      "wait": 38,
    //      "receive": 12,
    //      "ssl": -1,
    //      "comment": ""
    //    }

    JSONObject harTimings = new JSONObject();

    Long dns = getTimingDns();
    Long connect = getTimingConnect();
    Long send = getTimingSend();
    Long wait = getTimingWait();
    Long receive = getTimingReceive();
    Long ssl =  getTimingSSL();

    // The interpretation of the raw devtools timing information is a bit nuanced. The definitive
    // source on how these messages should be interpreted is the WebKit Inspector code in Chromium.
    // See third_party/javascript/webkit_inspector for a Google3 dump of this code.

    if (getResponse().isConnectionReused()) {
      // If the connection was reused, 'connect' is really the blocked time, and there is no
      // connect time.
      if (connect != null) {
        harTimings.put(HAR_TIMINGS_BLOCKED, connect);
      } else {
        harTimings.put(HAR_TIMINGS_BLOCKED, -1L);
      }
      harTimings.put(HAR_TIMINGS_CONNECT, -1L);
    } else {
      // Otherwise, blocked time is zero, and connect time is connect minus DNS lookup, if any.
      harTimings.put(HAR_TIMINGS_BLOCKED, 0L);
      if (connect != null) {
        if (dns != null) {
          // If DNS lookup time is nonzero, need to subtract it from connect time.
          harTimings.put(HAR_TIMINGS_CONNECT, new Long(connect.longValue() - dns.longValue()));
        } else {
          harTimings.put(HAR_TIMINGS_CONNECT, connect);
        }
      } else {
        // No connect time.
        harTimings.put(HAR_TIMINGS_CONNECT, -1L);
      }
    }

    if (dns != null) {
      harTimings.put(HAR_TIMINGS_DNS, dns);
    } else {
      harTimings.put(HAR_TIMINGS_DNS, -1L);
    }

    if (send != null) {
      harTimings.put(HAR_TIMINGS_SEND, send);
    } else {
      harTimings.put(HAR_TIMINGS_SEND, 0L);
    }

    if (wait != null) {
      harTimings.put(HAR_TIMINGS_WAIT, wait.longValue());
    } else {
      harTimings.put(HAR_TIMINGS_WAIT, -1L);
    }

    if (ssl != null) {
      harTimings.put(HAR_TIMINGS_SSL, ssl);
    } else {
      harTimings.put(HAR_TIMINGS_SSL, -1L);
    }

    if (receive != null) {
      harTimings.put(HAR_TIMINGS_RECEIVE, receive.longValue());
    } else {
      harTimings.put(HAR_TIMINGS_RECEIVE, -1L);
    }
    return harTimings;
  }

  /**
   * Convert time from seconds since the epoch to ISO 8601 format
   * @param timeSec The number of seconds since the epoch
   * @return The ISO 8601 time
   */
  public String getISO8601Time(BigDecimal timeSec) {
    BigDecimal timeMs = timeSec.multiply(new BigDecimal(1000));
    Date d = new Date(timeMs.longValue());
    Format format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
    String timeString = format.format(d);
    return timeString;
  }

  private Long getRequestHeadersSize() {
    Long size = null;

    try {
      size = (long) getResponse().getRequestHeadersText().length();
    } catch (OptionalInformationUnavailableException e) {
      /*
       * We don't have the actual request headers text, so we estimate its size using what
       * we do have. Note this is only an estimate.
       */
      logger.fine("Estimating headers size using headers array");
      JSONObject requestHeaders = request.getRequest().getHeaders();

      size = 0L;
      size += request.getRequest().getMethod().length() + 5L;  // " / "  and CRLF
      size += request.getRequest().getUrl().length() + 1L; // "Host: " and CRLF minus "http://"
      for (Object key : requestHeaders.keySet()) {
        size += ((String) key).length()
          + ((String) requestHeaders.get(key)).length() + 4L; // ": " and CRLF
      }
      size += 2L; // trailing CRLF
    }
    return size;
  }

  private Long getResponseHeadersSize() {
    Long size;
    try {
      size = (long) getResponse().getHeadersText().length();
    } catch (OptionalInformationUnavailableException e) {
      /*
       * We don't have the actual response headers text, so we estimate its size using what
       * we do have. Note this is only an estimate.
       */
      JSONObject responseHeaders = getResponse().getHeaders();
      size = 0L;
      size += getResponse().getStatus().toString().length()
          + getResponse().getStatusText().length() + 14L; // "HTTP / 1.1 ", " " and CRLF;
      for (Object key : responseHeaders.keySet()) {
        size += ((String) key).length()
            + ((String) responseHeaders.get(key)).length() + 4L; // ": " and CRLF
      }
      size += 2L; // trailing CRLF
    }
    return size;
  }

  private static final String VERSION_REGEX = "\\AHTTP/(\\d+\\.\\d+)";

  private String getHttpVersion() {

    String version;
    try {
      String headersText = getResponse().getHeadersText();
      Pattern p = Pattern.compile(VERSION_REGEX);
      Matcher m = p.matcher(headersText);
      if (m.find()) {
        version = m.group(1);
      } else {
        logger.warning("Version not found in response headers text");
        version = "";
      }
    } catch (OptionalInformationUnavailableException e) {
      logger.log(Level.WARNING,
          "No Http Version field in response message: {0}", getResponse().getJson());
        version = ""; // Har needs a version and one wasn't provided
    }
    return version;
  }

  private Long getResponseBodySize() {
    Long responseBodySize = 0L;
    for (NetworkDataReceivedMessage b : data) {
      responseBodySize += b.getEncodedDataLength();
    }
    return responseBodySize;
  }

  /** Returns the time that the resource was requested in seconds since the epoch. */
  BigDecimal getRequestTime() {
    BigDecimal requestTime;
    try {
        return getResponse().getTiming().getRequestTime();
    } catch (OptionalInformationUnavailableException e) {
      logger.log(Level.WARNING,
          "Timing information unavailable, falling back to request timestamp. {0}",
          getResponse().getJson());
      return request.getTimestamp();
    }
  }

  private Long getTimingDns() {
    try {
      Long end = getResponse().getTiming().getDnsEnd();
      Long start = getResponse().getTiming().getDnsStart();
      return end - start;
    } catch (OptionalInformationUnavailableException e) {
      logger.log(Level.WARNING, "Timing information unavailable. {0}", getResponse().getJson());
      return null;
    }
  }

  private Long getTimingConnect() {
    try {
      Long end = getResponse().getTiming().getConnectEnd();
      Long start = getResponse().getTiming().getConnectStart();
      return end - start;
    } catch (OptionalInformationUnavailableException e) {
      logger.log(Level.WARNING, "Timing information unavailable. {0}", getResponse().getJson());
      return null;
    }
  }

  private Long getTimingSend() {
    try {
      Long end = getResponse().getTiming().getSendEnd();
      Long start = getResponse().getTiming().getSendStart();
      return end - start;
    } catch (OptionalInformationUnavailableException e) {
      logger.log(Level.WARNING, "Timing information unavailable. {0}", getResponse().getJson());
      return null;
    }
  }

  private Long getTimingSSL() {
    try {
      Long end = getResponse().getTiming().getSslEnd();
      Long start = getResponse().getTiming().getSslStart();
      return end - start;
    } catch (OptionalInformationUnavailableException e) {
      logger.log(Level.WARNING, "Timing information unavailable. {0}", getResponse().getJson());
      return null;
    }
  }

  private Long getTimingWait() {
    try {
      Long end = getResponse().getTiming().getReceiveHeadersEnd();
      Long start = getResponse().getTiming().getSendEnd();
      return end - start;
    } catch (OptionalInformationUnavailableException e) {
      logger.log(Level.WARNING, "Timing information unavailable: {0}", getResponse().getJson());
      return null;
    }
  }

  /**
   * This is the time between when the headers are received and the Network.loadingFinished
   * event for the resource.
   */
  private Long getTimingReceive() {
    // A redirect response has no payload to receive.
    if (redirectResponse != null) {
      return null;
    } else {
      try {
        // Convert to milliseconds
        BigDecimal requestTime = getRequestTime().multiply(new BigDecimal(1000));
        BigDecimal loadedTime = loaded.getTimestamp().multiply(new BigDecimal(1000));
        BigDecimal headersEnd = requestTime.add(
            new BigDecimal(getResponse().getTiming().getReceiveHeadersEnd()));
        BigDecimal diff = loadedTime.subtract(headersEnd);
        return diff.longValue();
      } catch (OptionalInformationUnavailableException e) {
        logger.warning("Could not get receive time.");
        return null;
      }
    }
  }
}
