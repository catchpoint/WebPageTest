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

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Picture;
import android.location.Criteria;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.location.LocationProvider;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Build;
import android.os.Bundle;
import android.os.Looper;
import android.os.PowerManager;
import android.os.PowerManager.WakeLock;
import android.provider.Settings.Secure;
import android.telephony.TelephonyManager;
import android.util.Log;
import android.view.Display;
import android.view.WindowManager;
import android.webkit.WebView;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;


/**
 * Phone related utilities.
 *
 * @author Michael Klepikov
 */
public final class PhoneUtils {

  private static final String TAG = "Velodrome.PhoneUtils";

  /** Returned by {@link #getNetwork()}. */
  public static final String NETWORK_WIFI = "Wifi";

  /**
   * The app that uses this class. The app must remain alive for longer than
   * PhoneUtils objects are in use.
   *
   * @see #setGlobalContext(Context)
   */
  private static Context sGlobalContext = null;

  /** A singleton instance of PhoneUtils. */
  private static PhoneUtils sSingletonPhoneUtils = null;

  /** Phone context object giving access to various phone parameters. */
  private Context mContext = null;

  /** Allows to obtain the phone's location, to determine the country. */
  private LocationManager mLocationManager = null;

  /** The name of the location provider with "coarse" precision (cell/wifi). */
  private String mLocationProviderName = null;

  /** Allows to disable going to low-power mode where WiFi gets turned off. */
  private WakeLock mWakeLock = null;

  /** Call initNetworkManager() before using this var. */
  private ConnectivityManager mConnectivityManager = null;

  /** Call initNetworkManager() before using this var. */
  private TelephonyManager mTelephonyManager = null;


  private PhoneUtils(Context context) {
    mContext = context;
    initNetwork();
  }

  /**
   * The owner app class must call this method from its onCreate(), before
   * getPhoneUtils().
   */
  public static synchronized void setGlobalContext(Context newGlobalContext) {
    assert newGlobalContext != null;
    assert sSingletonPhoneUtils == null;  // Should not yet be created
    // Not supposed to change the owner app
    assert sGlobalContext == null || sGlobalContext == newGlobalContext;

    sGlobalContext = newGlobalContext;
  }

  public static synchronized void releaseGlobalContext() {
    sGlobalContext = null;
  }

  /** Returns the context previously set with {@link #setGlobalContext}. */
  public static synchronized Context getGlobalContext() {
    assert sGlobalContext != null;
    return sGlobalContext;
  }

  /**
   * Returns a singleton instance of PhoneUtils. The caller must call
   * {@link #setGlobalContext(Context)} before calling this method.
   */
  public static synchronized PhoneUtils getPhoneUtils() {
    if (sSingletonPhoneUtils == null) {
      assert sGlobalContext != null;
      sSingletonPhoneUtils = new PhoneUtils(sGlobalContext);
    }

    return sSingletonPhoneUtils;
  }

  public String getDeviceId() {
    String deviceId = mTelephonyManager.getDeviceId();  // This ID is permanent to a physical phone.
    // "generic" means the emulator.
    if (deviceId == null || Build.DEVICE.equals("generic")) {
      // This ID changes on OS reinstall/factory reset.
      deviceId = Secure.getString(mContext.getContentResolver(), Secure.ANDROID_ID);
    }

    return deviceId;
  }

  /**
   * Lazily initializes the network managers.
   *
   * As a side effect, assigns connectivityManager and telephonyManager.
   */
  private synchronized void initNetwork() {
    if (mConnectivityManager == null) {
      ConnectivityManager tryConnectivityManager =
          (ConnectivityManager) mContext.getSystemService(Context.CONNECTIVITY_SERVICE);

      TelephonyManager tryTelephonyManager =
          (TelephonyManager) mContext.getSystemService(Context.TELEPHONY_SERVICE);

      // Assign to member vars only after all the get calls succeeded,
      // so that either all get assigned, or none get assigned.
      mConnectivityManager = tryConnectivityManager;
      mTelephonyManager = tryTelephonyManager;

      // Some interesting info to look at in the logs
      NetworkInfo[] infos = mConnectivityManager.getAllNetworkInfo();
      for (NetworkInfo networkInfo : infos) {
        Log.i(TAG, "Network: " + networkInfo);
      }
      Log.i(TAG, "Phone type: " + getTelephonyPhoneType() +
            ", Carrier: " + getNetworkOperatorName());
    }
    assert mConnectivityManager != null;
    assert mTelephonyManager != null;
  }

  /** Returns the network that the phone is on (e.g. Wifi, Edge, GPRS, etc). */
  public String getNetwork() {
    NetworkInfo networkInfo =
      mConnectivityManager.getNetworkInfo(ConnectivityManager.TYPE_WIFI);
    if (networkInfo != null &&
        networkInfo.getState() == NetworkInfo.State.CONNECTED) {
      return NETWORK_WIFI;
    } else {
      return getTelephonyNetworkType();
    }
  }

  private static final String[] NETWORK_TYPES = {
    "UNKNOWN",  // 0  - NETWORK_TYPE_UNKNOWN
    "GPRS",     // 1  - NETWORK_TYPE_GPRS
    "EDGE",     // 2  - NETWORK_TYPE_EDGE
    "UMTS",     // 3  - NETWORK_TYPE_UMTS
    "CDMA",     // 4  - NETWORK_TYPE_CDMA
    "EVDO_0",   // 5  - NETWORK_TYPE_EVDO_0
    "EVDO_A",   // 6  - NETWORK_TYPE_EVDO_A
    "1xRTT",    // 7  - NETWORK_TYPE_1xRTT
    "HSDPA",    // 8  - NETWORK_TYPE_HSDPA
    "HSUPA",    // 9  - NETWORK_TYPE_HSUPA
    "HSPA",     // 10 - NETWORK_TYPE_HSPA
    "IDEN",     // 11 - NETWORK_TYPE_IDEN
    "EVDO_B",   // 12 - NETWORK_TYPE_EVDO_B
    "LTE",      // 13 - NETWORK_TYPE_LTE
    "EHRPD",    // 14 - NETWORK_TYPE_EHRPD
  };

  /** Returns mobile data network connection type. */
  private String getTelephonyNetworkType() {
    assert NETWORK_TYPES[14].equals("EHRPD");

    int networkType = mTelephonyManager.getNetworkType();
    if (networkType < NETWORK_TYPES.length) {
      return NETWORK_TYPES[mTelephonyManager.getNetworkType()];
    } else {
      return "Unrecognized: " + networkType;
    }
  }

  /** Returns "GSM", "CDMA". */
  private String getTelephonyPhoneType() {
    switch (mTelephonyManager.getPhoneType()) {
      case TelephonyManager.PHONE_TYPE_CDMA:
        return "CDMA";
      case TelephonyManager.PHONE_TYPE_GSM:
        return "GSM";
      case TelephonyManager.PHONE_TYPE_NONE:
        return "None";
    }
    return "Unknown";
  }

  /** Returns current mobile phone carrier name, or empty if not connected. */
  public String getNetworkOperatorName() {
    return mTelephonyManager.getNetworkOperatorName();
  }

  /**
   * Lazily initializes the location manager.
   *
   * As a side effect, assigns locationManager and locationProviderName.
   */
  private synchronized void initLocation() {
    if (mLocationManager == null) {
      LocationManager manager =
        (LocationManager) mContext.getSystemService(Context.LOCATION_SERVICE);

      Criteria criteriaCoarse = new Criteria();
      /* "Coarse" accuracy means "no need to use GPS".
       * Typically a test phone would be located in a building,
       * and GPS may not be able to acquire a location.
       * We only care about the location to determine the country,
       * so we don't need a super accurate location, cell/wifi is good enough.
       */
      criteriaCoarse.setAccuracy(Criteria.ACCURACY_COARSE);
      criteriaCoarse.setPowerRequirement(Criteria.POWER_LOW);
      String providerName =
          manager.getBestProvider(criteriaCoarse, /*enabledOnly=*/true);
      List<String> providers = manager.getAllProviders();
      for (String providerNameIter : providers) {
        LocationProvider provider = manager.getProvider(providerNameIter);
        Log.i(TAG, providerNameIter + ": " +
              (manager.isProviderEnabled(providerNameIter) ? "enabled"
                                                           : "disabled"));
      }

      /* Make sure the provider updates its location.
       * Without this, we may get a very old location, even a
       * device powercycle may not update it.
       * {@see android.location.LocationManager.getLastKnownLocation}.
       */
      manager.requestLocationUpdates(providerName,
                                     /*minTime=*/0,
                                     /*minDistance=*/0,
                                     new LoggingLocationListener(),
                                     Looper.getMainLooper());
      mLocationManager = manager;
      mLocationProviderName = providerName;
    }
    assert mLocationManager != null;
    assert mLocationProviderName != null;
  }

  /**
   * Returns the location of the device.
   *
   * @return the location of the device
   */
  public Location getLocation() {
    initLocation();
    Location location = mLocationManager.getLastKnownLocation(mLocationProviderName);
    if (location == null) {
      Log.e(TAG,
            "Cannot obtain location from provider " + mLocationProviderName);
    }
    return location;
  }

  /** Prevents the phone from going to low-power mode where WiFi turns off. */
  public synchronized void acquireWakeLock() {
    if (mWakeLock == null) {
      if (mContext != null) {
        PowerManager pm = (PowerManager) mContext.getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
          mWakeLock = pm.newWakeLock(PowerManager.SCREEN_DIM_WAKE_LOCK, "tag");
        }
      }
    }

    if (mWakeLock != null) {
      mWakeLock.acquire();
    }
  }

  /** Should be called on application shutdown. Releases global resources. */
  public synchronized void shutDown() {
    if (mWakeLock != null) {
      mWakeLock.release();
    }
  }

  /**
   * Returns true if the phone is in landscape mode.
   */
  public boolean isLandscape() {
    WindowManager wm = (WindowManager) mContext.getSystemService(Context.WINDOW_SERVICE);
    Display display = wm.getDefaultDisplay();
    return display.getWidth() > display.getHeight();
  }

  /**
   * Captures a screenshot of a WebView, except scrollbars, and returns it as a
   * Bitmap.
   *
   * @param webView The WebView to screenshot.
   * @return A Bitmap with the screenshot.
   */
  public static Bitmap captureScreenshot(WebView webView) {
    Picture picture = webView.capturePicture();
    int width = Math.min(
        picture.getWidth(),
        webView.getWidth() - webView.getVerticalScrollbarWidth());
    int height = Math.min(picture.getHeight(), webView.getHeight());
    Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565);
    Canvas cv = new Canvas(bitmap);
    cv.drawPicture(picture);
    return bitmap;
  }

  public List<String> getDeviceFeatures() {
    List<String> features = new ArrayList<String>(Arrays.asList(Config.STATIC_FEATURES));
    if (ProxySettings.deviceCanProxy()) {
      features.add(Config.PROXY);
    }
    return features;
  }

  /**
   * A dummy listener that just logs callbacks.
   */
  private static class LoggingLocationListener implements LocationListener {

    @Override
    public void onLocationChanged(Location location) {
      Log.d(TAG, "location changed");
    }

    @Override
    public void onProviderDisabled(String provider) {
      Log.d(TAG, "provider disabled: " + provider);
    }

    @Override
    public void onProviderEnabled(String provider) {
      Log.d(TAG, "provider enabled: " + provider);
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {
      Log.d(TAG, "status changed: " + provider + "=" + status);
    }
  }

  /**
   * Types of interfaces to return from {@link #getUpInterfaceNames(InterfaceType)}.
   */
  public enum InterfaceType {
    /** Local and external interfaces. */
    ALL,

    /** Only external interfaces. */
    EXTERNAL_ONLY,
  }

  /**
   * Returns a list of up network interfaces.
   *
   * @param ifType  what interfaces to return -- see {@link InterfaceType}.
   * @return a list of up network interface names.
   * @throws SocketException
   */
  public List<String> getUpInterfaceNames(InterfaceType ifType) throws SocketException {
    List<NetworkInterface> interfaces = Collections.list(NetworkInterface.getNetworkInterfaces());

    assert interfaces != null;

    List<String> upInterfaces = new ArrayList<String>();
    // Note that this may return interfaces that are down, but the NetWorkInterface.isUp() call
    // is not compatible with Froyo.
    for (NetworkInterface inf : interfaces) {
      if (!(ifType == InterfaceType.EXTERNAL_ONLY &&
          ("lo".equals(inf.getName()) || inf.getDisplayName().contains("dummy")))) {
        upInterfaces.add(inf.getName());
      }
    }

    return upInterfaces;
  }

  /**
   * Returns the name of the active up interface
   * @return The name of the active up interface
   * @throws SocketException
   */
  public String getActiveUpInterfaceName() throws SocketException {
    List<String> upInterfaces = getUpInterfaceNames(InterfaceType.EXTERNAL_ONLY);
    if (upInterfaces.size() > 1) {
      NetworkInfo netinfo = mConnectivityManager.getActiveNetworkInfo();
      List<String> wifiInterfaces = Arrays.asList(new String[] {"eth0", "wlan0"});
      if (netinfo.getType() == ConnectivityManager.TYPE_WIFI) {
        upInterfaces.retainAll(wifiInterfaces);
      } else {
        upInterfaces.removeAll(wifiInterfaces);
      }
    }
    return upInterfaces.size() > 0 ? upInterfaces.get(0) : null;
  }

  /** Returns a debug printable representation of a string list. */
  public static String debugString(List<String> stringList) {
    StringBuilder result = new StringBuilder("[");
    Iterator<String> listIter = stringList.iterator();
    if (listIter.hasNext()) {
      result.append('"');  // Opening quote for the first string
      result.append(listIter.next());
      while (listIter.hasNext()) {
        result.append("\", \"");
        result.append(listIter.next());
      }
      result.append('"');  // Closing quote for the last string
    }
    result.append(']');
    return result.toString();
  }

  /** Returns a debug printable representation of a string array. */
  public static String debugString(String[] arr) {
    return debugString(Arrays.asList(arr));
  }

  /** Returns a list of PIDs of processes with a given name. */
  public List<String> getPidsViaProcFs(String processName) throws IOException {
    List<String> pids = new ArrayList<String>();
    File dir = new File("/proc");
    String[] children = dir.list();
    if (children != null){
      for (String pid : children){
        if (pid.matches("[0-9]+")){
        BufferedReader in = null;
        try {
          in = new BufferedReader(new FileReader("/proc/" + pid + "/cmdline"));
            String line;
            /* file should only have one line, so no need to loop */
            if ((line = in.readLine()) != null) {
              if (line.startsWith(processName)){
                pids.add(pid);
              }
            }
          } finally {
            if (in != null ) {
              in.close();
            }
          }
        }
      }
    }
    return pids;
  }
}
