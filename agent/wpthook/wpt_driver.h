#pragma once

/******************************************************************************
*   WptDriver - For sending messages to the wptdriver process
******************************************************************************/
class WptDriver
{
public:
  WptDriver(void);
  ~WptDriver(void);

  bool  Connect(DWORD timeout = 10000);
  void  Disconnect();

  bool Done(bool async = true);

private:
  HWND  _wptdriver_window;
};

