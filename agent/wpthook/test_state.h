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

class Results;
class ScreenCapture;
class WptTestHook;

const int TEST_RESULT_NO_ERROR = 0;
const int TEST_RESULT_TIMEOUT = 99997;
const int TEST_RESULT_TIMEOUT_CONTENT_ERROR = 99998;
const int TEST_RESULT_CONTENT_ERROR = 99999;

class CProgressData {
public:
  CProgressData(void):ms(0),bpsIn(0),cpu(0.0),mem(0){}
  CProgressData(const CProgressData& src){*this = src;}
  ~CProgressData(){       }
  const CProgressData& operator =(const CProgressData& src) {
    ms = src.ms;
    bpsIn = src.bpsIn;
    cpu = src.cpu;
    mem = src.mem;
    return src;
  }
  
  DWORD           ms;             // milliseconds since start
  DWORD           bpsIn;          // inbound bandwidth
  double          cpu;            // CPU utilization
  DWORD           mem;            // Working set size (in KB)
};

class TestState {
public:
  TestState(int test_timeout, bool end_on_load, Results& results,
            ScreenCapture& screen_capture, WptTestHook &test);
  ~TestState(void);

  void Start();
  void ActivityDetected();
  void OnNavigate();
  void OnLoad(DWORD load_time);
  void OnAllDOMElementsLoaded(DWORD load_time);
  bool IsDone();
  void GrabVideoFrame(bool force = false);
  void CheckStartRender();
  void RenderCheckThread();
  void CollectData();
  void Reset(bool cascade = true);
  void Init();

  // times
  LARGE_INTEGER _start;
  LARGE_INTEGER _step_start;
  LARGE_INTEGER _on_load;
  LARGE_INTEGER _dom_elements_time;
  LARGE_INTEGER _render_start;
  LARGE_INTEGER _first_activity;
  LARGE_INTEGER _last_activity;
  LARGE_INTEGER _ms_frequency;
  SYSTEMTIME    _start_time;

  LARGE_INTEGER _first_byte;
  int _doc_requests;
  int _requests;
  int _doc_bytes_in;
  int _bytes_in;
  int _doc_bytes_out;
  int _bytes_out;
  int _last_bytes_in;
  int _test_result;

  bool  _active;
  int   _current_document;
  bool  _exit;

  HWND  _frame_window;
  HWND  _document_window;
  bool  _screen_updated;

  WptTestHook& _test;
  
  // CPU, memory and BwIn information.
  CAtlList<CProgressData> _progress_data;

private:
  int   _test_timeout; 
  bool  _end_on_load;
  int   _next_document;
  Results&  _results;
  ScreenCapture& _screen_capture;
  HANDLE  _render_check_thread;
  HANDLE  _check_render_event;
  HANDLE  _data_timer;

  // tracking of the periodic data capture
  DWORD _last_data_ms;
  ULARGE_INTEGER _last_cpu_idle;
  ULARGE_INTEGER _last_cpu_kernel;
  ULARGE_INTEGER _last_cpu_user;
  DWORD _video_capture_count;
  LARGE_INTEGER     _last_video_time;

  CRITICAL_SECTION  _data_cs;

  void Done(bool force = false);
  void FindBrowserWindow(void);
  void CollectSystemStats(DWORD ms_from_start);
};
