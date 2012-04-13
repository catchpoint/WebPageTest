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

class ProgressData {
public:
  ProgressData(void):_bpsIn(0),_cpu(0.0),_mem(0){ _time.QuadPart = 0; }
  ProgressData(const ProgressData& src){*this = src;}
  ~ProgressData(){       }
  const ProgressData& operator =(const ProgressData& src) {
    _time.QuadPart = src._time.QuadPart;
    _bpsIn = src._bpsIn;
    _cpu = src._cpu;
    _mem = src._mem;
    return src;
  }
  
  LARGE_INTEGER   _time;
  DWORD           _bpsIn;          // inbound bandwidth
  double          _cpu;            // CPU utilization
  DWORD           _mem;            // Working set size (in KB)
};

class StatusMessage {
public:
  StatusMessage(void){ _time.QuadPart = 0; }
  StatusMessage(CString status):_status(status){ 
    QueryPerformanceCounter(&_time);
  }
  StatusMessage(const StatusMessage& src){*this = src;}
  ~StatusMessage(){       }
  const StatusMessage& operator =(const StatusMessage& src) {
    _time.QuadPart = src._time.QuadPart;
    _status = src._status;
    return src;
  }
  
  LARGE_INTEGER   _time;
  CString         _status;
};

class TestState {
public:
  TestState(Results& results,ScreenCapture& screen_capture, WptTestHook &test);
  ~TestState(void);

  void Start();
  void ActivityDetected();
  void OnNavigate();
  void OnAllDOMElementsLoaded(DWORD load_time);
  void SetDomContentLoadedEvent(DWORD start, DWORD end);
  void SetLoadEvent(DWORD load_event_start, DWORD load_event_end);
  void OnLoad(); // browsers either call this or SetLoadEvent
  void OnStatusMessage(CString status);
  bool IsDone();
  void GrabVideoFrame(bool force = false);
  void CheckStartRender();
  void RenderCheckThread();
  void CollectData();
  void Reset(bool cascade = true);
  void Init();
  void TitleSet(CString title);
  void UpdateBrowserWindow();
  void SetDocument(HWND wnd);
  DWORD ElapsedMsFromStart(LARGE_INTEGER end) const;
  void FindBrowserNameAndVersion();
  void AddConsoleLogMessage(CString message);
  void AddTimelineEvent(CString timeline_event);
  CString GetConsoleLogJSON();
  CString GetTimelineJSON();

  // times
  LARGE_INTEGER _start;
  LARGE_INTEGER _step_start;
  LARGE_INTEGER _first_navigate;
  LARGE_INTEGER _dom_elements_time;
  DWORD _dom_content_loaded_event_start;
  DWORD _dom_content_loaded_event_end;
  LARGE_INTEGER _on_load;
  DWORD _load_event_start;
  DWORD _load_event_end;
  LARGE_INTEGER _render_start;
  LARGE_INTEGER _first_activity;
  LARGE_INTEGER _last_activity;
  LARGE_INTEGER _ms_frequency;
  LARGE_INTEGER _title_time;
  DWORD _aft_time_ms;
  SYSTEMTIME    _start_time;

  LARGE_INTEGER _first_byte;
  int _doc_requests;
  int _requests;
  int _doc_bytes_in;
  int _bytes_in;
  int _bytes_in_bandwidth;
  int _doc_bytes_out;
  int _bytes_out;
  int _last_bytes_in;
  int _test_result;
  CString _title;
  CString _browser_name;
  CString _browser_version;
  CString _user_agent;

  bool  _active;
  bool _capturing_aft;
  int   _current_document;
  bool  _exit;

  HWND  _frame_window;
  HWND  _document_window;
  bool  _screen_updated;

  WptTestHook& _test;
  
  CAtlList<ProgressData>   _progress_data;     // CPU, memory and Bandwidth
  CAtlList<StatusMessage>  _status_messages;   // Browser status

private:
  int   _next_document;
  Results&  _results;
  ScreenCapture& _screen_capture;
  HANDLE  _render_check_thread;
  HANDLE  _check_render_event;
  HANDLE  _data_timer;
  CAtlList<CString>        _timeline_events;  // Chrome dev tools timeline
  CAtlList<CString>        _console_log_messages; // messages to the console

  // tracking of the periodic data capture
  LARGE_INTEGER  _last_data;
  ULARGE_INTEGER _last_cpu_idle;
  ULARGE_INTEGER _last_cpu_kernel;
  ULARGE_INTEGER _last_cpu_user;
  DWORD _video_capture_count;
  LARGE_INTEGER     _last_video_time;

  CRITICAL_SECTION  _data_cs;

  void Done(bool force = false);
  void CollectSystemStats(LARGE_INTEGER &now);
  void FindViewport();
  void RecordTime(CString time_name, DWORD time, LARGE_INTEGER * out_time);
  DWORD ElapsedMs(LARGE_INTEGER start, LARGE_INTEGER end) const;
};
