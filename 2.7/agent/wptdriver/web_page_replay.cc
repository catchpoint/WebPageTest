/******************************************************************************
Copyright (c) 2011, Google Inc.
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
******************************************************************************/
#include "StdAfx.h"
#include "web_page_replay.h"
#include <WinInet.h>

/*-----------------------------------------------------------------------------
  Send a command to Web Page Replay (e.g. "record" or "replay").
-----------------------------------------------------------------------------*/
bool SendWebPageReplayCommand(const CString& wpr_host, const CString& command) {
  bool result = false;
  CString url;
  url.Format(_T("http://%s/web-page-replay-command-%s"), wpr_host, command);

  // Use WinInet to make the request
  HINTERNET internet = InternetOpen(
      _T("WebPagetest Driver"), INTERNET_OPEN_TYPE_PRECONFIG, NULL, NULL, 0);
  if (internet) {
    HINTERNET http_request = InternetOpenUrl(internet, url, NULL, 0,
                                             INTERNET_FLAG_NO_CACHE_WRITE |
                                             INTERNET_FLAG_NO_UI |
                                             INTERNET_FLAG_PRAGMA_NOCACHE |
                                             INTERNET_FLAG_RELOAD, NULL);
    if (http_request) {
      TCHAR status_code[1024] = TEXT("\0");
      DWORD len = _countof(status_code);
      if (HttpQueryInfo(http_request, HTTP_QUERY_STATUS_CODE, status_code,
                        &len, NULL)) {
        result = 0 == lstrcmpi(status_code, _T("200"));
      }
      InternetCloseHandle(http_request);
    }
    InternetCloseHandle(internet);
  }
  return result;
}

/*-----------------------------------------------------------------------------
  Put Web Page Replay server in record mode.
-----------------------------------------------------------------------------*/
bool WebPageReplaySetRecordMode(const CString& wpr_host) {
  return SendWebPageReplayCommand(wpr_host, _T("record"));
}

/*-----------------------------------------------------------------------------
  Put Web Page Replay server in record mode.
-----------------------------------------------------------------------------*/
bool WebPageReplaySetReplayMode(const CString& wpr_host) {
  return SendWebPageReplayCommand(wpr_host, _T("replay"));
}
