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

import java.util.ArrayList;

import android.graphics.Bitmap;
import android.os.CountDownTimer;

/**
 * Class VideoFrameGrabber acts on objects that implement the VideoFrameSource
 * interface.  It is used to get the Bitmap video frame.
 *
 * @author skerner at google dot com
 */
interface VideoFrameSource {
  // Grab a video frame.  If a frame can not be captured, return null.
  // This method will be called on the main (UI) thread.
  // The caller of this method will recycle the Bitmap (by calling bitmap.recycle()).
  // This will make the bitmap unusable.  Implementations of this method
  // should not keep a reference to the value they return.
  public Bitmap captureVideoFrame();
}

/**
 * Class VideoFrameGrabber collects bitmaps of the screen at a regular interval.
 * The agent can upload these images to create a video of the screen.
 *
 * This class must be used on the UI thread, because screen capture must
 * be done on the UI thread.
 *
 * @author skerner at google dot com
 */
public class VideoFrameGrabber {
  //private static final String TAG = "Velodrome:VideoFrameGrabber";
  private static final long MS_PER_SECOND = 1000;
  private static final long LONG_TIME_MS = 60 * 60 * MS_PER_SECOND;

  // This class builds an array of frame records, and returns them from
  // method getFrameRecords().
  public class FrameRecord {
    public FrameRecord(long msSinceStart, Bitmap frame, long msToProcessFrame) {
      mMsSinceStart = msSinceStart;
      mFrame = frame;
      mMsToProcessFrame = msToProcessFrame;
    }

    public long getMsSinceStart() { return mMsSinceStart; }
    public Bitmap getFrame() { return mFrame; }
    public long getMsToProcessFrame() { return mMsToProcessFrame; }

    private long mMsSinceStart;

    // TODO(skerner): Bitmaps consume a lot of memory.  The memory is not java
    // heap memory.  It is android system memory, which is very limited.
    // Hitting this limit will cause log messages like this:
    // 02-22 12:36:53.430: E/dalvikvm-heap(320): 612880-byte external allocation too large for this process.
    // 02-22 12:36:53.430: E/GraphicsJNI(320): VM won't let us allocate 612880 bytes
    // Using java memory is possible by sucking the bytes out of the bitmap.
    // recycle() frees the system memory before GC runs.
    //
    // Bitmap bitmap = getBitmap();
    // Buffer buffer;
    // bitmap.copyPixelsToBuffer(buffer);  // Data is in java heap.
    // bitmap.recycle();  // Release the system memory backing the buffer, right now.
    //
    // Unfortunately, java heap memory is limited as well.  On gingerbread, the
    // limit is around 25M for the entire java heap.  We will need to experiment
    // with ways to store the image without slowing the page load.  Writing
    // to a file or encoding as a JPEG are options to look at.
    private Bitmap mFrame;

    // How long did it take to capture and process this frame?  Useful for
    // deciding if frame capture is changing the performance of page loading.
    private long mMsToProcessFrame;
  }

  public VideoFrameGrabber(VideoFrameSource frameSource,
                           long millisPerFrame,
                           float scaleFactor) {
    mFrameSource = frameSource;
    mMillisPerFrame = millisPerFrame;
    mScaleFactor = scaleFactor;
    mTimer = null;
    startTimer();
  }

  private void startTimer() {
    // We want a periodic timer, firing on a regular interval,
    // until we stop it.  CountDownTimer fires at a regular interval,
    // but it stops after a set time.  The time limit we give it
    // (LONG_TIME_MS) should be long enough to be sure the timer won't
    // stop as we run.
    mFrameRecords = new ArrayList<FrameRecord>();

    mTimer = new CountDownTimer(LONG_TIME_MS, mMillisPerFrame) {
      public void onTick(long millisUntilFinished) {
        long millisSinceStart = LONG_TIME_MS - millisUntilFinished;

        long startOfFrameProcessing = System.currentTimeMillis();
        Bitmap rawFrame = mFrameSource.captureVideoFrame();
        Bitmap scaledFrame = null;
        if (rawFrame != null) {
          int scaledWidth = (int) (rawFrame.getWidth() * mScaleFactor);
          int scaledHeight = (int) (rawFrame.getHeight() * mScaleFactor);
          scaledFrame = Bitmap.createScaledBitmap(
              rawFrame,  // Input bitmap
              scaledWidth,  // New width
              scaledHeight,  // New height
              false);  // Disable filtering.  We don't need it, and it can be slow.
          rawFrame.recycle();  // Free the system memory backing the bitmap.
        }

        long msToProcessFrame = (System.currentTimeMillis() - startOfFrameProcessing);

        mFrameRecords.add(new FrameRecord(millisSinceStart, scaledFrame, msToProcessFrame));
      }

      public void onFinish() {
        // There is no way a page load should take this long.  If onFinish()
        // is called, a bug in the agent must have caused us top fail to
        // cancel the timer.
        assert false;
      }
    };
    mTimer.start();
  }

  public void stop() {
    // The constructor started the timer.  Calling stop() more than once
    // is not supported.
    assert mTimer != null;
    mTimer.cancel();
    mTimer = null;
  }

  public ArrayList<FrameRecord> getFrameRecords() {
    return mFrameRecords;
  }

  private VideoFrameSource mFrameSource;
  private long mMillisPerFrame;
  private float mScaleFactor;
  private CountDownTimer mTimer;
  private ArrayList<FrameRecord> mFrameRecords;
}

