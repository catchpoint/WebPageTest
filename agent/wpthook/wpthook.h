#pragma once
#include "hook_winsock.h"
#include "hook_gdi.h"
#include "wpt_driver.h"

extern HINSTANCE global_dll_handle; // DLL handle

class WptHook
{
public:
  WptHook(void);
  ~WptHook(void);

  void Init();
  void BackgroundThread();
  bool OnMessage(UINT message);

private:
  CGDIHook  _gdi_hook;
  CWsHook   _winsock_hook;
  HANDLE    _background_thread;
  HWND      _message_window;
  WptDriver _driver;
  LARGE_INTEGER _start;

  // winsock event tracking
  TrackDns      _dns;
  TrackSockets  _sockets;
};
