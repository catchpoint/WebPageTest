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

import android.util.Log;

public class Config {
  public static final String TAG = "Velodrome:Config";

  // Which system is this program an agent for?
  public enum AgentType {
    WebPageTest
  };

  public static void agentTypeChangedByPref(String agentTypeString) {
    sAgentType = AgentType.valueOf(agentTypeString);
    if (sAgentType == null) {
      Log.e(TAG, "Unexpected aget type from prefs: " + agentTypeString);
    }
  }

  public static final int DEFAULT_INTERVAL_BETWEEN_TASK_POLLS_MS = 20 * 1000;
  public static final int MAX_INTERVAL_BETWEEN_TASK_POLLS_MS = 30 * 60 * 1000;
  public static final int MIN_SLEEP_INTERVAL_AUTHENTICATION_MS = 10 * 1000;
  public static final int MAX_SLEEP_INTERVAL_AUTHENTICATION_MS = 4 * 60 * 60 * 1000;
  public static final int RECONNECT_WAIT_INTERVAL_MS = 2000;
  public static final int WIFI_RECONNECT_TRIES = 3;

  // Time to sleep before loading a page. This interval is to give the
  // browser some time to cool down (stop any activities related to last
  // page load), and give the tcpdump process to fully launch.
  public static final int PRE_PAGE_LOAD_SLEEP_TIME_MS = 3 * 1000;
  public static final int PAGE_LOAD_TIMEOUT_MS = 5 * 60 * 1000;
  // Time to sleep after loading a page. The main purpose of this interval
  // is for tcpdump to flush data to file system.
  public static final int POST_PAGE_LOAD_SLEEP_TIME_MS = 20 * 1000;

  // Time to sleep while waiting for the UI thread to finish
  // its last operation before tying up the thread
  public static final int UI_TRANSITION_WAIT_MS = 1000;

  public static final int PICTURE_RENDER_WAIT_TIME_MS = 20 * 1000;

  // Maximum time for WorkerThread to sleep while waiting
  // for the UI thread to finish loading the page
  public static final int TOTAL_PAGE_LOAD_MS =
      PRE_PAGE_LOAD_SLEEP_TIME_MS +
      PAGE_LOAD_TIMEOUT_MS +
      POST_PAGE_LOAD_SLEEP_TIME_MS;

  // Maximum time the WorkerThread should wait for the UI thread to take
  // a screen shot.
  public static final int SCREEN_SHOT_WAIT_MS = 1000;

  // Time to wait before running a shell command.
  public static final int DELAY_BEFORE_EXEC_MS = 500;

  // Time interval the agent beacons the KeepAliveService.
  public static final int AGENT_BEACON_FREQUENCY_MS = 10 * 1000;
  // Time interval that KeepAliveService checks if agent is alive.
  public static final int KEEP_ALIVE_CHECKING_FREQUENCY_MS = 30 * 1000;
  // Time interval that agent will terminate itself if worker thread does
  // not check in
  public static final int WORKER_CHECKIN_MAXIMUM_MS = 4 * PAGE_LOAD_TIMEOUT_MS;

  // Notification IDs
  public static final int NOTIFICATION_AGENT_RUNNING = 1;

  // Constants for measurement features that we support
  public static final String CLEAR_CACHE = "clear_cache";
  public static final String CLEAR_COOKIE = "clear_cookie";
  public static final String CAPTURE_PCAP = "capture_pcap";
  public static final String CAPTURE_SCREENSHOT = "capture_screenshot";
  public static final String PROXY = "proxy";

  public static final String[] STATIC_FEATURES =
      new String[] {CLEAR_CACHE, CLEAR_COOKIE, CAPTURE_PCAP, CAPTURE_SCREENSHOT};

  // Max number of history messages to show on the main UI screen.
  public static final int MAX_NUM_MESSAGES_ON_UI = 128;

  //************************************************************************
  private static String sAgentVersion = "";
  private static AgentType sAgentType = AgentType.WebPageTest;

  private Config() {}

  public static synchronized String getAgentVersion() {
    return sAgentVersion;
  }

  public static synchronized void setAgentVersion(String ver) {
    sAgentVersion = ver;
  }
}
