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

import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.os.ConditionVariable;
import android.util.Log;

import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.util.Iterator;

import com.google.wireless.speed.velodrome.AgentBehaviorDelegate.MeasurementParameters;

public class WorkerThread extends Thread {
  private static final String TAG = "Velodrome:WorkerThread";

  private volatile boolean mStopRequested = false;
  private final Velodrome mVelodrome;
  private final TaskManager mTaskManager;
  private final Browser mBrowser;
  private long mAuthIntervalMs = Config.MIN_SLEEP_INTERVAL_AUTHENTICATION_MS;

  // Responsible for launching and killing tcpdump
  private TcpdumpRunner mTcpdumpRunner = null;

  // Network interface name which to capture with tcpdump
  private String mTcpdumpInterface = null;

  // Where to capture tcpdump output, if it's installed
  private File mCurrentPcapFile = null;

  // Manage the HTTP proxy configuration of the device.
  // Will be null if the system we work for does not support proxies.
  private final ProxySettings mProxySettings;

  // Delegate used to determine what this app should do, based on the system
  // we are doing measurements for.
  private AgentBehaviorDelegate mAgentBehaviorDelegate;

  public WorkerThread(Velodrome velodrome,
                      TaskManager taskManager,
                      Browser browser,
                      AgentBehaviorDelegate agentBehaviorDelegate) {
    mVelodrome = velodrome;
    mTaskManager = taskManager;
    mBrowser = browser;
    mProxySettings = agentBehaviorDelegate.getProxySettingsIfSupported();
    mAgentBehaviorDelegate = agentBehaviorDelegate;
  }

  public synchronized void requestStop() {
    mStopRequested = true;
    notifyAll();
    interrupt();
  }

  public synchronized boolean isStopRequested() {
    return mStopRequested;
  }

  @Override
  public void run() {
    Log.i(TAG, "workThread started.");

    mVelodrome.showMessage("Velodrome Agent started.");
    while (!isStopRequested()) {
      try {
        if (mAgentBehaviorDelegate.shouldAuthenticate()) {
          String msg = "Login to " + mAgentBehaviorDelegate.serverUrl() + "...";
          Log.i(TAG, msg);
          mVelodrome.showMessage(msg);
          mVelodrome.setUrlEdit(false, "");  // Disallow user input until authentication is done.
          boolean authSuccess = mAgentBehaviorDelegate.authenticateAndWait();
          if (authSuccess) {
            mTaskManager.resetPollTime();
          } else {
            throw new NotLoggedInException();
          }
        } else {
          String checkInInfoMessage = mTaskManager.getCheckInInfoMessage();
          mVelodrome.showMessage(checkInInfoMessage);
          mVelodrome.setUrlEdit(true, "");  // Ready to accept tasks, allow user input now.
          Task task = mTaskManager.getNextTask();
          if (task == null) {
            mVelodrome.showMessage("No work to do.");
          } else {
            lockScreenOrientationAndExecuteTask(task);
          }
          mAuthIntervalMs = Config.MIN_SLEEP_INTERVAL_AUTHENTICATION_MS;
        }
      } catch (NotLoggedInException notLoggedInEx) {
        String errMsg = notLoggedInEx +
            "<br><br><strong>Authentication will be retried in " + (mAuthIntervalMs / 1000) +
            " seconds. Or you can restart the app now to trigger re-authentication.</strong>";
        Log.e(TAG, errMsg, notLoggedInEx);
        mVelodrome.showMessage(errMsg, UiMessageDisplay.TEXT_COLOR_RED);
        synchronized (this) {
          try {
            wait(mAuthIntervalMs);
          } catch (InterruptedException e) {
            // no-op.
          }
        }
        mAuthIntervalMs = Math.min(2 * mAuthIntervalMs, Config.MAX_SLEEP_INTERVAL_AUTHENTICATION_MS);
      } catch (IOException ioe) {
        String errMsg = "Error occurred. " + ioe;
        Log.e(TAG, errMsg, ioe);
        mVelodrome.showMessage(errMsg, UiMessageDisplay.TEXT_COLOR_RED);
      } catch (InterruptedException ignored) {
        Log.i(TAG, "WorkerThread interrupted. stopRequested=" + mStopRequested);
      } catch (ProxySettingsException e) {
        String errMsg = "Proxy error occurred. " + e;
        Log.e(TAG, "Setting the proxy failed. ", e);
        mVelodrome.showMessage(errMsg, UiMessageDisplay.TEXT_COLOR_RED);
      }
    }

    Log.i(TAG, "workThread stopped.");
  }

  /**
   * Locks screen orientation, executes the task and then unlocks screen orientation.
   * @param task
   * @throws InterruptedException
   * @throws IOException
   */
  private void lockScreenOrientationAndExecuteTask(Task task)
      throws InterruptedException, IOException, RuntimeException, IllegalStateException {
    int savedRequestedOrientation = mVelodrome.getRequestedOrientation();
    try {
      // Lock the orientation, otherwise an orientation change causes the activity to restart
      // (and make current measurement invalid).
      int currentOrientation = mVelodrome.getResources().getConfiguration().orientation;
      if(currentOrientation == Configuration.ORIENTATION_LANDSCAPE) {
        mVelodrome.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
      } else if(currentOrientation == Configuration.ORIENTATION_PORTRAIT) {
        mVelodrome.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
      } else {
        mVelodrome.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_NOSENSOR);
      }

      Iterator<MeasurementParameters> measurementIterator =
          mAgentBehaviorDelegate.getAllMeasurementsForTask(task).iterator();
      while(measurementIterator.hasNext()) {
        MeasurementParameters currentMeasurement = measurementIterator.next();
        boolean isFinalMeasurement = !measurementIterator.hasNext();
        executeTask(task, currentMeasurement, isFinalMeasurement);
      }
 
    } finally {
      mVelodrome.setRequestedOrientation(savedRequestedOrientation);
    }
  }

  /**
   * Performs the actions necessary to complete the given task
   * @param task
   * @param runNumber run-number applicable in WebPageTest mode
   * @param cached whether cache was warm.
   * @param done whether to post result, applicable in WebPageTest mode.
   * @throws InterruptedException
   * @throws IOException
   */
  private void executeTask(Task task,
                           MeasurementParameters measurement,
                           boolean isFinalMeasurement)
      throws InterruptedException, IOException,
             RuntimeException, IllegalStateException {
    String msg = "Measuring " + task.getUrl() + " ...";
    mVelodrome.showMessage(msg, UiMessageDisplay.TEXT_COLOR_ORANGE);
    mVelodrome.setUrlEdit(false, msg);

    Log.i(TAG, "execute task: " + msg);

    URL oldProxySetting = null;
    // Set the proxy if one was requested otherwise remove the existing one
    // Note: Only Wifi proxy is supported at this time.
    // TODO(skerner): Check with qfang for a long-term solution.
    if (mProxySettings != null && ProxySettings.deviceCanProxy()) {
      oldProxySetting = mProxySettings.getHttpProxy();
      if (task.needsProxy()) {
        URL proxyUrl = new URL(task.getProxy());
        Log.i(TAG, "Old proxy settings are: " + oldProxySetting);
        mProxySettings.setHttpProxy(proxyUrl);
      } else {
        mProxySettings.disableProxy();
      }
    } else if (task.needsProxy()) {
      throw new RuntimeException("A proxy was required, but this device does not support proxies.");
    }

    boolean forceStop = false;
    try {
      if (task.shouldCapturePcap()) {
        startTcpdump(task, measurement);
      }
      // Sleep for a tiny bit while the UI thread finishes showing the message
      Thread.sleep(Config.UI_TRANSITION_WAIT_MS);

      // Make the UI thread run the first part of the task
      ConditionVariable cv = new ConditionVariable();
      mBrowser.setCondition(cv);
      mVelodrome.runOnUiThread(
          new BrowserStart(task, measurement.shouldClearCache()));
      cv.block(Config.TOTAL_PAGE_LOAD_MS);
      cv.close();

      // Need to let the page render.  The UI thread's run loop must be free to
      // run, so we sleep on the worker thread.
      Thread.sleep(Config.PICTURE_RENDER_WAIT_TIME_MS);
      mBrowser.setCondition(cv);
      mVelodrome.runOnUiThread(new BrowserFinish(task));
      cv.block(Config.SCREEN_SHOT_WAIT_MS);
      cv.close();

    } catch (InterruptedException interrupedEx) {
      forceStop = true;
      throw interrupedEx;
    } finally {
      if (!forceStop) {
        Thread.sleep(Config.POST_PAGE_LOAD_SLEEP_TIME_MS);
      }
      if (task.shouldCapturePcap()) {
        stopTcpdump(task, forceStop);
      }
      if (mProxySettings != null && ProxySettings.deviceCanProxy()) {
        mProxySettings.setHttpProxy(oldProxySetting);
      }
    }
    String detailPageUrl = "";

    // Submit results to the server.
    detailPageUrl = mTaskManager.submitTaskResult(
        task, mVelodrome, measurement.runNumber(), !measurement.shouldClearCache(),
        isFinalMeasurement);

    String proxyMessage = (task.getProxy() != null && !task.getProxy().equals("")) ?
        ("With proxy " + task.getProxy() + "<br>") : "";
    msg = "Successfully measured " + task.getUrl() + "<br>" +
        proxyMessage +
        "onLoad time is " + task.getResult().getTimings().get("onLoad") + "ms. " +
        "onContentLoad time is " + task.getResult().getTimings().get("onContentLoad") + "ms. " +
        "See result at <a href=\"" + detailPageUrl + "\">" + detailPageUrl + "</a>.";
    mVelodrome.showMessage(msg);
    mVelodrome.setUrlEdit(true, "");
  }

  /**
   * Tried to create a TcpdumpRunner if tcpdump is installed.
   * @throws IOException
   */
  private void initTcpdumpRunner() throws IOException {
    TcpdumpRunner runner = new TcpdumpRunner(PhoneUtils.getPhoneUtils());
    if (runner.isInstalled()) {
      mTcpdumpInterface = PhoneUtils.getPhoneUtils().getActiveUpInterfaceName();
      if (mTcpdumpInterface != null) {
        mTcpdumpRunner = runner;
      } else {
        throw new IOException("cannot determine active network interface, not starting tcpdump");
      }
    } else {
      String errMsg = "Warning: tcpdump not installed. Measurement will continue, but will " +
                      "not capture network.";
      Log.e(TAG, errMsg);
      mVelodrome.showMessage(errMsg, "red");
    }
  }

  private void startTcpdump(Task task, MeasurementParameters measurement) throws IOException {
    initTcpdumpRunner();

    if (mTcpdumpRunner != null) {
      assert mTcpdumpInterface != null;

      assert mCurrentPcapFile == null
          : "Can't start tcpdump without stopping the last one.";
      mCurrentPcapFile = new File(
          PhoneUtils.getGlobalContext().getFilesDir(),
          "tcpdump_" + measurement.getUniqueMeasurementString() + ".pcap");

      mTcpdumpRunner.launch(mTcpdumpInterface, mCurrentPcapFile);
      Log.i(TAG, "Tcpdump started.");
    }
  }

  private void stopTcpdump(Task task, boolean forceStop) throws IOException {
    Log.i(TAG, "Stopping tcpdump...");
    if (mCurrentPcapFile == null) {
      Log.e(TAG, "Stopping Tcpdump, but it was not running???");
    }

    if (mTcpdumpRunner != null) {
      mTcpdumpRunner.stop();
      if (task != null) {
        assert task.getResult() != null;
        task.setPcapFile(mCurrentPcapFile);
      }
    }
  }

  private class BrowserStart implements Runnable {
    private final Task task;
    private final boolean clearCache;

    public BrowserStart(Task task, boolean clearCache) {
      this.task = task;
      this.clearCache = clearCache;
    }

    @Override
    public void run() {
      try {
        mBrowser.loadPageAndMeasureLatency(task, clearCache);
      } catch (InterruptedException ex) {
        Log.w(TAG, "Page load interrupted.", ex);
        // The worker thread will crash properly when it finds that task
        // results were not set.
      }
    }
  }

  private class BrowserFinish implements Runnable {
    private final Task task;

    public BrowserFinish(Task task) {
      this.task = task;
    }

    @Override
    public void run() {
      try {
        mBrowser.finishExecutingTask(task);
      } catch (Exception ex) {
        Log.w(TAG, "finishExecutingTask interrupted.", ex);
        // The worker thread will crash properly when it finds that task
        // results were not set.
      }
    }
  }
}
