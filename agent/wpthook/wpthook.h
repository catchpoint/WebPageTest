#pragma once
#include "WsHook.h"
#include "GDIHook.h"

// message definitions
const UINT UWM_WPTHOOK_INIT = WM_APP + 1;

extern HINSTANCE global_dll_handle; // DLL handle

class WptHook
{
public:
  WptHook(void);
  ~WptHook(void);

  void Init();
  void BackgroundThread();

private:
  CGDIHook  _gdi_hook;
  CWsHook   _winsock_hook;
  HANDLE    _background_thread;
  HWND      _message_window;
};
