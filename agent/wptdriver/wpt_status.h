#pragma once

#define UWM_UPDATE_STATUS WM_APP + 1

class WptStatus
{
public:
  WptStatus(HWND hMainWnd);
  ~WptStatus(void);

  void Set(const TCHAR * format, ...);
  void OnUpdateStatus(void);
  void OnPaint(HWND window);

private:
  HWND    _wnd;
  CString _status;
  TCHAR   _tmp_buffer[1024];
};

