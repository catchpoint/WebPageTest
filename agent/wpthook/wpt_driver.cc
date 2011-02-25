#include "StdAfx.h"
#include "wpt_driver.h"
#include "window_messages.h"


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptDriver::WptDriver(void):
  _wptdriver_window(NULL){
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptDriver::~WptDriver(void){
}

/*-----------------------------------------------------------------------------
  Find the window running in the remote browser
-----------------------------------------------------------------------------*/
bool WptDriver::Connect(DWORD timeout){
  bool ret = false;

  ATLTRACE2(_T("[wpthook] WptDriver::Connect"));

  DWORD end = GetTickCount() + timeout;
  do {
    _wptdriver_window = FindWindow(wptdriver_window_class, NULL);
    if (!_wptdriver_window)
      Sleep(100);
  } while (!_wptdriver_window && GetTickCount() < end);

  if (_wptdriver_window){
    ATLTRACE2(_T("[wpthook] Connected to wptdriver"));
    ret = true;
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptDriver::Disconnect(){
  _wptdriver_window = NULL;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptDriver::Done(bool async){
  bool ret = false;

  ATLTRACE2(_T("[wpthook] WptDriver::Done"));

  if (_wptdriver_window){
    if( async )
      ret = PostMessage(_wptdriver_window, WPT_HOOK_DONE, 0, 0) != 0;
    else{
      DWORD result;
      ret = SendMessageTimeout(_wptdriver_window, WPT_HOOK_DONE, 0, 0, 
                                SMTO_BLOCK, 10000, &result) != 0;
    }
  }

  return ret;
}

