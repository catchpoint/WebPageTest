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
    * Neither the name of Google Inc. nor the names of its contributors
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

package com.google.wireless.speed.velodrome;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import org.apache.http.HttpResponse;
import org.apache.http.HttpVersion;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.ContentEncodingHttpClient;
import org.apache.http.params.CoreProtocolPNames;
import org.apache.http.util.EntityUtils;

import com.google.wireless.speed.velodrome.VideoFrameGrabber.FrameRecord;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.os.Environment;
import android.util.Log;

/**
 * Class WebPageTestAgentBehaviorDelegate implements behaviors specific to
 * agents of the WebPageTest system.  For example, it reads preferences
 * that are WebPageTest specific.
 *
 * @author skerner
 */
public class WebPageTestAgentBehaviorDelegate implements AgentBehaviorDelegate {
  private static final String TAG = "Velodrome:WebPageTestAgentBehaviorDelegate";

  private static final String CHAR_ENCODING_UTF8 = "UTF-8";

  private static final String MIME_TYPE_JPEG = "image/jpeg";
  private static final String MIME_TYPE_PCAP = "application/vnd.tcpdump.pcap";
  private static final String URL_PATH_GET_WORK = "work/getwork.php";
  private static final String URL_PATH_POST_IMAGE = "work/resultimage.php";
  private static final String URL_PATH_POST_PCAP = "work/workdone.php";

  private static final String POST_FILENAME_SUFFIX_SCREEN_ONLOAD = "screen.jpg";
  private static final String POST_FILENAME_SUFFIX_SCREEN_DOC = "screen_doc.jpg";
  private static final String POST_FILENAME_SUFFIX_VIDEO_FRAME = "progress_%04d.jpg";
  private static final String POST_FILENAME_SUFFIX_PCAP = "tcpdump.pcap";

  private static final String SOFTWARE_URL_PARAM_ANDROID = "android";

  private static final int DEFAULT_IMAGE_QUALITY = 90;

  // |mContext| and |mPrefs are set by the constructor.  They are used to get
  // preferences that control server interaction, such as the server's URL
  // and the location this agent does measurements for.
  Context mContext;
  SharedPreferences mPrefs;

  // Saved pref values.  We only read from prefs at construction and check in,
  // so that values do not change while doing a measurement.
  String mServerUrl;
  String mLocation;
  String mKey;
  String mPc;

  // Constructor must run on UI thread.
  public WebPageTestAgentBehaviorDelegate(Context context, SharedPreferences prefs) {
    mContext = context;
    mPrefs = prefs;

    // We will read prefs before each check in.  Read them here so that any problems
    // reading them will show up at launch.
    updateSettingsFromPrefs();
  }

  // Build a URL from the string in prefs.  Add protocol and trailing slash to
  // a host name.
  private String normalizeUrlFromPrefValue(String urlFromPref) {
    StringBuilder urlBuilder = new StringBuilder();
    if (!urlFromPref.startsWith("http://") &&
        !urlFromPref.startsWith("https://")) {
      urlBuilder.append("http://");
    }

    urlBuilder.append(urlFromPref);

    if (!urlFromPref.endsWith("/"))
      urlBuilder.append("/");

    return urlBuilder.toString();
  }

  // Read prefs.  Must run on UI thread.
  private void updateSettingsFromPrefs() {
    String serverUrlPrefValue = mPrefs.getString(
        mContext.getString(R.string.prefKeyWptServer),
        "http://staging.webpagetest.org");
    mServerUrl = normalizeUrlFromPrefValue(serverUrlPrefValue);

    mLocation = mPrefs.getString(
        mContext.getString(R.string.prefKeyWptLocation),
        "default_mobile");

    mKey = mPrefs.getString(mContext.getString(R.string.prefKeyWptKey), "");

    mPc = mPrefs.getString(mContext.getString(R.string.prefKeyWptPc), "");

    // TODO(skerner): Better validation.  For example, an empty location should
    // be an error.
  }

  @Override
  public boolean sendCheckinPing(TaskManager taskManager) throws IOException {
    // Update prefs before checking in.  Do not update them again until the
    // next check in.  This prevents the pref values we use from changing
    // while a measurement runs.
    updateSettingsFromPrefs();

    // Ask the server for work.  Will throw on network errors.
    String workResponse = getWorkFromServer();

    // Parse the response.  Add tasks from the response to |taskManager|.
    boolean gotTasks = (parseGetWorkResponse(workResponse, taskManager) > 0);
    return gotTasks;
  }

  // Construct the name a file should have on the server, based on run number,
  // cache state, etc.
  private String fileNameForUpload(int runNumber, boolean isCacheWarm, String fileSuffix) {
    StringBuilder resultBuilder = new StringBuilder();

    resultBuilder.append(runNumber);
    resultBuilder.append("_");
    if (isCacheWarm)
      resultBuilder.append("Cached_");
    resultBuilder.append(fileSuffix);

    return resultBuilder.toString();
  }

  private File writeBitmapToFile(Bitmap bitmap, String fileNameForUpload,
                                 int imageQuality) {

    File externalStorageDir = Environment.getExternalStorageDirectory();
    File tempFile;
    try {
      tempFile = File.createTempFile(fileNameForUpload, ".tmp", externalStorageDir);
    } catch (IOException ex) {
      Log.e(TAG, "Error creating temp file to store file " + fileNameForUpload +
                 " for upload: ", ex);
      return null;
    }

    FileOutputStream fos;
    try {
      fos = new FileOutputStream(tempFile);
    } catch (FileNotFoundException ex) {
      Log.e(TAG, "File can not be written, because it already exists.  " +
                 "Path is " + tempFile);
      return null;
    }

    bitmap.compress(Bitmap.CompressFormat.JPEG, imageQuality, fos);
    try {
      fos.flush();
      fos.close();
    } catch (IOException e) {
      Log.e(TAG, "Failed to flush or close file at path " + tempFile);
      return null;
    }

    return tempFile;
  }

  @Override
  public String submitTaskResult(Task task, UiMessageDisplay messageDisplay,
                                 int runNumber, boolean isCacheWarm,
                                 boolean isTaskDone) throws IOException {
    if (task.shouldCaptureScreenshot()) {
      // Upload onload screenshot.
      String screenAtOnloadFileName =
          fileNameForUpload(runNumber, isCacheWarm, POST_FILENAME_SUFFIX_SCREEN_ONLOAD);

      File screenAtOnloadTmpFile = writeBitmapToFile(task.getResult().getScreenshot(),
                                                     screenAtOnloadFileName,
                                                     task.imageQuality());
      if (screenAtOnloadTmpFile != null) {
        uploadJpegImage(screenAtOnloadFileName, screenAtOnloadTmpFile, task.getId());

        // Upload the ondoccomplete screenshot.
        // TODO(skerner): Implement the fully loaded event detection and its
        // corresponding screen capture event instead of reusing the onload
        // screenshot.
        String screenAtDocCompleteFileName =
            fileNameForUpload(runNumber, isCacheWarm, POST_FILENAME_SUFFIX_SCREEN_DOC);

        uploadJpegImage(screenAtDocCompleteFileName, screenAtOnloadTmpFile,
                        task.getId());
      }
    }

    // Submit the video frames captured.
    if (task.captureVideo()) {
      ArrayList<FrameRecord> videoFrameRecords = task.getResult().getVideoFrameRecords();
      if (videoFrameRecords != null) {
        for (VideoFrameGrabber.FrameRecord frameRecord : videoFrameRecords) {
          Bitmap frame = frameRecord.getFrame();
          if (frame == null) {
            Log.w(TAG, "Failed to capture frame at time " +
                       frameRecord.getMsSinceStart() + " ms.");
            continue;
          }

          // Video frame files encode the time since loading started in their
          // file name.  This allows the server to construct a video of the page
          // loading.  The format is:
          //   <run-prefix>_progress_<zero-padded-time-from-start>.jpg
          // The time is represented as number of 100ms intervals
          // elapsed from the start of the load.
          // So, we divide the timeFromStartMs by 100.
          int timeFromStartTenthsOfSeconds =
              (int)(frameRecord.getMsSinceStart() / 100L);

          String frameFileSuffix = String.format(POST_FILENAME_SUFFIX_VIDEO_FRAME,
                                                 timeFromStartTenthsOfSeconds);
          String frameFileNameForUpload = fileNameForUpload(runNumber, isCacheWarm,
                                                            frameFileSuffix);

          File videoFrameTmpFile = writeBitmapToFile(frame,
                                                     frameFileNameForUpload,
                                                     task.imageQuality());
          if (videoFrameTmpFile == null)
            continue;  // Error was already logged by writeBitmapToFile().

          uploadJpegImage(frameFileNameForUpload, videoFrameTmpFile,
                          task.getId());
        }
      }
    }

    // Submit tcpdump data.
    if (task.shouldCapturePcap()) {
      File pcapFile = task.getResult().getPcapFile();
      if (pcapFile == null) {
        Log.e(TAG, "Failed to capture pcap.  Will skip pcap upload.  Look at " +
                   "the logs to see if an error prevented tcpdump from running.");
      } else {
        String pcapFileNameForUpload = fileNameForUpload(runNumber, isCacheWarm,
                                                         POST_FILENAME_SUFFIX_PCAP);
        Log.v(TAG, "Posting pcap : " + pcapFile.getName() + " : " + pcapFile.length());
        int onLoadMs = Integer.parseInt(task.getResult().getTimings().get("onLoad"));

        uploadPcap(pcapFileNameForUpload, pcapFile, task.getId(), task.getUrl(),
                   runNumber, isCacheWarm, onLoadMs, isTaskDone);
      }
    }

    String resultsUrl = mServerUrl + "/result/" + task.getId();
    return resultsUrl;
  }

  @Override
  public String getCheckInInfoMessage() {
    return ("Getting work from server " + mServerUrl + ".  " +
            "Agent's location is set to '" + mLocation + "'.");
  }

  /**
   * Ask the server for work.  Return the response as a string.
   *
   * @return String
   */
  public String getWorkFromServer() throws IOException {
    HttpClient client = new ContentEncodingHttpClient();
    client.getParams().setParameter(CoreProtocolPNames.PROTOCOL_VERSION,
                                    HttpVersion.HTTP_1_1);

    StringBuilder urlBuilder = new StringBuilder();
    urlBuilder.append(mServerUrl);
    urlBuilder.append(URL_PATH_GET_WORK);

    urlBuilder.append("?software=").append(SOFTWARE_URL_PARAM_ANDROID);
    urlBuilder.append("&location=").append(mLocation);
    if (mKey.length() > 0)
      urlBuilder.append("&key=").append(mKey);

    if (mPc.length() > 0)
      urlBuilder.append("&pc=").append(mPc);

    String url = urlBuilder.toString();
    Log.v(TAG, "Fetching url to get work: " + url);
    HttpGet get = new HttpGet(url);

    String response = EntityUtils.toString(client.execute(get).getEntity(),
                                           CHAR_ENCODING_UTF8);
    Log.v(TAG, "Got checkin reply: " + response);
    return response;
  }

  // Most POST requests have a common set of parameters, used to allow the server
  // to identify the agent doing the upload.  Add these parameter to a post builder.
  private void addCommonParamersToPost(WebPageTestPostBuilder postBuilder, String taskId)
      throws UnsupportedEncodingException {
    postBuilder.addStringParam("location", mLocation);
    postBuilder.addStringParam("key", mKey);
    postBuilder.addStringParam("id", taskId);
  }

  private void uploadJpegImage(String fileName, File filePath, String taskId)
      throws IOException {
    WebPageTestPostBuilder imagePost = new WebPageTestPostBuilder();
    addCommonParamersToPost(imagePost, taskId);
    imagePost.addFileContents("file", fileName, filePath, MIME_TYPE_JPEG);

    String url = mServerUrl + URL_PATH_POST_IMAGE;
    HttpResponse httpResponse = imagePost.doPost(url);

    Log.v(TAG, "Response status line : " + httpResponse.getStatusLine());
    String response = EntityUtils.toString(httpResponse.getEntity(), CHAR_ENCODING_UTF8);
    Log.v(TAG, "Response body : " + response);
  }

  // Parse a response from a request for work.  Return the number of tasks
  // requested.
  private int parseGetWorkResponse(String workResponse, TaskManager taskManager) {
    Map<String, String> configParams = new HashMap<String, String>();

    if (workResponse == null || "".equalsIgnoreCase(workResponse))
      return 0;

    Log.v(TAG, "About to parse " + workResponse);

    // Break the string into key-value pairs.
    String[] paramValues = workResponse.split("\\\n");
    for (String paramValue : paramValues) {
      String[] paramValuePair = paramValue.split("=");
      if (2 == paramValuePair.length) {
        configParams.put(paramValuePair[0].trim(), paramValuePair[1].trim());
      }
    }

    // Look for specific keys in the map of key value pairs.

    // Without a URL, no measurements can be done.
    if (!configParams.containsKey("url"))
      return 0;

    String id = configParams.get("Test ID");
    String url = configParams.get("url");
    boolean repeatView = true;
    int runs = 1;
    boolean captureVideo = false;
    int imageQuality = DEFAULT_IMAGE_QUALITY;

    if (configParams.containsKey("fvonly")) {
      int fvonlyValue = Integer.parseInt(configParams.get("fvonly"));
      if (fvonlyValue == 1) {
         repeatView = false;
      }
    }
    if (configParams.containsKey("runs")) {
      runs = Integer.parseInt(configParams.get("runs"));
    }

    if (configParams.containsKey("Capture Video")) {
      if ("1".equalsIgnoreCase(configParams.get("Capture Video"))) {
        captureVideo = true;
      }
    }

    if (configParams.containsKey("iq")) {
      // Clamp the image quality value to the range 0-100.  Server
      // Should not send other values.  Log if we see such a value.
      int rawImageQuality = Integer.parseInt(configParams.get("iq"));
      imageQuality = Math.max(Math.min(rawImageQuality, 100), 0);
      if (rawImageQuality != imageQuality) {
        Log.e(TAG, "Image quality must be in the range 0..100.  Value " +
                    rawImageQuality + " clamped to " + imageQuality + ".");
      }
    }

    taskManager.addTaskFromWebPageTest(id, url, repeatView, runs, captureVideo, imageQuality);
    return 1;
  }

  private void uploadPcap(String fileNameOnServer, File pcapPath, String taskId,
                          String urlUnderTest,
                          int runNumber, boolean isCacheWarm,
                          int onloadTimeMs, boolean isFinalMeasurement)  throws IOException {
    WebPageTestPostBuilder pcapPost = new WebPageTestPostBuilder();

    addCommonParamersToPost(pcapPost, taskId);

    pcapPost.addFileContents("file", fileNameOnServer, pcapPath, MIME_TYPE_PCAP);

    pcapPost.addBooleanParamIfTrue("pcap", true);
    pcapPost.addIntegerParam("_runNumber", runNumber);
    pcapPost.addBooleanParamAlways("_cacheWarmed", isCacheWarm);
    pcapPost.addIntegerParam("_docComplete", onloadTimeMs);
    pcapPost.addStringParam("_urlUnderTest", urlUnderTest);
    pcapPost.addBooleanParamIfTrue("done", isFinalMeasurement);

    // WebPageTest supports two versions of pcap2har: A stable version and a
    // Bleeding edge version.  As of Feb 2012, the stable version is unusably
    // buggy for the pcaps we generate from tcpdump on android.  For now,
    // always use the latest version.
    // TODO(skerner): Make this a pref when the stable version is made usable.
    pcapPost.addBooleanParamIfTrue("useLatestPCap2Har", true);

    HttpResponse httpResponse = pcapPost.doPost(mServerUrl + URL_PATH_POST_PCAP);

    Log.v(TAG, "PCap upload response status line : " + httpResponse.getStatusLine());
    String response = EntityUtils.toString(httpResponse.getEntity(), CHAR_ENCODING_UTF8);
    response = response.replace("\n", "");
    Log.v(TAG, "PCap upload response content : " + response);
  }

  @Override
  public ProxySettings getProxySettingsIfSupported() {
    // WebpageTest does not support proxies.
    return null;
  }

  @Override
  public String serverUrl() {
    return mServerUrl;
  }

  @Override
  public boolean isLocalTestServer() {
    // WebpageTest has no concept of a local test server.
    return false;
  }

  @Override
  public boolean shouldAuthenticate() {
    // WebpageTest does not require authentication to its server.
    return false;
  }

  @Override
  public boolean authenticateAndWait() throws InterruptedException {
    // WebpageTest does not require authentication to its server.
    return true;  // We are always as logged in as we need to be.
  }

  @Override
  public ArrayList<MeasurementParameters> getAllMeasurementsForTask(Task task) {
    int totalNumRuns = task.getRuns();
    boolean firstViewOnly = !task.shouldRunRepeatView();

    // If we only run "first view" (i.e. cold cache), then there is one
    // measurement for each run.  If running in "repeat view" mode, we do two
    // measurements:  One with a cleared cache, and then again without clearing
    // it, so that the cache is warm.
    int totalMeasurements = totalNumRuns * (firstViewOnly ? 1 : 2);

    ArrayList<MeasurementParameters> measurements =
        new ArrayList<MeasurementParameters>(totalMeasurements);

    for (int runNum = 1; runNum <= totalNumRuns; ++runNum) {
      // Always measure with a cold cache.
      measurements.add(new MeasurementParameters(runNum, true));

      if (!firstViewOnly) {
        // This measurement will not clear the cache, and the last measurement
        // was of the same URL.  This ensures the cache is warm.
        measurements.add(new MeasurementParameters(runNum, false));
      }
    }

    assert measurements.size() == totalMeasurements : "Unexpected number of measurents.";
    return measurements;
  }

}
