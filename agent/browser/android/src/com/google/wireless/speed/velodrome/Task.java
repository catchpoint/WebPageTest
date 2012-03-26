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

import java.io.File;
import java.util.ArrayList;
import java.util.Map;

import com.google.wireless.speed.velodrome.VideoFrameGrabber.FrameRecord;

public class Task {
  private volatile String mTaskId;
  private volatile String mUrl;
  private volatile String mProxy;
  // A free-form string for the user to store metadata
  private volatile String mTag;
  private volatile boolean mClearCache;
  private volatile boolean mClearCookie;
  private volatile boolean mCapturePcap;
  private volatile boolean mCaptureScreenshot;
  private volatile boolean mRepeatView;
  private volatile int mRuns;
  private volatile boolean mCaptureVideo;
  private volatile int mImageQuality;
  private volatile Result mResult = new Result();

  public Task(String taskId, String url, boolean clearCache, boolean clearCookie,
              boolean capturePcap, boolean captureScreenshot, String proxy,
              String tag, boolean repeatView, int runs, boolean captureVideo,
              int imageQuality) {
    assert url != null && url.length() > 0;
    mTaskId = taskId;
    mUrl = url;
    proxy = (proxy.equals("null") || proxy.trim().equals("")) ? null : proxy;
    mTag = tag;
    mClearCache = clearCache;
    mClearCookie = clearCookie;
    mCapturePcap = capturePcap;
    mCaptureScreenshot = captureScreenshot;
    mRepeatView = repeatView;
    mRuns = runs;
    mCaptureVideo = captureVideo;
    mImageQuality = imageQuality;
  }

  public String getUrl() {
    return mUrl;
  }

  public String getProxy() {
    return mProxy;
  }

  public String getTag() {
    return mTag;
  }

  public String getId() {
    return mTaskId;
  }

  public boolean shouldClearCookie() {
    return mClearCookie;
  }

  public boolean shouldClearCache() {
    return mClearCache;
  }

  public boolean shouldCapturePcap() {
    return mCapturePcap;
  }

  public boolean shouldCaptureScreenshot() {
    return mCaptureScreenshot;
  }

  public boolean shouldRunRepeatView() {
    return mRepeatView;
  }

  public int getRuns() {
    return mRuns;
  }

  public boolean captureVideo() {
    return mCaptureVideo;
  }

  public int imageQuality() {
    return mImageQuality;
  }

  public void setId(String id) {
    assert id != null && id.length() > 0;
    assert this.mTaskId == null || this.mTaskId.equals(id);
    this.mTaskId = id;
  }

  public Result getResult() {
    return mResult;
  }

  public void setPcapFile(File pcapFile) {
    mResult.pcapFile = pcapFile;
  }

  public void setScreenshot(Bitmap screenshot) {
    mResult.screenshot = screenshot;
  }

  public void setVideoFrameRecords(ArrayList<FrameRecord> videoFrameRecords) {
    mResult.videoFrameRecords = videoFrameRecords;
  }

  public void setTimings(Map<String, String> timings) {
    mResult.timings = timings;
  }

  /**
   * Determines if the given task is requesting a proxy
   * @return Whether the given task needs to be proxied
   */
  public boolean needsProxy() {
    return getProxy() != null;
  }

  public static class Result {
    private volatile File pcapFile = null;
    private volatile Bitmap screenshot = null;
    private Map<String, String> timings = null;
    public ArrayList<FrameRecord> videoFrameRecords = null;

    public File getPcapFile() {
      return pcapFile;
    }

    public Map<String, String> getTimings() {
      return timings;
    }

    public Bitmap getScreenshot() {
      return screenshot;
    }

    public ArrayList<FrameRecord> getVideoFrameRecords() {
      return videoFrameRecords;
    }
  }
}
