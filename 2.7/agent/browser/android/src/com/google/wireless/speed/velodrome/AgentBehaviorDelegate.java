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
import java.util.ArrayList;

import org.json.JSONException;

/**
 * Implementations of this interface perform work that depends on the system
 * the agent is doing work for.  For example, the server to get work from
 * and the way the response is parsed are different across systems.
 *
 * @author skerner
 */
public interface AgentBehaviorDelegate {

  // An immutable record of the settings for a single measurement.
  public class MeasurementParameters {
    private int mRunNumber;
    private boolean mShouldClearCache;

    public MeasurementParameters(int runNumber, boolean shouldClearCache) {
      mRunNumber = runNumber;
      mShouldClearCache = shouldClearCache;
    }
    public int runNumber() { return mRunNumber; }
    public boolean shouldClearCache() { return mShouldClearCache; }

    // Return a string unique to a measurement.  It should include every member
    // variable.
    public String getUniqueMeasurementString() {
      return String.format("%d%s",
                           mRunNumber,
                           (mShouldClearCache ? "" : "_Cached"));
    }
  }

  // Check in with our server.  Any tasks to be done are added by calling methods
  // of |taskManager|.  Return true if at least one task was fetched.
  public boolean sendCheckinPing(TaskManager taskManager)
      throws IOException, JSONException;

  // Submit the results of one measurement.  Return the URL where the results
  // can be viewed.
  public String submitTaskResult(Task task, UiMessageDisplay messageDisplay,
      int runNumber, boolean isCacheWarm, boolean isFinalMeasurement) throws IOException;

  // Return the URL of the server we query for work.  Shown in the UI, so that a
  // person setting up an agent can easily see that the correct server is being used.
  public String getCheckInInfoMessage();

  // If the system supports proxies, return an object that allows control of
  // proxy settings.  If proxies are not supported, return null.
  public ProxySettings getProxySettingsIfSupported();

  // Return the URL of the server from which work is fetched and to which
  // results are uploaded.
  public String serverUrl();

  // Is the server a local test instance?
  // TODO(skerner): This can be private within an implementation of this
  // interface once authentication becomes private.
  public boolean isLocalTestServer();

  // Should this app try to log in to its server?
  public boolean shouldAuthenticate();

  // Initiate authentication.  Block until authentication is done, or a timeout
  // is reached.  Return true if authentication succeeded.
  public boolean authenticateAndWait() throws InterruptedException;

  // Build the list of measurements to do for a given task.  These measurements
  // will be done in order.  This matters because a measurement that should be
  // done with a warn cache can be done by loading a page, then load the same
  // page again without clearing the cache.
  public ArrayList<MeasurementParameters> getAllMeasurementsForTask(Task task);
}
