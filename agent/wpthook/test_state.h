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
class Trace;
#include "WinPCap.h"

const int TEST_RESULT_NO_ERROR = 0;
const int TEST_RESULT_TIMEOUT = 99997;
const int TEST_RESULT_TIMEOUT_CONTENT_ERROR = 99998;
const int TEST_RESULT_CONTENT_ERROR = 99999;

class ProgressData {
public:
  ProgressData(void):_bpsIn(0),_cpu(0.0),_mem(0),_process_count(0) {
    _time.QuadPart = 0; 
  }
  ProgressData(const ProgressData& src){*this = src;}
  ~ProgressData(){       }
  const ProgressData& operator =(const ProgressData& src) {
    _time.QuadPart = src._time.QuadPart;
    _bpsIn = src._bpsIn;
    _cpu = src._cpu;
    _mem = src._mem;
    _process_count = src._process_count;
    return src;
  }
  
  LARGE_INTEGER   _time;
  DWORD           _bpsIn;          // inbound bandwidth
  double          _cpu;            // CPU utilization
  DWORD           _mem;            // allocated memory (in KB)
  DWORD           _process_count;  // number of browser processes
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
  TestState(Results& results, ScreenCapture& screen_capture,
            WptTestHook &test, Trace& trace);
  ~TestState(void);

  void Start();
  void SendingRequest();
  void ActivityDetected();
  void OnNavigate();
  void OnNavigateComplete();
  void OnAllDOMElementsLoaded(DWORD load_time);
  void SetDomLoadingEvent(DWORD domLoading);
  void SetDomInteractiveEvent(DWORD domInteractive);
  void SetDomContentLoadedEvent(DWORD start, DWORD end);
  void SetLoadEvent(DWORD load_event_start, DWORD load_event_end);
  void SetFirstPaint(DWORD first_paint);
  void OnLoad(); // browsers either call this or SetLoadEvent
  void OnStatusMessage(CString status);
  bool IsDone();
  void GrabVideoFrame(bool force = false);
  void CollectData();
  void Reset(bool cascade = true);
  void Init();
  void TitleSet(CString title);
  void UpdateBrowserWindow(DWORD current_width = 0, DWORD current_height = 0);
  DWORD ElapsedMsFromStart(LARGE_INTEGER end) const;
  DWORD ElapsedMsFromLaunch(LARGE_INTEGER end) const;
  void FindBrowserNameAndVersion();
  void AddConsoleLogMessage(CString message);
  void AddTimedEvent(CString timed_event);
  void SetCustomMetrics(CString custom_metrics);
  void SetUserTiming(CString user_timing);
  CString GetConsoleLogJSON();
  CString GetTimedEventsJSON();
  void GetElapsedCPUTimes(double &doc, double &end,
                          double &doc_total, double &end_total);
  void Lock();
  void UnLock();
  void ResizeBrowserForResponsiveTest();
  void CheckResponsive();
  CString TimeLog() {return _file_base + "_test_timing.log";}

  // times
  LARGE_INTEGER _launch;
  LARGE_INTEGER _start;
  LARGE_INTEGER _step_start;
  LARGE_INTEGER _first_navigate;
  LARGE_INTEGER _dom_elements_time;
  DWORD _dom_interactive;
  DWORD _dom_loading;
  DWORD _dom_content_loaded_event_start;
  DWORD _dom_content_loaded_event_end;
  LARGE_INTEGER _on_load;
  DWORD _load_event_start;
  DWORD _load_event_end;
  DWORD _first_paint;
  LARGE_INTEGER _render_start;
  LARGE_INTEGER _first_activity;
  LARGE_INTEGER _last_activity;
  LARGE_INTEGER _ms_frequency;
  LARGE_INTEGER _title_time;
  SYSTEMTIME    _start_time;

  //Timeout measurer
  LARGE_INTEGER _timeout_start_time;

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
  int _fixed_viewport;
  int _dom_element_count;
  int _is_responsive;
  int _viewport_specified;
  DWORD _working_set_main_proc;
  DWORD _working_set_child_procs;
  DWORD _process_count;

  bool  _active;
  int   _current_document;
  bool  _exit;
  bool navigated_;
  bool navigating_;
  bool no_gdi_;
  bool gdi_only_;
  UINT paint_msg_;
  bool received_data_;

  HWND  _frame_window;

  WptTestHook& _test;
  
  CAtlList<ProgressData>   _progress_data;     // CPU, memory and Bandwidth
  CAtlList<StatusMessage>  _status_messages;   // Browser status
  CString                  _custom_metrics;    // JSON-formatted custom metrics data
  CString                  _user_timing;       // JSON-formatted user timing data (from Chrome traces)
  CString                  _file_base;         // Base path for writing results files
  int reported_step_;
  CStringA  current_step_name_;
  SharedMem shared_;
  LogDuration * logMeasure_;

private:
  bool  _first_request_sent;
  bool  _started;
  bool  _viewport_adjusted;
  int   _next_document;
  Results&  _results;
  ScreenCapture& _screen_capture;
  Trace &_trace;
  HANDLE  _data_timer;
  CAtlList<CString>        _console_log_messages; // messages to the console
  CAtlList<CString>        _timed_events; // any supported timed events
  CString process_full_path_;
  CString process_base_exe_;
  CString last_title_;
  CWinPCap    _winpcap;



  // tracking of the periodic data capture
  LARGE_INTEGER  _last_data;
  ULARGE_INTEGER _last_cpu_idle;
  ULARGE_INTEGER _last_cpu_kernel;
  ULARGE_INTEGER _last_cpu_user;
  DWORD _video_capture_count;
  LARGE_INTEGER  _last_video_time;
  FILETIME      _start_cpu_time;
  FILETIME      _doc_cpu_time;
  FILETIME      _end_cpu_time;
  FILETIME      _start_total_time;
  FILETIME      _doc_total_time;
  FILETIME      _end_total_time;

  CRITICAL_SECTION  _data_cs;

  void Done(bool force = false);
  void CollectSystemStats(LARGE_INTEGER &now);
  void CheckTitle();
  void FindViewport(bool force = false);
  void RecordTime(CString time_name, DWORD time, LARGE_INTEGER * out_time);
  DWORD ElapsedMs(LARGE_INTEGER start, LARGE_INTEGER end) const;
  void GetCPUTime(FILETIME &cpu_time, FILETIME &total_time);
  double GetElapsedMilliseconds(FILETIME &start, FILETIME &end);
  void CollectMemoryStats();
  void UpdateStoredBrowserVersion();
  void IncrementStep(void);
};
