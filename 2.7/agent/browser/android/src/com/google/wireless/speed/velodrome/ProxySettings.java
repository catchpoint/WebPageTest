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
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.wifi.WifiConfiguration;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.util.Log;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.List;

/**
 * Performs all the muck necessary to programmatically set an HTTP proxy
 * Note: Right now this class only supports the ability to set the wifi proxy.
 */
public class ProxySettings {

  // The HONEYCOMB constant is not defined until SDK 11.  For compatibility
  // with older phones, we are on SDK 8, so we define it ourselves.
  private static final int HONEYCOMB = android.os.Build.VERSION_CODES.FROYO + 3;
  private static final String TAG = "Velodrome:ProxySettings";
  private static final String PROXY_NONE = "NONE";
  private static final String PROXY_STATIC = "STATIC";
  private static final String PROXY_UNASSIGNED = "UNASSIGNED";

  private static Activity sMainActivity;

  public ProxySettings(Activity mainActivity) {
    sMainActivity = mainActivity;
  }

  /**
   * @return Whether the android build in use supports our method of setting a
   *         proxy.
   */
  public static boolean deviceCanProxy() {
    WifiManager mgr = (WifiManager)sMainActivity.getSystemService(Context.WIFI_SERVICE);
    return android.os.Build.VERSION.SDK_INT >= HONEYCOMB && mgr.isWifiEnabled();
  }

  /**
   * Reads the current proxy settings of the device. Assumes this device does support proxying.
   * Note: Only Wifi proxy is supported at this time.
   * @return A URL representing the proxy settings of the current device or null if none
   * @throws RuntimeException Occurs if an exception occurs using reflection
   */
  public URL getHttpProxy() throws RuntimeException {
    WifiManager mgr = (WifiManager)sMainActivity.getSystemService(Context.WIFI_SERVICE);
    List<WifiConfiguration> configs = mgr.getConfiguredNetworks();
    WifiConfiguration config = findActiveNetwork(mgr.getConnectionInfo(), configs);
    String host = null;
    int port = 0;
    try {
      Class<? extends WifiConfiguration> configClass = config.getClass();
      Field proxySettingsField = configClass.getField("proxySettings");
      Object proxySettingsObject = proxySettingsField.get(config);

      if (proxySettingsObject.toString().contains(PROXY_NONE) ||
            proxySettingsObject.toString().contains(PROXY_UNASSIGNED)) {
        Log.i(TAG, "No previous proxy setting was found.");
        return null;
      }

      Field linkPropertiesField = configClass.getField("linkProperties");
      Object linkPropertiesObject = linkPropertiesField.get(config);
      Class<?> linkPropertiesClass = linkPropertiesObject.getClass();

      Method getHttpProxyMethod =
          linkPropertiesClass.getMethod("getHttpProxy", (Class<?>[]) null);
      Object proxyPropertiesObject = getHttpProxyMethod.invoke(linkPropertiesObject,
                                                               (Object[]) null);
      Class<?> proxyPropertiesClass = proxyPropertiesObject.getClass();

      Method getHostMethod = proxyPropertiesClass.getMethod("getHost", (Class<?>[]) null);
      Method getPortMethod = proxyPropertiesClass.getMethod("getPort", (Class<?>[]) null);

      host = (String) getHostMethod.invoke(proxyPropertiesObject, (Object[]) null);
      port = (Integer) getPortMethod.invoke(proxyPropertiesObject, (Object[]) null);

      if (!host.startsWith("http://") && !host.startsWith("https://")) {
        host = "http://" + host;
      }
      return new URL(host + ":" + port);
    } catch (MalformedURLException e) {
      Log.e(TAG, "No old proxy found: " + host + ":" + port);
      return null;
    } catch (Exception e) {
      e.printStackTrace();
      throw new RuntimeException("Using reflection failed to inspect this device's proxy settings");
    }
  }

  /**
   * Removes the HTTP proxy entirely.
   * Note: Only Wifi proxy is supported at this time.
   * @return Whether removing the HTTP proxy was successful.
   */
  public boolean disableProxy() {
    return setHttpProxy(null, 0);
  }

  /**
   * Programmatically configures the HTTP proxy settings on a post-gingerbread Android device.
   * A null or empty host will disable the proxy settings. Removes any proxy setting if
   * the given proxyUrl is null.
   * Note: Only Wifi proxy is supported at this time.
   * @param proxyUrl
   * @return Whether setting the proxy was successful
   * @throws RuntimeException If anything goes wrong while setting the proxy and using reflection.
   * @throws IllegalStateException If the android version is less than Honeycomb
   */
  public boolean setHttpProxy(URL proxyUrl) throws RuntimeException {
    if (proxyUrl != null) {
      int proxyPort = proxyUrl.getPort() == -1 ? proxyUrl.getDefaultPort() : proxyUrl.getPort();
      return setHttpProxy(proxyUrl.getHost(), proxyPort);
    } else {
      return disableProxy();
    }
  }

  /**
   * Programmatically configures the HTTP proxy settings on a post-gingerbread Android device.
   * A null or empty host will disable the proxy settings.
   * Note: Only Wifi proxy is supported at this time.
   * @param host Either an IP address or a host name
   * @param port
   * @return Whether setting the proxy was successful
   * @throws RuntimeException If anything goes wrong while setting the proxy and using reflection.
   * @throws IllegalStateException If the android version is less than Honeycomb
   */
  public boolean setHttpProxy(String host, int port) throws RuntimeException {
    WifiManager mgr = null;
    mgr = (WifiManager)sMainActivity.getSystemService(Context.WIFI_SERVICE);

    List<WifiConfiguration> configs = null;
    try {
      configs = mgr.getConfiguredNetworks();
      WifiConfiguration config = findActiveNetwork(mgr.getConnectionInfo(), configs);

      Class<?> proxyPropertiesClass = Class.forName("android.net.ProxyProperties");
      Class<?> configClass = config.getClass();
      Field proxySettingsField = configClass.getField("proxySettings");

      Class<?> proxySettingsEnum =
          Class.forName("android.net.wifi.WifiConfiguration$ProxySettings");
      Object[] psConstants = proxySettingsEnum.getEnumConstants(); //NONE, STATIC, UNASSIGNED

      Field linkPropertiesField = configClass.getField("linkProperties");
      Object linkPropertiesObject = linkPropertiesField.get(config);
      Class<?> linkPropertiesClass = linkPropertiesObject.getClass();
      Method setHttpProxyMethod =
          linkPropertiesClass.getDeclaredMethod("setHttpProxy", proxyPropertiesClass);

      if (host == null || host.equals("")) {
        /* Reflection to achieve:
         * config.proxySettings = ProxySettings.NONE;
         */
        Object proxySetting = findProxyEnum(psConstants, PROXY_NONE);
        proxySettingsField.set(config, proxySetting);

        /* Reflection to achieve:
         * config.linkProperties.setHttpProxy(null);
         */
        setHttpProxyMethod.invoke(linkPropertiesObject, new Object[] {null});
        Log.i(TAG, "Proxy Settings disabled");
      } else {
        /* Reflection to achieve:
         * android.net.ProxyProperties proxy = new android.net.ProxyProperties(ip, port, null);
         * params: String ip, int port, String exclusion_list
         */
        Class<?>[] ppArgsClass = new Class[] { String.class, int.class, String.class };
        Constructor<?> ppArgsConstructor = proxyPropertiesClass.getConstructor(ppArgsClass);
        Object[] ppArgs = new Object[] {host, port, null };
        Object pp = ppArgsConstructor.newInstance(ppArgs);

        /* Reflection to achieve:
         * config.proxySettings = ProxySettings.STATIC;
         */
        Object proxySetting = findProxyEnum(psConstants, PROXY_STATIC);
        proxySettingsField.set(config, proxySetting);

        /* Reflection to achieve:
         * config.linkProperties.setHttpProxy(proxy);
         */
        setHttpProxyMethod.invoke(linkPropertiesObject, pp);
      }

      int netid = mgr.updateNetwork(config);

      boolean success = netid != -1;

      // These calls help the Android pick up the new proxy settings
      if (netid != -1) {
        success &= mgr.disableNetwork(netid);
        success &= mgr.enableNetwork(netid, true);
        success &= mgr.saveConfiguration();
      }

      if (success && host != null && !host.equals("")) {
        Log.i(TAG, "Proxy Settings changed to " + host + ":" + port);
      } else if (!success) {
        throwProxyError("Could not set the http proxy: " + host + ":" + port);
      }

      ConnectivityManager cm = (ConnectivityManager)sMainActivity.getApplicationContext()
          .getSystemService(Context.CONNECTIVITY_SERVICE);

      int tries = 0;
      while (tries < Config.WIFI_RECONNECT_TRIES &&
             !cm.getNetworkInfo(ConnectivityManager.TYPE_WIFI).isConnected()) {
        // Block until the network is back up and ready to go or until it has been too long
        Log.i(TAG, "Waiting for wifi to reconnect: attempt #" + (tries + 1));
        Thread.sleep(Config.RECONNECT_WAIT_INTERVAL_MS);
        tries++;
      }

      if (tries >= Config.WIFI_RECONNECT_TRIES) {
        throwProxyError("It took too long for wifi to reconnect");
      }

      return success;

    } catch (NoSuchFieldException e) {
      throwProxyError("No field: " + e);
    } catch (IllegalAccessException e) {
      throwProxyError("No object: " + e);
    } catch (ClassNotFoundException e) {
      throwProxyError("No class: " + e);
    } catch (NoSuchMethodException e) {
      throwProxyError("No method: " + e);
    } catch (InstantiationException e) {
      throwProxyError("No method: " + e);
    } catch (Exception e) {
      throwProxyError("An error occurred while setting the proxy" + e);
    }
    return false;
  }

  /**
   * Log an error to the Android console and throws a RunTimeException
   * @param s A string to log
   */
  private void throwProxyError(String s) {
    Log.e(TAG, s);
    throw new ProxySettingsException(s);
  }

  /**
   * Finds the requested proxy setting within the enum array
   * @param enums An array of enum Objects pulled from ProxySettings
   * @param name A string name to look for in the enums array
   * @return The enum who's toString contains name
   */
  private Object findProxyEnum(Object[] enums, String name) {
    for (Object e : enums) {
      if (e.toString().contains(name)) {
        return e;
      }
    }
    throw new IllegalStateException("The requested proxy enum " + name + " was not found");
  }

  /**
   * Returns the wifi configuration object from the given list that corresponds to the given info
   * @param curr Info about the current wifi configuration
   * @param networks A list of available wifi network configurations
   * @return The wifi configuration object corresponding to the given info or null if not found
   */
  private WifiConfiguration findActiveNetwork(WifiInfo curr, List<WifiConfiguration> networks) {
    String ssid = curr.getSSID();
    for (final WifiConfiguration w : networks){
      if (w.SSID.replaceAll("\"", "").equals(ssid)){
        return w;
      }
    }
    throw new IllegalStateException("Could not find an active network.");
  }
}
