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
import android.util.Log;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.zip.GZIPOutputStream;

import org.apache.http.client.HttpResponseException;

public final class IOUtils {

  private static final String TAG = "Velodrome:IOUtils";
  private static final int BUF_SIZE = 16 * 1024;  // Buffer for writing data to HTTP POST.
  private static final int AUTH_COOKIE_WAIT_TIMEOUT_MS = 20 * 1000;

  private static volatile String sAuthCookie = null;

  private static final Object authCookieMonitor = new Object();

  private IOUtils() {}

  public static void setAuthCookie(String cookie) {
    synchronized (authCookieMonitor) {
      sAuthCookie = cookie;
      authCookieMonitor.notifyAll();
    }
  }

  /**
   * Wait for authentication cookie to be set (by the login thread).
   *
   * @return true if cookie is available; false if cookie is not set after a timeout defined
   *     by AUTH_COOKIE_WAIT_TIMEOUT_MS.
   * @throws InterruptedException
   */
  public static boolean waitForAuthCookie() throws InterruptedException {
    synchronized (authCookieMonitor) {
      if (!hasAuthCookie()) {
        authCookieMonitor.wait(AUTH_COOKIE_WAIT_TIMEOUT_MS);
      }

      return hasAuthCookie();
    }
  }

  public static boolean hasAuthCookie() {
    synchronized (authCookieMonitor) {
      return sAuthCookie != null;
    }
  }

  public static String uploadFile(File file, String url, UiMessageDisplay messageDisplay)
      throws IOException {
    return post(null, file, null, url, 0, messageDisplay);
  }

  public static String uploadImage(Bitmap bitmap, int imageQuality, String url,
                                   UiMessageDisplay messageDisplay) throws IOException {
    return post(null, null, bitmap, url, imageQuality, messageDisplay);
  }

  public static String postData(String data, String url) throws IOException {
    return post(data, null, null, url, 0, null);
  }

  // Note that this method uses HttpURLConnection instead of HttpClient. The advantage of
  // HttpURLConnection is that you can stream large file to a POST request chunk by chunk,
  // whereas with HttpClient you must load the entire data file into memory and that can easily
  // cause out-of-memory error on devices with small RAM.
  private static String post(String data, File file, Bitmap bitmap,
                             String url, int imageQuality,
                             final UiMessageDisplay messageDisplay) throws IOException {
    Log.i(TAG, "Posting to " + url);

    HttpURLConnection urlConnection = null;
    String savedKeepAliveProp = System.getProperty("http.keepAlive");
    FileInputStream fileInputStream = null;
    try {
      // Disable keepAlive because, if connection is reused, urlConnection.getResponseCode() may
      // randomly return -1 on some versions (such as 2.3.6) of Android.
      System.setProperty("http.keepAlive", "false");

      urlConnection = (HttpURLConnection) new URL(url).openConnection();
      urlConnection.setDoOutput(true);
      urlConnection.setDoInput(true);
      urlConnection.setRequestProperty("Cookie", sAuthCookie);

      if (file != null) {
        File gzipFile = gzipFile(file);
        urlConnection.setRequestProperty("Content-Encoding", "gzip");
        final int fileLen = (int) gzipFile.length();
        urlConnection.setFixedLengthStreamingMode(fileLen);
        Log.i(TAG, "Posting " + fileLen + " bytes to " + url);
        OutputStream outStream = urlConnection.getOutputStream();
        fileInputStream = new FileInputStream(gzipFile);
        copy(fileInputStream, outStream, new CopyProgressCallback() {
          @Override
          public void updateProgress(long bytesCopied) {
            messageDisplay.showTemporyMessage(
                "Uploading " + (bytesCopied/1024) + "/" + (fileLen/1024) + "KB. Please wait...");
          }
        });
        outStream.flush();
      } else {
        byte[] bytes = null;
        if (data != null) {
          bytes = data.getBytes("UTF-8");
        } else if (bitmap != null){
          ByteArrayOutputStream bos = new ByteArrayOutputStream();
          bitmap.compress(Bitmap.CompressFormat.PNG, imageQuality, bos);
          bytes = bos.toByteArray();
        } else {
          throw new IllegalArgumentException();
        }

        urlConnection.setFixedLengthStreamingMode(bytes.length);
        Log.i(TAG, "Posting " + bytes.length + " bytes to " + url);
        OutputStream outStream = urlConnection.getOutputStream();
        outStream.write(bytes);
        outStream.flush();
      }

      int responseCode = urlConnection.getResponseCode();
      if (responseCode == 302) {
        String redirectUrl = urlConnection.getHeaderField("Location");
        Log.e(TAG, "Got HTTP 302: location=" + redirectUrl);
        if (redirectUrl.matches("https://www\\.google\\.com/.+/ServiceLogin\\?.+")) {
          setAuthCookie(null);  // Delete the bad login cookie.
          throw new NotLoggedInException("Failed to post to " + url);
        }
      }

      if (responseCode != 200) {
        throw new HttpResponseException(
            responseCode, "Failed to post to " + url + ". ResponseCode=" + responseCode);
      }

      InputStream in = urlConnection.getInputStream();
      byte[] response = new byte[BUF_SIZE];
      int responseSize = 0;
      while (responseSize < response.length) {
        int bytesRead = in.read(response, responseSize, response.length - responseSize);
        if (bytesRead < 0) {
          break;
        }
        responseSize += bytesRead;
      }

      if (responseSize > 0) {
        return new String(response, 0, responseSize, "UTF-8");
      } else {
        return null;
      }
    } finally {
      try {
        if (urlConnection != null) {
          urlConnection.disconnect();
        }
        if (fileInputStream != null) {
          fileInputStream.close();
        }
      } finally {
        if (savedKeepAliveProp == null) {
          System.clearProperty("http.keepAlive");
        } else {
          System.setProperty("http.keepAlive", savedKeepAliveProp);
        }
      }
    }
  }

  /**
   * Gzip compresses a file.
   * @param file The input file to be compressed.
   * @return The newly created compressed file.
   * @throws FileNotFoundException
   * @throws IOException
   */
  public static File gzipFile(File file) throws FileNotFoundException, IOException {
    FileInputStream inStream = null;
    GZIPOutputStream outStream = null;

    try {
      inStream = new FileInputStream(file);
      String zipFilename = file.getAbsolutePath() + ".gz";
      File outFile = new File(zipFilename);
      if (outFile.exists()) {
        outFile.delete();
        outFile = new File(zipFilename);
      }

      outStream = new GZIPOutputStream(new FileOutputStream(outFile));
      copy(inStream, outStream, null);
      outStream.flush();
      return outFile;
    } finally {
      if (inStream != null) {
        inStream.close();
      }
      if (outStream != null) {
        outStream.close();
      }
    }
  }

  /**
   * Copies all bytes from the input stream to the output stream (for uploading data).
   * Does not close or flush either stream.
   *
   * @param from the input stream to read from
   * @param to the output stream to write to
   * @param progressCallback (optional) Callback for reporting progress info.
   * @return the number of bytes copied
   * @throws IOException if an I/O error occurs
   */
  public static long copy(InputStream from, OutputStream to, CopyProgressCallback progressCallback)
      throws IOException {
    byte[] buf = new byte[BUF_SIZE];
    long total = 0;
    while (true) {
      int r = from.read(buf);
      if (r == -1) {
        break;
      }
      to.write(buf, 0, r);
      total += r;

      if (progressCallback != null) {
        progressCallback.updateProgress(total);
      }
    }
    return total;
  }

  /** Progress update callback used by the copy() method. */
  public interface CopyProgressCallback {
    void updateProgress(long bytesCopied);
  }
}
