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

import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.IBinder;
import android.preference.PreferenceManager;
import android.util.Log;

import java.util.Timer;
import java.util.TimerTask;

/**
 * A service to keep the agent alive. Agent periodically beacons on the
 * service (by calling startService) to indicate a healthy state. If the service does not receive
 * beacons from agent for at most (2 * KEEP_ALIVE_CHECKING_FREQUENCY_MS), it will restart the
 * main activity of the agent.
 */
public class KeepAliveService extends Service {
  private static final String TAG = "Velodrome:KeepAliveService";
  private Timer mTimer = new Timer("KeepAliveTimer");
  private boolean mAlive = true;
  private boolean mForceQuit = false;
  private int mRestartCount = 0;

  @Override
  public void onCreate() {
    super.onCreate();
    Log.i(TAG, "Service creating");

    // Start the timer to check agent periodically.
    TimerTask timerTask = new TimerTask() {
      @Override
      public void run() {
        checkAgent();
      }
    };
    mTimer.schedule(timerTask, 0, Config.KEEP_ALIVE_CHECKING_FREQUENCY_MS);
  }

  @Override
  public void onDestroy() {
    super.onDestroy();
    Log.i(TAG, "Service destroying");

    mTimer.cancel();
    mTimer = null;
  }

  @Override
  public IBinder onBind(Intent arg0) {
    // We do not allow clients to bind to the service
    return null;
  }

  @Override
  public synchronized int onStartCommand(Intent intent, int flags, int startId) {
    Log.i(TAG, "onStartCommand(sticky)");
    if (intent.getAction().equals(getString(R.string.intentNameQuitKeepAliveService))) {
      mForceQuit = true;
    } else {
      mForceQuit = false;
      mAlive = true;
    }
    return START_STICKY;
  }

  private synchronized void checkAgent() {
    if (mForceQuit) {
      Log.i(TAG, "Force quit. Stop self...");
      stopSelf();
      // stopSelf may not terminate the process. Force that.
      System.exit(0);
    } else if (mAlive) {
      mAlive = false;
    } else {
      // Check prefs
      SharedPreferences prefs = PreferenceManager.getDefaultSharedPreferences(getBaseContext());
      boolean disabled = prefs.getBoolean(getString(R.string.prefKeyDisableKeepAlive), false);

      if (disabled) {
        Log.i(TAG, "KeepAlive disabled. Stop self...");
        stopSelf();
      } else {
        ++mRestartCount;
        Log.i(TAG, "Restart velodrome agent (" + mRestartCount + ")");

        // Restart the agent
        Intent intent = new Intent(Velodrome.class.getName());
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getApplication().startActivity(intent);

        mAlive = true;
      }
    }
  }
}
