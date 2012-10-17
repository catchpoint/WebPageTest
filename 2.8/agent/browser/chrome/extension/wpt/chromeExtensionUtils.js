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
    * Neither the name of the <ORGANIZATION> nor the names of its contributors
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

  Author: Sam Kerner (skerner at google dot com)

 ******************************************************************************/

/**
 * This file holds functions for dealing with chrome's extension API.
 */

goog.provide('wpt.chromeExtensionUtils');

((function() {  // namespace

var NET_ERROR_STRING_TO_WPT_CODE = {
  'net::ERR_NAME_NOT_RESOLVED': 12007,
  'net::ERR_CONNECTION_ABORTED': 12030,
  'net::ERR_ADDRESS_UNREACHABLE': 12029,
  'net::ERR_CONNECTION_REFUSED': 12029,
  'net::ERR_CONNECTION_TIMED_OUT': 12029,
  'net::ERR_CONNECTION_RESET': 12031
};

/**
 * Map chrome's network error strings to the numeric codes expected by
 * WebpageTest.
 */
wpt.chromeExtensionUtils.netErrorStringToWptCode = function(netErrorString) {
  var errorCodeFromMap = NET_ERROR_STRING_TO_WPT_CODE[netErrorString];
  return (errorCodeFromMap === undefined ? 12999 : errorCodeFromMap);
};

})());  // namespace
