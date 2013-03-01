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

/**
 * The interface to display user-visible messages on the main UI. The main UI has two display
 * widgets, the URL EditText box on the top and the main display screen below the URL box.
 */
public interface UiMessageDisplay {
  static final String TEXT_COLOR_DEFAULT = "";
  static final String TEXT_COLOR_RED = "red";
  static final String TEXT_COLOR_ORANGE = "orange";

  /**
   * Shows a message on the main display screen.
   * @param message
   */
  void showMessage(String message);

  /**
   * Shows a message on the main display screen.
   * @param message
   * @param textColor
   */
  void showMessage(String message, String textColor);

  /**
   * Shows a message on the main display screen without saving the message into the
   * "History Messages" list.
   * @param message
   */
  void showTemporyMessage(String message);

  /**
   * Changes the text & state of URL EditText control on the UI screen.
   * @param enabled Whether to enable to disable (make it readonly) the URL EditText box.
   * @param text The text to show in the URL EditText box.
   */
  void setUrlEdit(boolean enabled, String text);
}
