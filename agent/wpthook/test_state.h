#pragma once

class Results;
class ScreenCapture;

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

  // times
  LARGE_INTEGER _start;
  LARGE_INTEGER _on_load;
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

  bool  _active;
  int   _current_document;

private:
  int   _test_timeout; 
  bool  _timeout;
  bool  _end_on_load;
  int   _next_document;
  Results&  _results;
  ScreenCapture& _screen_capture;
};
