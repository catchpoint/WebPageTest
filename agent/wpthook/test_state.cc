#include "StdAfx.h"
#include "test_state.h"

const DWORD ACTIVITY_TIMEOUT = 2000;
const DWORD ON_LOAD_GRACE_PERIOD = 1000;

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TestState::TestState(int test_timeout, bool end_on_load, Results& results):
  _test_timeout(test_timeout)
  ,_active(false)
  ,_timeout(false)
  ,_pending_document(true)
  ,_end_on_load(end_on_load)
  ,_results(results){
  _start.QuadPart = 0;
  _on_load.QuadPart = 0;
  _first_activity.QuadPart = 0;
  _last_activity.QuadPart = 0;
  QueryPerformanceFrequency(&_ms_frequency);
  _ms_frequency.QuadPart = _ms_frequency.QuadPart / 1000;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TestState::~TestState(void){
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::Start(){
  QueryPerformanceCounter(&_start);
  _results.Reset();
  _timeout = false;
  _active = true;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::ActivityDetected(){
  if (_active) {
    QueryPerformanceCounter(&_last_activity);
    if (!_first_activity.QuadPart)
      _first_activity.QuadPart = _last_activity.QuadPart;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::OnNavigate(){
  if (_active) {
    ATLTRACE2(_T("[wpthook] TestState::OnNavigate()\n"));
    _on_load.QuadPart = 0;
    _pending_document = true;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::OnLoad(){
  if (_active) {
    ATLTRACE2(_T("[wpthook] TestState::OnLoad()\n"));
    QueryPerformanceCounter(&_on_load);
    _pending_document = false;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool TestState::IsDone(){
  bool done = false;

  if (_active){
    LARGE_INTEGER now;
    QueryPerformanceCounter(&now);
    __int64 elapsed_test = 0;
    __int64 elapsed_doc = 0;
    __int64 elapsed_activity = 0;

    // calculate the varous elapsed times
    if (_start.QuadPart && now.QuadPart >= _start.QuadPart)
      elapsed_test = (now.QuadPart - _start.QuadPart) / _ms_frequency.QuadPart;

    if (_on_load.QuadPart && now.QuadPart >= _on_load.QuadPart)
      elapsed_doc = (now.QuadPart - _on_load.QuadPart) 
                    / _ms_frequency.QuadPart;

    if (_last_activity.QuadPart && now.QuadPart >= _last_activity.QuadPart)
      elapsed_activity = (now.QuadPart - _last_activity.QuadPart)
                         / _ms_frequency.QuadPart;

    if (elapsed_test > _test_timeout){
      // the test timed out
      _timeout = true;
      done = true;
    } else if (!_pending_document && _end_on_load &&
                elapsed_doc && elapsed_doc > ON_LOAD_GRACE_PERIOD){
      // end 1 second after onLoad regardless of activity
      done = true;
    } else if (!_pending_document && !_end_on_load &&
                elapsed_doc && elapsed_doc > ON_LOAD_GRACE_PERIOD &&
                elapsed_activity && elapsed_activity > ACTIVITY_TIMEOUT){
      // the normal mode of waiting for 2 seconds of no network activity after
      // onLoad
      done = true;
    }

    if (done) {
      _results._on_load_time = (int)elapsed_doc;
      _results._activity_time = (int)elapsed_activity;
    }
  }

  return done;
}
