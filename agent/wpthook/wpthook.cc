// wpthook.cpp : Defines the exported functions for the DLL application.
//

#include "stdafx.h"
#include "shared_mem.h"
#include "wpthook.h"
#include "window_messages.h"
#include <Tlhelp32.h>

HINSTANCE global_dll_handle = NULL; // DLL handle
WptHook * global_hook = NULL;

const UINT_PTR TIMER_DONE = 1;
const DWORD TIMER_DONE_INTERVAL = 100;

extern "C" {
__declspec( dllexport ) void __stdcall InstallHook(HANDLE process);
__declspec( dllexport ) void __stdcall Initialize(void);
}

/*-----------------------------------------------------------------------------
    Injected initialization routine
-----------------------------------------------------------------------------*/
void __stdcall Initialize(void){
  OutputDebugString(_T("[wpthook] Initialize()\n"));

  if( !global_hook ){
    global_hook = new WptHook;
    global_hook->Init();
  }
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

// function addresses in the target process
typedef HMODULE(WINAPI * LPLOADLIBRARYW)(LPCWSTR lpLibFileName);
typedef FARPROC(WINAPI * LPGETPROCADDRESS)(HMODULE hModule, LPCSTR lpProcName);
typedef void(__stdcall * LPINITIALIZE)(void);

// all strings need to be passed in explicitly
typedef struct {
  WCHAR dll_path[MAX_PATH];
  char init_routine[100];
  LPLOADLIBRARYW    _LoadLibraryW;
  LPGETPROCADDRESS  _GetProcAddress;
} REMOTE_INFO;

/*-----------------------------------------------------------------------------
  Code injected into the remote process
-----------------------------------------------------------------------------*/
static DWORD WINAPI RemoteThreadProc(REMOTE_INFO * info) {
  if (info && info->_LoadLibraryW && info->_GetProcAddress) {
    HMODULE dll = info->_LoadLibraryW(info->dll_path);
    if (dll){
      LPINITIALIZE _Initialize = (LPINITIALIZE)info->_GetProcAddress(
                                                    dll, info->init_routine);
      if (_Initialize)
        _Initialize();
    }
  }
  return 0;
}

// This function marks the memory address after RemoteThreadProc.
// int cbCodeSize = (PBYTE) AfterThreadFunc - (PBYTE) ThreadFunc.
static void AfterThreadFunc (void)
{
}

/*-----------------------------------------------------------------------------
  Find the base address where the given dll is loaded
-----------------------------------------------------------------------------*/
LPBYTE GetDllBaseAddress(HANDLE process, TCHAR * dll) {
  LPBYTE base_address = NULL;
  HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE, 
                                                        GetProcessId(process));
  if (snap != INVALID_HANDLE_VALUE) {
    // loop until we find the dll
    MODULEENTRY32 module;
    module.dwSize = sizeof(module);
    if (Module32First(snap, &module)){
      do {
        if (!lstrcmpi(module.szModule, dll))
          base_address = module.modBaseAddr;
      } while(!base_address && Module32Next(snap, &module));
    }
    CloseHandle(snap);
  }

  return base_address;
}

/*-----------------------------------------------------------------------------
  Figure out the address of the given function in the remote process
-----------------------------------------------------------------------------*/
LPBYTE GetRemoteFunction(HANDLE process, TCHAR * dll, TCHAR * fn){
  LPBYTE remote_function = NULL;

  // first, get the offset of the function from the dll base address in the 
  // current process
  HMODULE module = LoadLibrary(dll);
  if (module){
    LPBYTE base = GetDllBaseAddress(GetCurrentProcess(), dll);
    if (base) {
      LPBYTE addr = (LPBYTE)GetProcAddress(module, CT2A(fn));
      if (addr > base) {
        unsigned __int64 offset = addr - base;

        // now find the base address of the dll in the remote process
        LPBYTE remote_base = GetDllBaseAddress(process, dll);
        if (remote_base)
          remote_function = remote_base + offset;
      }
    }

    FreeLibrary(module);
  }

  return remote_function;
}

/*-----------------------------------------------------------------------------
  Inject our dll into the browser process
-----------------------------------------------------------------------------*/
void WINAPI InstallHook(HANDLE process){
  REMOTE_INFO info;
  lstrcpyA(info.init_routine, "_Initialize@0");

  // get the addresses of the functions we need in the remote process
  info._LoadLibraryW = (LPLOADLIBRARYW)GetRemoteFunction(
                        process, _T("kernel32.dll"), _T("LoadLibraryW"));
  info._GetProcAddress = (LPGETPROCADDRESS)GetRemoteFunction(
                        process, _T("kernel32.dll"), _T("GetProcAddress"));

  // copy the dll path to the remote process memory
  if (GetModuleFileNameW(global_dll_handle, info.dll_path, 
                          _countof(info.dll_path))){
    WCHAR * remote_info = (WCHAR *)VirtualAllocEx(process, NULL, 
                                 sizeof(info), MEM_COMMIT, PAGE_READWRITE);
    if (remote_info) {
      if (WriteProcessMemory(process, remote_info, &info, 
                              sizeof(info), NULL) ) {

        /// copy the remote thread code to theprocess
        const int code_size = (LPBYTE)AfterThreadFunc-(LPBYTE)RemoteThreadProc;
        DWORD * remote_code = (DWORD *)VirtualAllocEx( process, 0, code_size, 
                                          MEM_COMMIT, PAGE_EXECUTE_READWRITE );
        if (remote_code) {
          if (WriteProcessMemory( process, remote_code, &RemoteThreadProc, 
                                        code_size, NULL )) {
            HANDLE remote_thread = CreateRemoteThread(process, NULL, 0, 
                                  (LPTHREAD_START_ROUTINE)remote_code,
                                    remote_info, 0 , NULL);
            if (remote_thread) {
              WaitForSingleObject(remote_thread, 120000);
              CloseHandle( remote_thread );
            }

          }
          VirtualFreeEx(process, remote_code, code_size, MEM_RELEASE);
        }
      }
      VirtualFreeEx(process, remote_info, sizeof(info), MEM_RELEASE);
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptHook::WptHook(void):
  _background_thread(NULL)
  ,_message_window(NULL)
  ,_test_state(shared_test_timeout, shared_test_force_on_load, _results)
  ,_winsock_hook(_dns, _sockets, _test_state)
  ,_sockets(_requests, _test_state)
  ,_requests(_test_state, _sockets, _dns)
  ,_results(_test_state, _requests, _sockets)
  ,_dns(_test_state) {
  _file_base = shared_results_file_base;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptHook::~WptHook(void){
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptHook::OnMessage(UINT message, WPARAM wParam, LPARAM lParam){
  bool ret = true;

  switch (message){
    case WPT_INIT:
        ATLTRACE2(_T("[wpthook] WptHookWindowProc() - WPT_INIT\n"));
        break;

    case WPT_START:
        _test_state.Start();
        SetTimer(_message_window, TIMER_DONE, 
                                TIMER_DONE_INTERVAL, NULL);
        break;

    case WPT_STOP:
        ATLTRACE2(_T("[wpthook] WptHookWindowProc() - WPT_STOP\n"));
        break;

    case WPT_ON_NAVIGATE:
        _test_state.OnNavigate();
        break;

    case WPT_ON_LOAD:
        _test_state.OnLoad();
        break;

    case WM_TIMER:
        if( _test_state.IsDone() ){
          KillTimer(_message_window, TIMER_DONE);
          _results.Save();
          _driver.Done();
        }

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
    handled = global_hook->OnMessage(uMsg, wParam, lParam);

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