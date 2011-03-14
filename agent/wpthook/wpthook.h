#pragma once
#include "hook_winsock.h"
#include "hook_gdi.h"
#include "wpt_driver.h"
#include "requests.h"
#include "track_dns.h"
#include "track_sockets.h"
#include "test_state.h"
#include "results.h"
#include "screen_capture.h"

extern HINSTANCE global_dll_handle; // DLL handle

class WptHook
{
public:
  WptHook(void);
  ~WptHook(void);

  void Init();
  void BackgroundThread();
  bool OnMessage(UINT message, WPARAM wParam, LPARAM lParam);

private:
  CGDIHook  _gdi_hook;
  CWsHook   _winsock_hook;
  HANDLE    _background_thread;
  HWND      _message_window;
  WptDriver _driver;
  CString   _file_base;

  // winsock event tracking
  TrackDns      _dns;
  TrackSockets  _sockets;
  Requests      _requests;

  TestState     _test_state;
  Results       _results;
  ScreenCapture _screen_capture;
};
