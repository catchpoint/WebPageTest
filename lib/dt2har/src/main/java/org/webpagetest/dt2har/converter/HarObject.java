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
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;

import org.apache.commons.codec.binary.Base64;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONValue;
import org.webpagetest.dt2har.protocol.DevtoolsMessage;
import org.webpagetest.dt2har.protocol.DevtoolsNetworkEventMessage;
import org.webpagetest.dt2har.protocol.NetworkDataReceivedMessage;
import org.webpagetest.dt2har.protocol.NetworkGetResponseBodyResponseMessage;
import org.webpagetest.dt2har.protocol.NetworkLoadingFinishedMessage;
import org.webpagetest.dt2har.protocol.NetworkRequestServedFromCacheMessage;
import org.webpagetest.dt2har.protocol.NetworkRequestWillBeSentMessage;
import org.webpagetest.dt2har.protocol.NetworkResponseReceivedMessage;
import org.webpagetest.dt2har.protocol.OptionalInformationUnavailableException;
import org.webpagetest.dt2har.protocol.PageDomContentEventFiredMessage;
import org.webpagetest.dt2har.protocol.PageLoadEventFiredMessage;
import org.webpagetest.dt2har.protocol.Response;
import org.webpagetest.dt2har.protocol.RuntimeResponseMessage;

import java.io.BufferedWriter;
import java.io.ByteArrayOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.zip.GZIPOutputStream;

/**
 * A class to construct and maintain a HAR object from Chrome Developer Tools messages.
 *
 * It currently supports the Developer Tools Protocol v1.0. Future Chrome browser
 * versions should be backward compatible with the v1.0 protocol.
 *
 * TODO: Add a mechanism to support newer AND older protocol versions.
 */
public class HarObject {
  public static final String VERSION = "1.1";
  public static final String DEFAULT_CREATOR = "devtools2har";
  public static final String DEFAULT_PAGE_ID = "page_0";

  private static final Logger logger = Logger.getLogger(HarObject.class.getName());

  /** The time in seconds (UTC) when the page navigation began. */
  private BigDecimal navigationStartTime;

  HashMap<String, HarResource> resources;
  private final Queue<String> requestIdsForContentToFetch;
  //TODO: consider using AtomicInteger
  private int requestCnt;
  private int responseCnt;
  private int dataCnt;
  private int loadedCnt;
  private int cachedCnt;
  private int contentCnt;

  private JSONObject har;
  private NetworkRequestWillBeSentMessage firstRequest;
  private PageLoadEventFiredMessage lastPageLoadEvent;
  private PageDomContentEventFiredMessage lastDomContentEvent;
  private RuntimeResponseMessage navigationTimingsMsg;
  private Map<String, Long> pageTimings;
  private String pageTimingsComment;

  private String creatorName;
  private String creatorVersion;
  private String creatorVersionComment;
  private String browserName;
  private String browserVersion;
  private String browserVersionComment;
  private String pageId;  // We support only one page now. Multi-page would need a scheme.
  // When computing page load times, ignore the interval between the start of navigation
  // and the first request being sent.
  private boolean ignoreDelayToFirstRequest;
  private boolean complete;

  private JSONArray devtoolsLog;

  /** Create a new, empty HarObject. All times will be interpreted as UTC. */
  public HarObject(String creatorName, String creatorVersion, String creatorVersionComment,
                   String browserName, String browserVersion, String browserVersionComment,
                   String pageId, boolean ignoreDelayToFirstRequest) {
    this.creatorName = creatorName;
    this.creatorVersion = creatorVersion;
    this.creatorVersionComment = creatorVersionComment;
    this.browserName = browserName;
    this.browserVersion = browserVersion;
    this.browserVersionComment = browserVersionComment;
    this.pageId = pageId;
    this.ignoreDelayToFirstRequest = ignoreDelayToFirstRequest;
    resources = Maps.newHashMap();
    requestIdsForContentToFetch = Lists.newLinkedList();
    complete = true;
  }

  /** Create a new, empty HarObject. All times will be interpreted as UTC. */
  public HarObject() {
    this(DEFAULT_CREATOR, VERSION, "", "", "", "", DEFAULT_PAGE_ID, false);
  }

  /**
   * Return the JSON object representing the HAR. This method cannot be called
   * until createHarFromMessages() has been called to populate the HAR.
   */
  public synchronized JSONObject getHar() {
    // This method should only be called once the HAR has been created.
    Preconditions.checkState(har != null);
    return har;
  }

  /** Returns the time when the page navigation started. */
  public synchronized BigDecimal getNavigationStartTime() {
    // This method should only be called once the navigation start time has been determined.
    Preconditions.checkState(navigationStartTime != null);
    return navigationStartTime;
  }

  /**
   * Return the pageTimings for this measurement, represented as a JSON object.
   * Each entry of the returned JSON object maps a String key to a Long value,
   * which is represented in milliseconds. This method cannot be called until
   * createHarFromMessages() has been called to populate the HAR.
   */
  public synchronized JSONObject getPageTimings() {
    // This method should only be called once the HAR has been created.
    Preconditions.checkState(har != null);
    JSONObject harlog = (JSONObject) har.get("log");
    JSONArray pages = (JSONArray) harlog.get("pages");
    JSONObject page = (JSONObject) pages.get(0);
    JSONObject pageTimings = (JSONObject) page.get("pageTimings");
    return pageTimings;
  }

  /** Returns the devtools message containing information about first request that was sent. */
  public synchronized NetworkRequestWillBeSentMessage getFirstRequest()
      throws HarConstructionException {
    if (firstRequest == null) {
      throw new HarConstructionException(
          "No devtools messages of type NetworkRequestWillBeSent have been received");
    }
    return firstRequest;
  }

  /**
   * Set the creator info associated with this HAR.
   */
  public synchronized void setCreatorInfo(String creatorName, String creatorVersion,
                                          String creatorVersionComment) {
    this.creatorName = creatorName;
    this.creatorVersion = creatorVersion;
    this.creatorVersionComment = creatorVersionComment;
  }

  /**
   * Set the browser info associated with this HAR.
   */
  public synchronized void setBrowserInfo(String browserName, String browserVersion,
                                          String browserVersionComment) {
    this.browserName = browserName;
    this.browserVersion = browserVersion;
    this.browserVersionComment = browserVersionComment;
  }

  /**
   * Set the page ID for the first (and only) page in the HAR.
   */
  public synchronized void setPageId(String pageId) {
    this.pageId = pageId;
  }

  /**
   * Set the flag to ignore delay to first request.
   */
  public synchronized void setIgnoreDelayToFirstRequest(boolean ignoreDelayToFirstRequest) {
    this.ignoreDelayToFirstRequest = ignoreDelayToFirstRequest;
  }

  /**
   * Clear out the HAR and resource data from this HarObject, to save memory.
   * After this method has been called, one must call createHarFromMessages() before
   * calling getHar() or getPageTimings().
   */
  public synchronized void clearData() {
    this.har = null;
    this.resources = null;
  }

  /**
   * Get a count of the devtools messages that indicate a request is about to be sent
   * @return The count
   */
  public synchronized int getRequestCnt() {
    return requestCnt;
  }

  /**
   * Get a count of the devtools messages that indicate that a response was received
   * @return The count
   */
  public synchronized int getResponseCnt() {
    return responseCnt;
  }

  /**
   * Get a count of the devtools messages that indicate that data was received
   * @return The count
   */
  public synchronized int getDataCnt() {
    return dataCnt;
  }

  /**
   * Get a count of the devtools messages that indicate that a resource was loaded
   * @return The count
   */
  public synchronized int getLoadedCnt() {
    return loadedCnt;
  }

  /**
   * Get a count of the devtools messages that indicate that a resource was loaded from cache
   * @return The count
   */
  public synchronized int getCachedCnt() {
    return cachedCnt;
  }

  /**
   * Get a count of the devtools messages that contain resources' content
   * @return The count
   */
  public synchronized int getContentCnt() {
    return contentCnt;
  }

  /** Returns whether the HAR is known to be missing resources. */
  public synchronized boolean isComplete() {
    return complete;
  }

  /**
   * Get the message that contains the same timing information as is available
   * by issuing the window.performance.timing command in a Chrome Developer
   * Tools console
   * @return The message
   */
  public synchronized RuntimeResponseMessage getNavigationTimingsMsg() {
    return navigationTimingsMsg;
  }

  /**
   * Increment count of the devtools messages that indicate a request is about to be sent
   */
  public synchronized void incrementRequestCnt() {
    ++requestCnt;
  }

  /**
   * Increment count of the devtools messages that indicate that a response was received
   */
  public synchronized void incrementResponseCnt() {
    ++responseCnt;
  }

  /**
   * Increment count of the devtools messages that indicate that data was received
   */
  public synchronized void incrementDataCnt() {
    ++dataCnt;
  }

  /**
   * Increment count of the devtools messages that indicate that a resource was loaded
   */
  public synchronized void incrementLoadedCnt() {
    ++loadedCnt;
  }

  /**
   * Increment count of the devtools messages that indicate that a resource was loaded from cache
   */
  public synchronized void incrementCachedCnt() {
    ++cachedCnt;
  }

  /**
   * Increment count of the devtools messages that contain resources' content
   */
  public synchronized void incrementContentCnt() {
    ++contentCnt;
  }

  /** Add a devtools message containing resource content to the set of information
   * used to construct the har.
   * @param msg A {@code PAGE_GET_RESOURCE_CONTENT_RESULT} message
   * @param requestId The requestId of the resource to which this content corresponds.
   */
  public synchronized void addResourceContentMessage(
      NetworkGetResponseBodyResponseMessage msg, String requestId)
          throws HarConstructionException {

    // This method should not be called after the HAR has been constructed.
    Preconditions.checkState(har == null);
    HarResource r = resources.get(requestId);
    if (r == null) {
      throw new HarConstructionException("Got resource content for an unknown resource");
    }
    if (r.content != null) {
      throw new HarConstructionException("Already have content for this resource");
    }
    r.content = msg;
    this.incrementContentCnt();
  }

  /**
   * Add a devtools message to the messages that will be used to construct the HAR
   * @param msg The message to add
   */
  public synchronized void addMessage(DevtoolsMessage msg) {
    // This method should not be called after the HAR has been constructed.
    Preconditions.checkState(har == null);
    if (msg == null) {
      return;
    }
    if (msg instanceof DevtoolsNetworkEventMessage) {
      DevtoolsNetworkEventMessage netmsg = (DevtoolsNetworkEventMessage) msg;
      String id = netmsg.getRequestId();
      HarResource r = resources.get(id);
      if (r == null) {
        r = new HarResource(pageId);
        resources.put(id, r);
      }
      if (netmsg instanceof NetworkRequestWillBeSentMessage) {
        NetworkRequestWillBeSentMessage request = (NetworkRequestWillBeSentMessage) netmsg;
        incrementRequestCnt();
        if (firstRequest == null) {
          firstRequest = request;
        }
        // If the request has a redirect response, then create a new HAR resource
        // containing the redirect information. The new resource will have the
        // same request ID, so add its unique timestamp to the resource name to
        // avoid conflicting with the actual response.
        Response redirectResponse = request.getRedirectResponse();
        if (redirectResponse != null) {
          NetworkRequestWillBeSentMessage redirectRequest = r.getNetworkRequestWillBeSentMessage();
          if (redirectRequest == null) {
            logger.warning("Expected redirect to have corresponding request. Ignoring redirect.");
            complete = false;
          } else {
            HarResource redirected = new HarResource(pageId);
            String redirectedId = id + "__" + redirectRequest.getTimestamp().toString();
            resources.put(redirectedId, redirected);
            redirected.setNetworkRequestWillBeSentMessage(redirectRequest);
            redirected.setRedirectResponseMessage(redirectResponse);
          }
        }
        r.setNetworkRequestWillBeSentMessage(request);
      } else if (netmsg instanceof NetworkResponseReceivedMessage) {
        incrementResponseCnt();
        r.setNetworkResponseReceivedMessage((NetworkResponseReceivedMessage) msg);
      } else if (netmsg instanceof NetworkDataReceivedMessage) {
        incrementDataCnt();
        r.addNetworkDataReceivedMessage((NetworkDataReceivedMessage) msg);
      } else if (netmsg instanceof NetworkLoadingFinishedMessage) {
        incrementLoadedCnt();
        r.setNetworkLoadingFinishedMessage((NetworkLoadingFinishedMessage) msg);
        String requestIdForFetchingContent = r.createGetResourceContentMessage();
        if (requestIdForFetchingContent != null) {
          addRequestIdForContentToFetch(requestIdForFetchingContent);
        }
      } else if (netmsg instanceof NetworkRequestServedFromCacheMessage) {
        this.incrementCachedCnt();
        r.setNetworkRequestServedFromCacheMessage((NetworkRequestServedFromCacheMessage) msg);
      }
    } else if (msg instanceof PageLoadEventFiredMessage) {
      lastPageLoadEvent = (PageLoadEventFiredMessage) msg;
    } else if (msg instanceof PageDomContentEventFiredMessage) {
      lastDomContentEvent = (PageDomContentEventFiredMessage) msg;
    } else if (msg instanceof RuntimeResponseMessage &&
        ((RuntimeResponseMessage) msg).getResult() instanceof JSONArray) {
      navigationTimingsMsg = (RuntimeResponseMessage) msg;
    }
  }

  /** Sets the log of Devtools messages. */
  public void addDevtoolsLog(JSONArray devtoolsLog) {
    this.devtoolsLog = devtoolsLog;
  }

  /**
   * Embeds the Chrome network events log in a HAR in the following location: { log {
   * _chrome_net_log : LOG }, ...}. The log is gzipped and then converted to base64.
   *
   * @param netlog The network events log data.
   * @param harJson The HAR in which to embed the log.
   */
  @VisibleForTesting
  @SuppressWarnings("unchecked")
  void embedNetLogInHar(byte[] netlog, JSONObject harJson) throws IOException {
    Preconditions.checkState(harJson != null);
    ByteArrayOutputStream baos = null;
    GZIPOutputStream gzip = null;
    try {
      baos = new ByteArrayOutputStream();
      gzip = new GZIPOutputStream(baos);
      gzip.write(netlog);
      gzip.finish();
      String base64Log = Base64.encodeBase64String(baos.toByteArray());
      JSONObject harlog = (JSONObject) harJson.get("log");
      harlog.put("_chrome_net_log", base64Log);
    } finally {
      baos.close();
      gzip.close();
    }
  }

  /** Sets the Chrome network events log. */
  public void addChromeNetLog(byte[] chromeNetLog) throws IOException {
    embedNetLogInHar(chromeNetLog, har);
  }

  /** Returns a HarResource for a given Request ID. */
  public synchronized HarResource getResourceByRequestId(String requestId) {
    return resources.get(requestId);
  }

  /**
   * Enqueue a newly received message to be consumed.
   * @param requestId The request identifier associated with the content to fetch
   */
  public synchronized void addRequestIdForContentToFetch(String requestId) {
    Preconditions.checkState(har == null);
    this.requestIdsForContentToFetch.add(requestId);
  }

  /**
   * Dequeue a message that has been recently received
   * @return The requestId or null if one isn't available
   */
  public synchronized String getRequestIdForContentToFetch() {
    Preconditions.checkState(har == null);
    return requestIdsForContentToFetch.poll();

  }

  /**
   * Save the HAR object to a file. This method cannot be called until createHarFromMessages()
   * has populated the HAR.
   * @param filename The filename including the full path
   * @throws IOException A problem occurred while writing the file
   */
  public synchronized void save(String filename) throws IOException {
    // This method should not be called until the HAR has been constructed.
    Preconditions.checkState(har != null);
    FileWriter fstream = null;
    String msg = null;
    BufferedWriter fout = null;
    try {
      fstream = new FileWriter(filename);
      fout = new BufferedWriter(fstream);
      msg = JSONValue.toJSONString(har);
      fout.write(msg);
      fout.close();
    } finally {
      if (fout != null) {
        fout.close();
      }
    }
  }

  /**
   * Populate the HAR using accumulated devtools messages. This method must be
   * called before getHar() or getPageTimings() has been called.
   */
  @SuppressWarnings("unchecked")
  public synchronized void createHarFromMessages() throws HarConstructionException {
    // This method should not be called once the HAR has been created.
    Preconditions.checkState(har == null);
    har = new JSONObject();
    har.put("log", this.createHarLog());
  }

  @SuppressWarnings("unchecked")
  private JSONObject createHarLog() throws HarConstructionException {
    //    {
    //      "log": {
    //          "version" : "1.1",
    //          "creator" : {},
    //          "browser" : {},
    //          "pages": [],
    //          "entries": [],
    //          "comment": ""
    //      }
    //    }
    JSONObject log = new JSONObject();
    log.put("version", "1.2");
    log.put("creator", this.createHarCreator());
    log.put("browser", this.createHarBrowser());
    log.put("pages", this.createHarPages());
    log.put("entries", this.createHarEntries());
    log.put("comment", "");
    if (devtoolsLog != null) {
      log.put("_chrome_devtools_log", devtoolsLog);
    }
    return log;
  }

  @SuppressWarnings("unchecked")
  private JSONObject createHarCreator() {
    //    "creator": {
    //      "name": "Firebug",
    //      "version": "1.6",
    //      "comment": "",
    //    }
    JSONObject creator = new JSONObject();
    creator.put("name", creatorName);
    creator.put("version", creatorVersion);
    creator.put("comment", creatorVersionComment);
    return creator;
  }

  @SuppressWarnings("unchecked")
  private JSONObject createHarBrowser() {
    //    "browser": {
    //      "name": "Firefox",
    //      "version": "3.6",
    //      "comment": ""
    //    }
    JSONObject browser = new JSONObject();
    browser.put("name", browserName);
    browser.put("version", browserVersion);
    browser.put("comment", browserVersionComment);
    return browser;
  }

  @SuppressWarnings("unchecked")
  private JSONArray createHarPages() throws HarConstructionException {
    JSONArray pages = new JSONArray();
    //    "pages": [
    //              {
    //                  "startedDateTime": "2009-04-16T12:07:25.123+01:00",
    //                  "id": "page_0",
    //                  "title": "Test Page",
    //                  "pageTimings": {...},
    //                  "comment": ""
    //              }
    //          ]
    //TODO: generalize to support multiple pages in a single HAR.
    pages.add(createHarPage());
    return pages;
  }

  @SuppressWarnings("unchecked")
  private JSONObject createHarPage() throws HarConstructionException {
    JSONObject page = new JSONObject();
    page.put("id", pageId);
    page.put("title", getFirstRequest().getDocumentUrl());
    page.put("pageTimings", createHarPageTimings());
    // Must be created after createHarPageTimings extracts the navigation start time.
    String startTime = new HarResource(pageId).getISO8601Time(this.getNavigationStartTime());
    page.put("startedDateTime", startTime);
    return page;
  }

  /**
   * Convert the internal pageTimings array to the HAR JSON representation.
   */
  @SuppressWarnings("unchecked")
  private JSONObject createHarPageTimings() throws HarConstructionException {
    //    "pageTimings": { "onContentLoad": 1720,
    //                       "onLoad": 2500,
    //                       "comment": "" }
    JSONObject timingsObject = new JSONObject();

    calculatePageTimings();
    for (String key : pageTimings.keySet()) {
      timingsObject.put(key, pageTimings.get(key).longValue());
    }
    if (pageTimingsComment != null) {
      timingsObject.put("comment", pageTimingsComment);
    }
    return timingsObject;
  }

  /**
   * Calculate pageTimings from received devtools messages.
   */
  private void calculatePageTimings() throws HarConstructionException {
    BigDecimal startTimeMs = null;
    BigDecimal loadTimeMs = null;
    BigDecimal domContentLoadTimeMs = null;
    pageTimings = Maps.newHashMap();

    try {
      // First try to use window.performance.timing data, if available.
      Map<String, String> perfTimings = parsePerformanceTimings();

      if (ignoreDelayToFirstRequest) {
        startTimeMs = new BigDecimal(perfTimings.get("fetchStart"));
        pageTimingsComment =
            "Derived from window.performance.timing. " +
            "fetchStart used as navigationStartTime";
      } else {
        startTimeMs = new BigDecimal(perfTimings.get("navigationStart"));
        pageTimingsComment = "Derived from window.performance.timing.";
      }

      // Do we want 'xxxStart' or 'xxxEnd' timings here? Assume we want start of
      // each event, which should be before any page handlers fire.
      loadTimeMs = new BigDecimal(perfTimings.get("loadEventStart"));
      if (loadTimeMs.compareTo(BigDecimal.ZERO) == 0) {
        // Punt on using window.performance.timing data in this case.
        throw new NavigationTimingInformationUnavailableException("load event did not fire");
      }
      domContentLoadTimeMs = new BigDecimal(perfTimings.get("domContentLoadedEventStart"));

    } catch (NavigationTimingInformationUnavailableException e) {
      // Use devtools messages to derive the timings instead.
      logger.log(Level.WARNING, "Could not parse result of window.performance.timing {0}", e);
      logger.log(Level.WARNING, "Falling back to timing from devtools messages");
      // Reset all of the timings we collected so far.
      startTimeMs = null;
      loadTimeMs = null;
      domContentLoadTimeMs = null;

      if (ignoreDelayToFirstRequest) {
        HarResource firstResource = resources.get(getFirstRequest().getRequestId());
        try {
          startTimeMs = firstResource.response.getResponse().getTiming().getRequestTime();
          // Convert to milliseconds
          startTimeMs = startTimeMs.multiply(new BigDecimal(1000));
          pageTimingsComment = "Derived from devtools messages, ignoring time between " +
              "navigation start and first request";
        } catch (OptionalInformationUnavailableException oe) {
          throw new HarConstructionException("First request time unavailable", oe);
        }
      } else {
        startTimeMs = getFirstRequest().getTimestamp();
        // Convert to milliseconds
        startTimeMs = startTimeMs.multiply(new BigDecimal(1000));
        pageTimingsComment = "Derived from devtools messages";
      }

      if (lastPageLoadEvent == null) {
        logger.warning(
            "Cannot retrieve page load time because Page.loadEventFired message is unavailable.");
      } else {
        loadTimeMs = lastPageLoadEvent.getTimestamp();
        // Convert to milliseconds
        loadTimeMs = loadTimeMs.multiply(new BigDecimal(1000));
      }

      if (lastDomContentEvent == null) {
        logger.warning(
            "Cannot retrieve DOM content load time because Page.domContentEventFired message " +
            "is unavailable.");
      } else {
        domContentLoadTimeMs = lastDomContentEvent.getTimestamp();
        // Convert to milliseconds
        domContentLoadTimeMs = domContentLoadTimeMs.multiply(new BigDecimal(1000));
      }
    }

    pageTimings.put("navigationStartTime", new Long(startTimeMs.longValue()));
    this.navigationStartTime = startTimeMs.divide(new BigDecimal(1000));
    if (loadTimeMs != null) {
      BigDecimal loadTimeElapsed = loadTimeMs.subtract(startTimeMs);
      pageTimings.put("onLoad", new Long(loadTimeElapsed.longValue()));
    } else {
      logger.warning("onLoad time could not be determined");
      pageTimings.put("onLoad", new Long(-1L));
    }
    if (domContentLoadTimeMs != null) {
      BigDecimal domContentTimeElapsed = domContentLoadTimeMs.subtract(startTimeMs);
      pageTimings.put("onContentLoad", new Long(domContentTimeElapsed.longValue()));
    }
  }

  /**
   * Unwrap the gnarly JSON object sent back from window.performance.timing.
   * @return A Map from each property name to its value as a String.
   */
  @SuppressWarnings("unchecked")
  private Map<String, String> parsePerformanceTimings()
      throws NavigationTimingInformationUnavailableException {
    if (navigationTimingsMsg == null) {
      throw new NavigationTimingInformationUnavailableException(
          "No navigation timing information message received");
    }
    /* Format of the window.performance.timing response message:
     *
     * { "id": 153,
     *   "result": {
     *     "result": [
     *       { "name": "responseStart",
     *         "value": {
     *           "description": "1319662307432",
     *           "type": "number"
     *         }
     *       },
     *       { "name": "responseEnd",
     *         "value": {
     *           "description": "1319662307479",
     *           "type": "number"
     *         }
     *       }, ...
     *     ]
     *   }
     * }
     *
     */
    HashMap<String, String> retval = Maps.newHashMap();
    JSONArray result = navigationTimingsMsg.getResultAsJsonArray();
    for (Object item : result) {
      JSONObject itemObj = (JSONObject) item;
      String name = (String) itemObj.get("name");
      JSONObject value = (JSONObject) itemObj.get("value");
      String timestamp = (String) value.get("description");
      retval.put(name, timestamp);
    }
    return retval;
  }

  @SuppressWarnings("unchecked")
  private JSONArray createHarEntries() throws HarConstructionException {

    //    "entries": [
    //                {
    //                    "pageref": "page_0",
    //                    "startedDateTime": "2009-04-16T12:07:23.596Z",
    //                    "time": 50,
    //                    "request": {...},
    //                    "response": {...},
    //                    "cache": {...},
    //                    "timings": {},
    //                    "serverIPAddress": "10.0.0.1",
    //                    "connection": "52492",
    //                    "comment": ""
    //                }
    //            ]
    // Remove all incomplete entries from the map.
    List<Map.Entry<String, HarResource>> list = Lists.newArrayList();
    for (Map.Entry<String, HarResource> entry : resources.entrySet()) {
      if (entry.getValue().isComplete()) {
        list.add(entry);
      } else {
        NetworkRequestWillBeSentMessage request =
            entry.getValue().getNetworkRequestWillBeSentMessage();
        String description;
        if (request == null || request.getRequest() == null) {
          description = "an un-named resource";
        } else {
          description = request.getRequest().getUrl();
        }
        logger.log(Level.WARNING, "Not enough information to add {0} to HAR.", description);
      }
    }
    sortHarResources(list);
    JSONArray entries = new JSONArray();
    for (Map.Entry<String, HarResource> resource : list) {
      JSONObject entry = resource.getValue().createHarEntry();
      entries.add(entry);
    }
    return entries;
  }

  /** Sorts a list of HarResource map entries by resource request times. */
  void sortHarResources(List<Map.Entry<String, HarResource>> list) {
    Collections.sort(list, new Comparator<Map.Entry<String, HarResource>>() {
        @Override
        public int compare(Map.Entry<String, HarResource> o1, Map.Entry<String, HarResource> o2) {
          BigDecimal time1 = o1.getValue().getRequestTime();
          BigDecimal time2 = o2.getValue().getRequestTime();
          if (time1 == null) {
            time1 = new BigDecimal(Double.MIN_VALUE);
          }
          if (time2 == null) {
            time2 = new BigDecimal(Double.MIN_VALUE);
          }
          if (time1.compareTo(time2) < 0) {
            return -1;
          } else if (time2.compareTo(time1) < 0) {
            return 1;
          } else {
            return 0;
          }
        }
    });
  }

  /**
   * Logs the information received about each fetched resource. This includes the resource
   * ID, and details about the request, response, and loading of the resources.
   * @param printFullDevtoolsMessages Log the JSON from the corresponding developer tools messages
   */
  public synchronized void logResources(Level level, Boolean printFullDevtoolsMessages) {
    if (!logger.isLoggable(level)) {
      return;
    }
    for (Map.Entry<String, HarResource> resource : resources.entrySet()) {
      StringBuilder sb = new StringBuilder().append("resource ID: ").append(resource.getKey());
      if (resource.getValue() == null) {
        sb.append("\n  resource (null)");
      } else {
        if (resource.getValue().request == null) {
          sb.append("\n  request (null)");
        } else {
          if (printFullDevtoolsMessages) {
            sb.append("\n  request: ").append(resource.getValue().request.getJson().toJSONString());
          } else {
            sb.append("\n  request: received");
          }
        }
        if (resource.getValue().response == null) {
          sb.append("\n  response (null)");
        } else {
          if (printFullDevtoolsMessages) {
            sb.append("\n  response: ").append(
                resource.getValue().response.getJson().toJSONString());
          } else {
            sb.append("\n  response: received");
          }
        }
        if (resource.getValue().loaded == null) {
          sb.append("\n  loaded (null)");
        } else {
          if (printFullDevtoolsMessages) {
            sb.append("\n  loaded: ").append(resource.getValue().loaded.getJson().toJSONString());
          } else {
            sb.append("\n  loaded: received");
          }
        }
      }
      logger.log(level, sb.toString());
    }
  }
}
