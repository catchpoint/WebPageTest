// wpthook.cpp : Defines the exported functions for the DLL application.
//

#include "stdafx.h"
#include "shared_mem.h"
#include "wpthook.h"

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
WptHook::WptHook(void){
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptHook::~WptHook(void){
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::Init(){
  OutputDebugString(_T("[wpthook] Init()\n"));
}