#pragma once

/******************************************************************************
*******************************************************************************
*
*   WptHook - For sending messages to the code hooked into the browser
*
*******************************************************************************
******************************************************************************/
class WptHook
{
public:
  WptHook(void);
  ~WptHook(void);

  bool  Connect(DWORD timeout = 10000);
  void  Disconnect();

  LRESULT Start();
  LRESULT Stop();
  LRESULT OnNavigate();
  LRESULT OnLoad();

private:
  HWND  _wpthook_window;
};

