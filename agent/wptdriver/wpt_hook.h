#pragma once

/******************************************************************************
*   WptHook - For sending messages to the code hooked into the browser
******************************************************************************/
class WptHook
{
public:
  WptHook(void);
  ~WptHook(void);

  bool  Connect(DWORD timeout = 10000);
  void  Disconnect();

  bool Start(bool async = true);
  bool Stop(bool async = true);
  bool OnNavigate(bool async = true);
  bool OnLoad(bool async = true);

private:
  HWND  _wpthook_window;
};

