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
LRESULT WptHook::Start(){
  LRESULT ret = -1;

  if (_wpthook_window)
    ret = SendMessage(_wpthook_window, WPT_START, 0, 0);

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT WptHook::Stop(){
  LRESULT ret = -1;

  if (_wpthook_window)
    ret = SendMessage(_wpthook_window, WPT_STOP, 0, 0);

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT WptHook::OnNavigate(){
  LRESULT ret = -1;

  if (_wpthook_window)
    ret = SendMessage(_wpthook_window, WPT_ON_NAVIGATE, 0, 0);

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT WptHook::OnLoad(){
  LRESULT ret = -1;

  if (_wpthook_window)
    ret = SendMessage(_wpthook_window, WPT_ON_LOAD, 0, 0);

  return ret;
}
