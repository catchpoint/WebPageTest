#pragma once
#include "WsHook.h"
#include "GDIHook.h"

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
