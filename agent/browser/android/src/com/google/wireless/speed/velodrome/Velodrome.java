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

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.PackageManager.NameNotFoundException;
import android.os.Bundle;
import android.preference.PreferenceManager;
import android.util.Log;
import android.view.KeyEvent;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.webkit.WebView;
import android.widget.EditText;
import android.widget.TextView;

import com.google.wireless.speed.velodrome.Config.AgentType;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Timer;
import java.util.TimerTask;

import org.apache.commons.io.FileUtils;

public class Velodrome extends Activity implements UiMessageDisplay {
  private static final String TAG = "Velodrome";

  private static final String SAVED_STATE_KEY_HISTORY_MESSAGES = "HISTORY_MESSAGES";
  private static final SimpleDateFormat LOG_MSG_DATE_FORMATTER =
      new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

  private WorkerThread mWorkerThread = null;
  private TaskManager mTaskManager = null;
  private Browser mBrowser = null;
  private Timer mTimer = null;
  private ArrayList<String> mUiDisplayHistoryMessages = null;
  private AgentBehaviorDelegate mAgentBehaviorDelegate = null;

  @Override
  protected void onCreate (Bundle savedInstanceState) {
    Log.i(TAG, "onCreate()");

    super.onCreate(savedInstanceState);

    if (savedInstanceState != null) {
      mUiDisplayHistoryMessages = savedInstanceState.getStringArrayList(
          SAVED_STATE_KEY_HISTORY_MESSAGES);
    }
    if (mUiDisplayHistoryMessages == null) {
      mUiDisplayHistoryMessages = new ArrayList<String>();
    }

    Config.setAgentVersion(getAppVersion());
    setContentView(R.layout.main);
    updateNotification();
  }

  private File createAppCacheDir() {
    File appCacheRoot = getApplicationContext().getDir("appcache",
                                                       Context.MODE_PRIVATE);

    // If the directory is not empty, remove its contents.
    if (appCacheRoot.listFiles().length != 0 || true) {
      boolean success = FileUtils.deleteQuietly(appCacheRoot);
      if (!success) {
        Log.e(TAG, "Failed to remove old appcache data.");
      }

      // Recreate the app cache directory.
      appCacheRoot = getApplicationContext().getDir("appcache",
                                                    Context.MODE_PRIVATE);
    }

    // Mark the directory for removal on exit.  This is not a sure thing,
    // because it will not be done if the app crashes or the battery dies.
    try {
      FileUtils.forceDeleteOnExit(appCacheRoot);
    } catch (IOException ex) {
      Log.e(TAG, "Failed to mark app cache for deletion on process exit.", ex);
    }

    return appCacheRoot;
  }

  @Override
  protected void onStart() {
    Log.i(TAG, "onStart()");
    super.onStart();
    PhoneUtils.setGlobalContext(getApplication());
    initializeUi();

    // Load the saved preferences.
    SharedPreferences prefs = PreferenceManager.getDefaultSharedPreferences(getBaseContext());

    // Create a directory to be used for the web view's app cache.
    File appCacheRoot = createAppCacheDir();

    // What system are we an agent of?
    AgentType agentType = AgentType.valueOf(
        prefs.getString(getString(R.string.prefKeyAgentType), "WebPageTest"));

    mAgentBehaviorDelegate = null;
    if (agentType == AgentType.WebPageTest) {
      mAgentBehaviorDelegate = new WebPageTestAgentBehaviorDelegate(getBaseContext(), prefs);

    } else {
      assert false : "New agent type needs to have delegate initialized.";
    }

    PhoneUtils.getPhoneUtils().acquireWakeLock();
    mTaskManager = new TaskManager(mAgentBehaviorDelegate);
    mBrowser = new Browser((WebView) findViewById(R.id.webView), appCacheRoot);
    mWorkerThread = new WorkerThread(this, mTaskManager, mBrowser,
                                     mAgentBehaviorDelegate);

    startWorker();

    if (mTimer != null) {
      mTimer.cancel();
      mTimer = null;
    }

    mTimer = new Timer();
    TimerTask timerTask = new TimerTask() {
        @Override
        public void run() {
          Log.i(TAG, "beacon KeepAliveService");
          startService(new Intent(KeepAliveService.class.getName()));

          if (mTaskManager != null && mWorkerThread != null &&
              System.currentTimeMillis() > mTaskManager.getLastTaskPollTimeMs() +
                  Config.WORKER_CHECKIN_MAXIMUM_MS) {
            Log.e(TAG, "workerThread not responding. Terminate the process");

            // The process needs to completely terminate with a potentially blocking worker thread.
            // The keep-alive service (if not disabled in prefs) will start the agent shortly
            quitApp(false);
          }
        }
      };
    mTimer.schedule(timerTask, 0, Config.AGENT_BEACON_FREQUENCY_MS);
  }

  public void startWorker() {
    if (mWorkerThread != null && !mWorkerThread.isAlive()) {
      mWorkerThread.start();
    }
  }

  // Authentication is handled by mAgentBehaviorDelegate.
  // This method is called on authentication failures that require user
  // action to fix.  For example, adding an account to the phone.
  public void onAuthenticationFailure(String message) {
    mWorkerThread.requestStop();
    showMessage(message, UiMessageDisplay.TEXT_COLOR_RED);
  }

  @Override
  protected void onStop () {
    Log.i(TAG, "onStop()");

    WebView webView = (WebView) findViewById(R.id.webView);
    webView.stopLoading();

    PhoneUtils.releaseGlobalContext();

    if (mWorkerThread != null) {
      mWorkerThread.requestStop();
      synchronized (mWorkerThread) {
        if (mWorkerThread.isAlive()) {
          try {
            // Wait for the worker thread to quit. But don't wait too long (because it blocks UI).
            mWorkerThread.wait(200);
          } catch (InterruptedException ignored) {
            // no-op
          }
        }
      }
      mWorkerThread = null;
    }

    mTaskManager = null;
    mBrowser = null;

    showMessage("Velodrome Agent stopped.");

    if (mTimer != null) {
      mTimer.cancel();
      mTimer = null;
    }

    super.onStop();
  }

  @Override
  public void onSaveInstanceState(Bundle outState) {
    Log.i(TAG, "onSaveInstanceState");
    super.onSaveInstanceState(outState);
    outState.putStringArrayList(SAVED_STATE_KEY_HISTORY_MESSAGES, mUiDisplayHistoryMessages);
  }

  @Override
  public void onDestroy() {
    Log.i(TAG, "onDestroy()");

    super.onDestroy();
  }

  private void initializeUi() {
    EditText urlEdit = (EditText) findViewById(R.id.editTextUrl);
    EditText.OnEditorActionListener urlEditListener =
        new EditText.OnEditorActionListener() {
      @Override
      public boolean onEditorAction(TextView v, int actionId, KeyEvent event) {
        if (actionId == EditorInfo.IME_ACTION_GO ||
            actionId == EditorInfo.IME_NULL) {
          InputMethodManager mgr = (InputMethodManager) getSystemService(
              Context.INPUT_METHOD_SERVICE);
          mgr.hideSoftInputFromWindow(v.getWindowToken(), 0);

          String url = v.getText().toString();
          String urlLower = url.toLowerCase();
          if (!urlLower.startsWith("http:") && !urlLower.startsWith("https:")) {
            url = "http://" + url;
          }

          mTaskManager.addTaskFromDeviceUI(url);

          v.clearFocus();
          return true;
        }
        return false;
      }
    };

    urlEdit.setOnEditorActionListener(urlEditListener);
    urlEdit.setHint("Enter a URL to measure");
    urlEdit.setEnabled(false);  // Disable the edit box until the app is ready to accept tasks.
  }

  /* (non-Javadoc)
   * @see com.google.wireless.speed.velodrome.UiMessgeDisplay#showMessage(java.lang.String)
   */
  @Override
  public void showMessage(final String message) {
    showMessage(message, TEXT_COLOR_DEFAULT);
  }

  /* (non-Javadoc)
   * @see com.google.wireless.speed.velodrome.UiMessgeDisplay#showMessage(
   *     java.lang.String, java.lang.String)
   */
  @Override
  public void showMessage(final String message, final String textColor) {
    showMessageInternal(message, textColor, true);
  }

  /* (non-Javadoc)
   * @see com.google.wireless.speed.velodrome.UiMessageDisplay#showTemporyMessage(
   *     java.lang.String, java.lang.String)
   */
  @Override
  public void showTemporyMessage(String message) {
    showMessageInternal(message, TEXT_COLOR_DEFAULT, false);
  }

  private void showMessageInternal(String message, String textColor, boolean saveMsgToHistory) {
    StringBuilder messages = new StringBuilder();
    messages.append("<div style='font-size:small; color:" + textColor + "'>" +
                    message + "</div>");
    messages.append("<h4 style='margin-top:40px'>History</h4>");
    for (int i = mUiDisplayHistoryMessages.size() - 1; i >= 0; --i) {
      messages.append(mUiDisplayHistoryMessages.get(i));
    }

    if (saveMsgToHistory) {
      mUiDisplayHistoryMessages.add("<div style='font-size:xx-small;color:" + textColor + "'>" +
                                   "<span style='color:grey'>" +
                                   LOG_MSG_DATE_FORMATTER.format(new Date()) + "</span>: " +
                                   message + "</div>");
      if (mUiDisplayHistoryMessages.size() > Config.MAX_NUM_MESSAGES_ON_UI) {
        mUiDisplayHistoryMessages.remove(0);
      }
    }

    final String msgHtml = "<html><body>" +
        "<h3 style='color:blue'>Velodrome Agent " + Config.getAgentVersion() + "</h3>" +
        "<h4>Device ID: " + PhoneUtils.getPhoneUtils().getDeviceId() + "</h4>" +
        messages +
        "</body></html>";

    runOnUiThread(new Runnable() {
      @Override
      public void run() {
        WebView webView = (WebView) findViewById(R.id.webView);
        webView.loadData(msgHtml, "text/html", "utf-8");
      }
    });
  }

  /* (non-Javadoc)
   * @see com.google.wireless.speed.velodrome.UiMessgeDisplay#setUrlEdit(boolean, java.lang.String)
   */
  @Override
  public void setUrlEdit(final boolean enabled, final String text) {
    runOnUiThread(new Runnable() {
      @Override
      public void run() {
        EditText urlEdit = (EditText) findViewById(R.id.editTextUrl);

        if (text != null) {
          urlEdit.setText(text);
        }

        urlEdit.setEnabled(enabled);
        urlEdit.clearFocus();
      }
    });
  }

  @Override
  public boolean onCreateOptionsMenu(Menu menu) {
    MenuInflater inflater = getMenuInflater();
    inflater.inflate(R.menu.main_menu, menu);
    return true;
  }

  /** React to menu item selections */
  @Override
  public boolean onOptionsItemSelected(MenuItem item) {
    switch (item.getItemId()) {
      case R.id.menuSettings:
        Intent settingsActivity = new Intent(getBaseContext(), Preferences.class);
        startActivity(settingsActivity);
        return true;
      case R.id.menuQuit:
        Log.i(TAG, "User action: Quit App");
        quitApp(true);
        return true;
      default:
        return super.onOptionsItemSelected(item);
    }
  }

  protected synchronized String getAppVersion() {
    try {
      PackageInfo packageInfo = getPackageManager().getPackageInfo(getPackageName(),
                                                                   PackageManager.GET_META_DATA);
      return packageInfo.versionName;
    } catch (NameNotFoundException e) {
      Log.e(TAG, "Failed to fetch version info for " + getPackageName(), e);
      return "";
    }
  }

  protected void quitApp(boolean quitKeepAlive) {
    if (quitKeepAlive) {
      Intent intent = new Intent(getString(R.string.intentNameQuitKeepAliveService));
      intent.setClassName(getPackageName(), KeepAliveService.class.getName());
      // Send the quit intent to KeepAliveService before finishing
      startService(intent);
    }
    NotificationManager nm = (NotificationManager)getSystemService(Context.NOTIFICATION_SERVICE);
    nm.cancelAll();
    finish();
    System.exit(0);
  }

  protected void updateNotification() {
    // Status notification to tell that agent is started/running.
    Notification notification = new Notification(R.drawable.icon,
                                                 getString(R.string.appName) + " started",
                                                 System.currentTimeMillis());
    Intent notificationIntent = new Intent(getBaseContext(), this.getClass());
    notification.setLatestEventInfo(this, getString(R.string.appName), "Running",
                                    PendingIntent.getActivity(this, 0, notificationIntent, 0));
    NotificationManager nm = (NotificationManager)getSystemService(Context.NOTIFICATION_SERVICE);
    nm.notify(Config.NOTIFICATION_AGENT_RUNNING, notification);
  }
}
