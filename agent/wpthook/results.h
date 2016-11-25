/******************************************************************************
Copyright (c) 2010, Google Inc.
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

#pragma once

class Requests;
class Request;
class TestState;
class TrackSockets;
class TrackDns;
class ScreenCapture;
class CxImage;
class WptTest;
class OptimizationChecks;
class Trace;

class Results {
public:
  Results(TestState& test_state, WptTest& test, Requests& requests, 
          TrackSockets& sockets, TrackDns& dns, ScreenCapture& screen_capture,
          Trace &trace);
  ~Results(void);

  void Reset(void);
  void Save(void);

  // test information
  CString _url;

private:
  Requests&     _requests;
  TestState&    _test_state;
  TrackSockets& _sockets;
  TrackDns&     _dns;
  ScreenCapture& _screen_capture;
  WptTest&      _test;
  Trace         &_trace;
  bool          _saved;
  LARGE_INTEGER _last_visual_change;

  CStringA      base_page_CDN_;
  int           base_page_redirects_;
  int           base_page_result_;
  int           base_page_ttfb_;
  LARGE_INTEGER base_page_complete_;
  CStringA      base_page_server_rtt_;
  int           base_page_address_count_;
  bool          adult_site_;

  int count_connect_;
  int count_connect_doc_;
  int count_dns_;
  int count_dns_doc_;
  int count_ok_;
  int count_ok_doc_;
  int count_redirect_;
  int count_redirect_doc_;
  int count_not_modified_;
  int count_not_modified_doc_;
  int count_not_found_;
  int count_not_found_doc_;
  int count_other_;
  int count_other_doc_;
  int certificate_bytes_;
  int visually_complete_;
  int speed_index_;

  DWORD peak_memory_;
  DWORD peak_process_count_;

  void ProcessRequests(void);
  void SavePageData(OptimizationChecks&);
  void SaveRequests(OptimizationChecks&);
  void SaveRequest(gzFile file, gzFile headers, Request * request, int index);
  void SaveImages(void);
  void SaveVideo(void);
  void SaveProgressData(void);
  void SaveStatusMessages(void);
  void SaveImage(CxImage& image, CString file, BYTE quality,
                 bool force_small = false, bool _full_size_video = false);
  bool ImagesAreDifferent(CxImage * img1, CxImage* img2, DWORD bottom_margin, DWORD margin);
  CStringA FormatTime(LARGE_INTEGER t);
  void SaveResponseBodies(void);
  void SaveConsoleLog(void);
  void SaveTimedEvents(void);
  void SaveCustomMetrics(void);
  void SaveUserTiming(void);
  void SaveHistogram(CStringA& histogram, CString file, bool compress);
  CStringA GetHistogramJSON(CxImage& image);
  bool NativeRequestExists(Request * browser_request);
  void SavePriorityStreams();
};
