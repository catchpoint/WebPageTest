#pragma once

#include "wpt_interface.h"

class Wpt {
public:
  Wpt(void);
  ~Wpt(void);
  void Start(CComPtr<IWebBrowser2> web_browser);
  void Stop(void);
  void CheckForTask();

  // browser events
  void  OnLoad();
  void  OnNavigate();
  void  OnTitle(CString title);

  bool _active;

private:
  CComPtr<IWebBrowser2> _web_browser;
  HANDLE        _task_timer;
  WptInterface  _wpt_interface;

  // commands
  void  NavigateTo(CString url);
};
