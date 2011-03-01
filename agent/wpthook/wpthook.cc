// wpthook.cpp : Defines the exported functions for the DLL application.
//

#include "stdafx.h"
#include "shared_mem.h"
#include "wpthook.h"
#include "window_messages.h"

HINSTANCE global_dll_handle = NULL; // DLL handle
WptHook * global_hook = NULL;

extern "C" {
__declspec( dllexport ) void WINAPI InstallHook(DWORD thread_id);
}

/*-----------------------------------------------------------------------------
  Hook code injected into the remote browser
-----------------------------------------------------------------------------*/
LRESULT HookProc (
  int code,       // hook code
  WPARAM wParam,  // virtual-key code
  LPARAM lParam   // keystroke-message information
)
{
  OutputDebugString(_T("[wpthook] HookProc()\n"));
  if( !global_hook ){
    // increase our refcount so we don't get unloaded
    TCHAR dll_path[MAX_PATH]; 
    GetModuleFileName( global_dll_handle, dll_path, _countof(dll_path) );
    LoadLibrary( dll_path );

    // remove the message proc hook so we don't impact performance
    UnhookWindowsHookEx( shared_hook_handle );

    // initialize our actual hook routine
    global_hook = new WptHook;
    global_hook->Init();
  }

  return ::CallNextHookEx(shared_hook_handle, code, wParam, lParam);
}

/*-----------------------------------------------------------------------------
  Install the hook into the browser's message proc
-----------------------------------------------------------------------------*/
void WINAPI InstallHook(DWORD thread_id){
  shared_hook_handle = SetWindowsHookEx( WH_CALLWNDPROC, (HOOKPROC)HookProc,
                global_dll_handle, thread_id );

  if (!shared_hook_handle){
    DWORD err = GetLastError();
    CString buff;
    buff.Format(_T("[wpthook] Error installing hook: %d\n"), err);
    OutputDebugString(buff);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptHook::WptHook(void):
  _background_thread(NULL)
  ,_message_window(NULL)
  ,_winsock_hook(_dns, _sockets){
  _start.QuadPart = 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptHook::~WptHook(void){
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptHook::OnMessage(UINT message){
  bool ret = true;

  switch (message){
    case WPT_INIT:
        ATLTRACE2(_T("[wpthook] WptHookWindowProc() - WPT_INIT\n"));
        break;

    case WPT_START:
        ATLTRACE2(_T("[wpthook] WptHookWindowProc() - WPT_START\n"));
        break;

    case WPT_STOP:
        ATLTRACE2(_T("[wpthook] WptHookWindowProc() - WPT_STOP\n"));
        break;

    case WPT_ON_NAVIGATE:
        QueryPerformanceCounter(&_start);
        ATLTRACE2(_T("[wpthook] WptHookWindowProc() - WPT_ON_NAVIGATE\n"));
        break;

    case WPT_ON_LOAD:
        if (_start.QuadPart){
          LARGE_INTEGER end, freq;
          QueryPerformanceCounter(&end);
          QueryPerformanceFrequency(&freq);
          freq.QuadPart /= 1000;
          double elapsed = (double)(end.QuadPart - _start.QuadPart)
                              / (double)freq.QuadPart;
          CString buff;
          buff.Format(_T("[wptdriver] - OnNavigate -> OnLoad = %0.3fms\n"), 
                      elapsed);
          OutputDebugString(buff);
        }
        ATLTRACE2(_T("[wpthook] WptHookWindowProc() - WPT_ON_LOAD\n"));

        // for now we just tell the server that we're done
        Sleep(2000);
        _driver.Done();
        break;

    default:
        ret = false;
        break;
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
static unsigned __stdcall ThreadProc( void* arg )
{
  WptHook * wpthook = (WptHook *)arg;
  if( wpthook )
    wpthook->BackgroundThread();
    
  return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::Init(){
  ATLTRACE2(_T("[wpthook] Init()\n"));

  _background_thread = (HANDLE)_beginthreadex(0, 0, ::ThreadProc, this, 0, 0);
}

/*-----------------------------------------------------------------------------
  WndProc for the messaging window
-----------------------------------------------------------------------------*/
static LRESULT CALLBACK WptHookWindowProc(HWND hwnd, UINT uMsg, 
                                                  WPARAM wParam, LPARAM lParam)
{
  ATLTRACE2(_T("[wpthook] WptHookWindowProc()\n"));
  LRESULT ret = 0;

  bool handled = false;

  if (global_hook)
    handled = global_hook->OnMessage(uMsg);

  if (!handled)
    ret = DefWindowProc(hwnd, uMsg, wParam, lParam);

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::BackgroundThread(){
  ATLTRACE2(_T("[wpthook] BackgroundThread()\n"));

  // connect to the server
  _driver.Connect();

  // create a hidden window for processing messages from wptdriver
  WNDCLASS wndClass;
  memset(&wndClass, 0, sizeof(wndClass));
  wndClass.lpszClassName = wpthook_window_class;
  wndClass.lpfnWndProc = WptHookWindowProc;
  wndClass.hInstance = global_dll_handle;
  if( RegisterClass(&wndClass) )
  {
    _message_window = CreateWindow(wpthook_window_class, wpthook_window_class, 
                                    WS_POPUP, 0, 0, 0, 
                                    0, NULL, NULL, global_dll_handle, NULL);
    if( _message_window )
    {
      PostMessage( _message_window, WPT_INIT, 0, 0);

      MSG msg;
      BOOL bRet;
      while ( (bRet = GetMessage(&msg, _message_window, 0, 0)) != 0 ){
        if (bRet != -1){
          TranslateMessage(&msg);
          DispatchMessage(&msg);
        }
      }
    }
  }
}