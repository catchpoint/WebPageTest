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

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.util.List;

/**
 * Runs tcpdump in background, captures pcap in a file or byte array.
 *
 * @author Michael Klepikov
 */
public class TcpdumpRunner {

  private static final String TAG = "Velodrome.tcpdump";

  /** Default value of the tcpdump command. */
  private static final String DEFAULT_COMMAND = "/system/xbin/tcpdump";

  /** The tcpdump command. Must be a full path for isInstalled() to work.
   * TODO(skerner): Users report that tcpdump can not be used unless chmod +s
   * is run on it on Android 2.2 .  Can we do this automatically?
   */
  private String mCommand;

  /** If not null, captures tcpdump stdout -- when not writing to a file. */
  private ByteArrayOutputStream mTcpdumpOut;

  private final PhoneUtils mPhoneUtils;

  /** Initializes the object with a default command, ready to call launch(). */
  public TcpdumpRunner(PhoneUtils phoneUtils) {
    mCommand = DEFAULT_COMMAND;
    mPhoneUtils = phoneUtils;
  }

  /** Returns whether the tcpdump binary is installed. */
  public boolean isInstalled() {
    return new File(mCommand).exists();
  }

  /**
   * Runs a command in a new subprocess. Spawns a thread to track this process.
   */
  private class CommandRunnerThread extends Thread {
    String cmd;

    public CommandRunnerThread(String cmd) {
      this.cmd = cmd;
    }

    @Override
    public void run() {
      try {
        runCommand(this.cmd);
      } catch (IOException e) {
        Log.e(TAG, "Couldn't run: " + this.cmd);
      }
    }
  }

  private static int runCommand(String cmd) throws IOException {
    Process p = Runtime.getRuntime().exec(cmd);
    try {
      p.waitFor();
      int exitVal = p.exitValue();
      if (exitVal != 0) {
        Log.e(TAG, "Command Failed: " + cmd);
        return exitVal;
      }
    } catch (InterruptedException e) {
      Log.w(TAG, "Command Interrupted: " + cmd);
    }
    return -1;
  }

  /**
   * Runs a command in a new subprocess and blocks the calling thread until the
   * call completes
   *
   * @param cmd The command to run
   * @return Returns the exit value for the subprocess
   * @throws IOException
   */
  public int runBlockingCommand(String cmd) throws IOException {
    chillOut();
    return runCommand(cmd);
  }

  /**
   * Runs a command in a new subprocess and does not block the calling thread
   * @param cmd The command to run
   */
  public void runNonblockingCommand(String cmd) {
    chillOut();
    new CommandRunnerThread(cmd).start();
  }

  /*
   * Without this call, Runtime.exec() would occasionally fork and exec,
   * but the child process (and the calling thread) would hang before replacing
   * its image. This would hang the application.
   */
  private void chillOut() {
    Runtime.getRuntime().gc();
    try {
      Thread.sleep(Config.DELAY_BEFORE_EXEC_MS);
    } catch (InterruptedException e) {
      Log.d(TAG, "sleep interrupted");
    }
  }

  /**
   * Starts tcpdump capture.
   *
   * @param netInterface the name of the network interface to watch. If null,
   *        watch all.
   * @param outFile the file to write pcap output. If null, collect in memory
   *        and return via getPcapData().
   * @throws IOException if an error occurs during launch
   */
  public void launch(String netInterface, File outFile) throws IOException {
    /*
     * -p   : Don't put into promiscuous mode
     * -s 0 : Capture entire packets
     * -n   : Leave IPs and ports as numeric, don't reverse-DNS
     * -w   : Capture to output file
     * -i   : Capture on this interface
     */
    String cmd =
        mCommand + " -p -s 0 -n -w " + (outFile != null ? outFile : "-")
            + (netInterface != null ? " -i " + netInterface : "");

    Log.i(TAG, "Running: " + cmd);
    runNonblockingCommand(cmd);
  }

  /**
   * Terminates a running tcpdump command. If not running, does nothing. If it
   * finds more than one tcpdump process running, will try to kill all.
   *
   * Background: I started with Process.destroy(), but that doesn't work well --
   * apparently it does a kill -9, and then tcpdump doesn't flush its output, so
   * I end up with randomly truncated pcap data. Tcpdump is <i>meant</i> to be
   * kill'ed, there is no other good way to stop it, unless I know the dump size
   * in advance, which I don't, but it has to be a regular kill, not -9. I
   * really wish Process gave me either its PID or a way to soft-kill it, but it
   * doesn't, and that's a bummer.
   */
  public void stop() throws IOException {
    // TODO(skerner): kill only the PID of the tcpdump instance that was
    // started by this application.
    List<String> pids = mPhoneUtils.getPidsViaProcFs(mCommand);
    if (pids.size() > 1) {
      Log.e(TAG, "More than one " + mCommand + " running, will kill them all");
    }
    for (String pid : pids) {
      Log.d(TAG, "Killing PID: " + pid);
      runBlockingCommand("kill " + pid);
    }
  }

  /**
   * Returns the bytes of tcpdump stdout.
   * <p>
   * Can be called any time after {@link #launch(String, File)}, usually after
   * {@link #stop()}. Only makes sense to call if the outFile parameter was
   * passed as null to {@link #launch(String, File)}.
   *
   * @throws IllegalStateException if not capturing tcpdump stdout
   */
  public byte[] getPcapData() {
    if (mTcpdumpOut == null)
      throw new IllegalStateException("Not capturing tcpdump stdout");

    return mTcpdumpOut.toByteArray();
  }
}
