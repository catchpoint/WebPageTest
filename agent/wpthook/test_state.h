#pragma once

class Results;
class ScreenCapture;

class CProgressData
{
public:
  CProgressData(void):ms(0),bpsIn(0),cpu(0.0),mem(0){}
  CProgressData(const CProgressData& src){*this = src;}
  ~CProgressData(){       }
  const CProgressData& operator =(const CProgressData& src)
  {
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

class TestState
{
public:
  TestState(int test_timeout, bool end_on_load, Results& results,
            ScreenCapture& screen_capture);
  ~TestState(void);

  void Start();
  void ActivityDetected();
  void OnNavigate();
  void OnLoad();
  bool IsDone();
  void GrabVideoFrame(bool force = false);
  void CheckStartRender();
  void RenderCheckThread();
  void CollectSystemStats(DWORD ms_from_start, LARGE_INTEGER now);
  void CollectData();

  // times
  LARGE_INTEGER _start;
  LARGE_INTEGER _on_load;
  LARGE_INTEGER _render_start;
  LARGE_INTEGER _first_activity;
  LARGE_INTEGER _last_activity;
  LARGE_INTEGER _ms_frequency;

  LARGE_INTEGER _first_byte;
  int _doc_requests;
  int _requests;
  int _doc_bytes_in;
  int _bytes_in;
  int _doc_bytes_out;
  int _bytes_out;
  int _last_bytes_in;

  bool  _active;
  int   _current_document;

  HWND  _frame_window;
  HWND  _document_window;
  bool  _screen_updated;
  
  // CPU, memory and BwIn information.
  CAtlList<CProgressData> _progress_data;

private:
  int   _test_timeout; 
  bool  _timeout;
  bool  _end_on_load;
  int   _next_document;
  Results&  _results;
  ScreenCapture& _screen_capture;
  HANDLE  _render_check_thread;
  bool    _exit;
  HANDLE  _check_render_event;
  HANDLE  _data_timer;

  // tracking of the periodic data capture
  DWORD _last_data_ms;
  LARGE_INTEGER _last_real_time;
	unsigned __int64 _last_process_time;
  DWORD _video_capture_count;
  LARGE_INTEGER     _last_video_time;

  CRITICAL_SECTION  _data_cs;

  void Done();
  void FindBrowserWindow(void);
};
