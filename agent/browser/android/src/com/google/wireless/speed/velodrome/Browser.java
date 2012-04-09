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

import android.graphics.Bitmap;
import android.os.ConditionVariable;
import android.util.Log;
import android.webkit.CookieManager;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

public class Browser implements VideoFrameSource {
  public static final String TAG = "Velodrome:Browser";

  private static final long WPT_VIDEO_MS_PER_FRAME = 1000L;  // Capture one frame per second.
  private static final float WPT_VIDEO_FRAME_SCALE_FACTOR = 0.5f;  // Scale video frames for upload.
  private static final String TIMING_JS_INTERFACE_NAME = "velodromeJsTimingHelper";
  private static final long BROWSER_SETTINGS_APP_CACHE_SIZE = 10 * 1024 * 1024;  // 10 MB

  private final WebView mWebView;
  private VideoFrameGrabber mVideoFrameGrabber = null;
  private ConditionVariable mCondition;
  private WebViewClientForTiming mWebViewClient;

  public Browser(WebView webView, File appCacheRoot) {
    mWebView = webView;

    WebSettings settings = webView.getSettings();

    // Enabling the app cache without setting a path crashes webcore on
    // gingerbread.  Explicitly setting the path seems to work.
    settings.setAppCacheEnabled(true);
    settings.setAppCachePath(appCacheRoot.getAbsolutePath());
    settings.setAppCacheMaxSize(BROWSER_SETTINGS_APP_CACHE_SIZE);
    settings.setCacheMode(WebSettings.LOAD_DEFAULT);
    settings.setDatabaseEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setJavaScriptCanOpenWindowsAutomatically(true);
    settings.setJavaScriptEnabled(true);
    settings.setPluginsEnabled(true);
    settings.setSupportMultipleWindows(true);

    CookieManager.getInstance().setAcceptCookie(true);
  }

  public void setCondition(ConditionVariable cv) {
    mCondition = cv;
  }

  /**
   * Implements interface VideoFrameSource.
   * Used to get frames of the video of the page loading.
   */
  public Bitmap captureVideoFrame() {
    if (mWebView == null)
      return null;

    return PhoneUtils.captureScreenshot(mWebView);
  }

  public void loadPageAndMeasureLatency(final Task task, final boolean shouldClearCache)
      throws InterruptedException {
    Log.d(TAG, "loadPageAndMeasureLatency()");

    // Clear the screen by loading about:blank into the webview.
    mWebView.loadUrl("about:blank");
    Thread.sleep(Config.PRE_PAGE_LOAD_SLEEP_TIME_MS);

    if (task.shouldClearCookie()) {
      CookieManager.getInstance().removeAllCookie();
    }
    if (shouldClearCache) {
      // Note that this clears the regular browser cache only. This does NOT
      // clear localStorage or databases. There isn't an API to
      // clear those storage. But those storage are not persisted (unless
      // you set WebSettings.setDatabasePath(xxx)), so, you can clear
      // those HTML5 storages by restarting the process.
      // TODO(skerner): We set the app cache path to work around a webcore bug.
      // Clear it manually.
      mWebView.clearCache(true);
    }

    JavascriptTimingHelper jsTimings = new JavascriptTimingHelper();
    mWebViewClient = new WebViewClientForTiming(jsTimings);
    WebChromeClientForTimings chromeClient =
        new WebChromeClientForTimings(jsTimings);

    // Stop the browser and (since it is an async operation) wait a bit for
    // the browser to be fully stopped, and this also gives a chance to the
    // tcpdump process to fully start up.
    mWebView.stopLoading();
    Thread.sleep(Config.PRE_PAGE_LOAD_SLEEP_TIME_MS);

    mWebView.setWebViewClient(mWebViewClient);
    mWebView.setWebChromeClient(chromeClient);
    mWebView.addJavascriptInterface(jsTimings, TIMING_JS_INTERFACE_NAME);
    mWebView.getSettings().setLoadWithOverviewMode(true);
    mWebView.getSettings().setUseWideViewPort(true);
    mWebViewClient.onStart();

    // If we should save video frames, start capturing them.
    // VideoFrameGrabber() starts its timer on construction.
    mVideoFrameGrabber = null;
    if (task.captureVideo())
      mVideoFrameGrabber = new VideoFrameGrabber(this, WPT_VIDEO_MS_PER_FRAME,
                                                 WPT_VIDEO_FRAME_SCALE_FACTOR);

    mWebView.loadUrl(task.getUrl());
  }

  public void finishExecutingTask(Task task) {
    if (task.shouldCaptureScreenshot()) {
      task.setScreenshot(captureScreenshot());
    }
    if (mVideoFrameGrabber != null) {
      mVideoFrameGrabber.stop();
      task.setVideoFrameRecords(mVideoFrameGrabber.getFrameRecords());
      mVideoFrameGrabber = null;
    }

    task.setTimings(mWebViewClient.getTimings());
    mWebView.setWebViewClient(null);
    mWebView.setWebChromeClient(null);
    mWebView.getSettings().setLoadWithOverviewMode(false);
    mWebView.getSettings().setUseWideViewPort(false);
    if (mCondition != null) {
      mCondition.open();
    }
  }

  public Bitmap captureScreenshot() {
    Log.d(TAG, "captureScreenshot()");
    // It's not clear if this is UI-thread-safe or not.
    return PhoneUtils.captureScreenshot(mWebView);
  }

  private class JavascriptTimingHelper {
    volatile long onLoadTimeMs = 0;
    volatile long onContentLoadTimeMs = 0;

    /** Called by javascript. */
    @SuppressWarnings("unused")
    public void onLoad() {
      onLoadTimeMs = System.currentTimeMillis();
    }

    /** Called by javascript. */
    public void onDOMContentLoaded() {
      onContentLoadTimeMs = System.currentTimeMillis();
    }
  }

  private class WebViewClientForTiming extends WebViewClient {
    final JavascriptTimingHelper jsTimings;

    volatile long startTimeMs = 0;
    volatile long endTimeMs = 0;

    WebViewClientForTiming(JavascriptTimingHelper jsTimings) {
      this.jsTimings = jsTimings;
    }

    public void onStart() {
      startTimeMs = System.currentTimeMillis();
    }

    @Override
    public void onPageFinished(WebView view, String url) {
      if (endTimeMs == 0) {
        endTimeMs = System.currentTimeMillis();
      }
      if (mCondition != null) {
        mCondition.open();
      }
    }

    public Map<String, String> getTimings() {
      long onLoadTimeMs = -1;
      long onContentLoadMs = -1;

      if (startTimeMs > 0) {
        if (jsTimings.onLoadTimeMs > startTimeMs) {
          onLoadTimeMs = jsTimings.onLoadTimeMs - startTimeMs;
        } else if (endTimeMs > startTimeMs) {
          onLoadTimeMs = endTimeMs - startTimeMs;
        }

        if (jsTimings.onContentLoadTimeMs > startTimeMs) {
          onContentLoadMs = jsTimings.onContentLoadTimeMs - startTimeMs;
        }
      }

      HashMap<String, String> timings = new HashMap<String, String>();
      timings.put("navigationStartTime", Long.toString(startTimeMs));
      timings.put("onLoad", Long.toString(onLoadTimeMs));
      timings.put("onContentLoad", Long.toString(onContentLoadMs));
      return timings;
    }
  }

  private class WebChromeClientForTimings extends WebChromeClient {
    final JavascriptTimingHelper jsTimings;
    boolean registeredOnloadHandler = false;

    WebChromeClientForTimings(JavascriptTimingHelper jsTimings) {
      this.jsTimings = jsTimings;
    }

    @Override
    public void onReceivedTitle (WebView view, String title) {
      registerOnLoadHandler(view);
    }

    private void registerOnLoadHandler(WebView view) {
      if (registeredOnloadHandler) {
        return;
      }

      // Sets a default DOMContentLoad time. This is needed because, if a page is small and fast,
      // registerOnLoadHandler() is often called after the DOMContentLoaded event is fired. In that
      // case, we call jsTimings.onDOMContentLoaded() here to set DOMContentLoaded time to now,
      // which is not really accurate, but better than not catching a DOMContentLoaded time.
      jsTimings.onDOMContentLoaded();

      registeredOnloadHandler = true;
      view.loadUrl("javascript:" +
        "window.addEventListener('DOMContentLoaded', function() {" +
            TIMING_JS_INTERFACE_NAME + ".onDOMContentLoaded();});" +
        "window.addEventListener('DOMContent', function() {" +
            TIMING_JS_INTERFACE_NAME + ".onDOMContentLoaded();});" +
        "window.addEventListener('load', function() {" +
            TIMING_JS_INTERFACE_NAME + ".onLoad();});");
    }

    @Override
    public boolean onJsPrompt(WebView view, String url, String message, String defaultValue,
                              JsPromptResult result) {
      // When a web page calls prompt, dismiss the blocking dialog with the default value.
      result.confirm(defaultValue);
      return true;
    }

    @Override
    public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
      // When a web page calls confirm, dismiss the blocking dialog box.
      result.confirm();
      return true;
    }

    @Override
    public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
      // When a web page calls alert, dismiss the blocking dialog box.
      result.confirm();
      return true;
    }

    @Override
    public void onProgressChanged (WebView view, int newProgress) {
      // "30%" is chosen arbitrarily. The intention is to make sure registerOnLoadHandler() is
      // called early (but not too early, not before DOM exists) in a page load.
      if (newProgress > 30) {
        registerOnLoadHandler(view);
      }
    }
  }
}
