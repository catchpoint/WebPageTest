#pragma once

class Results;

class TestState
{
public:
  TestState(int test_timeout, bool end_on_load, Results& results);
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

  bool  _active;

private:
  int   _test_timeout; 
  bool  _timeout;
  bool  _end_on_load;
  bool  _pending_document;
  Results&  _results;
};
