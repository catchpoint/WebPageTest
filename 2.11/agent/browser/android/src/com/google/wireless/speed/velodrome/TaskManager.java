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

import java.io.IOException;
import java.util.LinkedList;

import org.json.JSONException;


public class TaskManager {
  private static final int UI_DEFAULT_IMAGE_QUALITY = 90;

  private LinkedList<Task> mTasks = new LinkedList<Task>();

  private long mPollInterval = Config.DEFAULT_INTERVAL_BETWEEN_TASK_POLLS_MS;
  private long mNextTaskPollTimeMs = System.currentTimeMillis();
  private long mLastTaskPollTimeMs = System.currentTimeMillis();

  private AgentBehaviorDelegate mAgentBehaviorDelegate;

  public TaskManager(AgentBehaviorDelegate agentBehaviorDelegate) {
    mAgentBehaviorDelegate = agentBehaviorDelegate;
  }

  public long getLastTaskPollTimeMs() {
    return mLastTaskPollTimeMs;
  }

  public void resetPollTime() {
    mNextTaskPollTimeMs = System.currentTimeMillis();
  }

  public Task getNextTask() throws InterruptedException, IOException {
    while (true) {
      pollServerForTaskIfNeeded();

      synchronized (mTasks) {
        if (mTasks.size() == 0) {
          long now = System.currentTimeMillis();
          if (now < mNextTaskPollTimeMs) {
            // Note that while waiting, a task can be added manually from the UI at any time (and
            // in such an event, this thread will be notified and tasks.wait() will return).
            mTasks.wait(mNextTaskPollTimeMs - now);
          }
        }

        if (mTasks.size() > 0) {
          return mTasks.removeFirst();
        }
      }
    }
  }

  private void pollServerForTaskIfNeeded() throws IOException {
    long now = System.currentTimeMillis();
    if (now < mNextTaskPollTimeMs)
      return;

    boolean gotNewTask = false;
    try {
      mLastTaskPollTimeMs = now;
      gotNewTask = mAgentBehaviorDelegate.sendCheckinPing(this);

    } catch (JSONException e) {
      throw new IOException(e.toString());

    } finally {
      long currentTime = System.currentTimeMillis();
      if (gotNewTask) {
        mNextTaskPollTimeMs = currentTime;
      } else {
        mNextTaskPollTimeMs = currentTime + mPollInterval;
      }
    }
  }

  /**
   * Add task specific to the WebPageTest server.
   */
  public void addTaskFromWebPageTest(String id, String url, boolean repeatView,
                                     int runs, boolean captureVideo, int imageQuality) {
    addTaskImpl(id,
                url,
                true,  // Clear the cache.
                true,  // Clear cookies.
                true,  // Capture pcap.
                true,  // Capture screenshot.
                "",    // No proxy.
                "",    // No tag.
                repeatView,
                runs,
                captureVideo,
                imageQuality);
  }

  public void addTaskFromDeviceUI(String url) {
    addTaskImpl(null,  // No id
                url,
                false,  // Don't clear the cache.
                false,  // Don't clear cookies.
                true,   // Capture pcap.
                true,   // Capture screenshot.
                "",     // No proxy.
                "",     // No tag.
                false,  // Do not re-run with a warm cache.
                1,      // Do the measurement once.
                false,  // Don't capture video.
                UI_DEFAULT_IMAGE_QUALITY);   // Image quality.
  }

  /**
   * All addTaskFrom*() methods call this method.  It sets up a task with all
   * parameters that any system's agent can alter.
   */
  private void addTaskImpl(String taskId, String url, boolean clearCache,
                           boolean clearCookie, boolean capturePcap,
                           boolean captureScreenshot, String proxy,
                           String tag, boolean repeatView, int runs,
                           boolean captureVideo, int imageQuality) {
    Task task = new Task(taskId, url, clearCache, clearCookie,
                         capturePcap, captureScreenshot, proxy, tag,
                         repeatView, runs, captureVideo, imageQuality);
    synchronized (mTasks) {
      mTasks.add(task);
      mTasks.notifyAll();
    }
  }

  // TODO(skerner): Several parameters only make sense for webpagetest.  Encapsulate
  // them in an agent specific measurement class.
  public String submitTaskResult(Task task, UiMessageDisplay messageDisplay,
                                 int runNumber, boolean isCacheWarm,
                                 boolean isFinalMeasurement) throws IOException {
    String resultsUrl;

    resultsUrl = mAgentBehaviorDelegate.submitTaskResult(task, messageDisplay,
                                                         runNumber, isCacheWarm,
                                                         isFinalMeasurement);
    // Return the URL where a human can see the results.
    return resultsUrl;
  }

  public String getCheckInInfoMessage() {
    return mAgentBehaviorDelegate.getCheckInInfoMessage();
  }
}
