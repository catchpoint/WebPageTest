#include "StdAfx.h"
#include "wpt_hook.h"
#include "../wpthook/window_messages.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptHook::WptHook(void):
  _wpthook_window(NULL){
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptHook::~WptHook(void){
}

/*-----------------------------------------------------------------------------
  Find the window running in the remote browser
-----------------------------------------------------------------------------*/
bool WptHook::Connect(DWORD timeout){
  bool ret = false;

  DWORD end = GetTickCount() + timeout;
  do {
    _wpthook_window = FindWindow(wpthook_window_class, NULL);
    if (!_wpthook_window)
      Sleep(100);
  } while (!_wpthook_window && GetTickCount() < end);

  if (_wpthook_window)
    ret = true;

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::Disconnect(){
  _wpthook_window = NULL;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptHook::Start(bool async){
  bool ret = false;

  if (!_wpthook_window)
    Connect();

  if (_wpthook_window){
    if( async )
      ret = PostMessage(_wpthook_window, WPT_START, 0, 0) != 0;
    else{
      DWORD result;
      ret = SendMessageTimeout(_wpthook_window, WPT_START, 0, 0, 
                                SMTO_BLOCK, 10000, &result) != 0;
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptHook::Stop(bool async){
  bool ret = false;

  if (!_wpthook_window)
    Connect();

  if (_wpthook_window){
    if( async )
      ret = PostMessage(_wpthook_window, WPT_STOP, 0, 0) != 0;
    else{
      DWORD result;
      ret = SendMessageTimeout(_wpthook_window, WPT_STOP, 0, 0, 
                                SMTO_BLOCK, 10000, &result) != 0;
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptHook::OnNavigate(bool async){
  bool ret = false;

  if (!_wpthook_window)
    Connect();

  if (_wpthook_window){
    if( async )
      ret = PostMessage(_wpthook_window, WPT_ON_NAVIGATE, 0, 0) != 0;
    else{
      DWORD result;
      ret = SendMessageTimeout(_wpthook_window, WPT_ON_NAVIGATE, 0, 0, 
                                SMTO_BLOCK, 10000, &result) != 0;
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptHook::OnLoad(bool async){
  bool ret = false;

  if (!_wpthook_window)
    Connect();

  if (_wpthook_window){
    if( async )
      ret = PostMessage(_wpthook_window, WPT_ON_LOAD, 0, 0) != 0;
    else{
      DWORD result;
      ret = SendMessageTimeout(_wpthook_window, WPT_ON_LOAD, 0, 0, 
                                SMTO_BLOCK, 10000, &result) != 0;
    }
  }

  return ret;
}
