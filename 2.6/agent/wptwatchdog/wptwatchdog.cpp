// wptwatchdog.cpp : Defines the entry point for the application.
//

#include "stdafx.h"
#include "wptwatchdog.h"

// Global Variables:
static LPCTSTR window_class = _T("WPT_Watchdog");
HINSTANCE hInst;				// current instance
HANDLE process_handle = NULL;  // process we are watching
bool  must_exit = false;

// Forward declarations of functions included in this code module:
BOOL				InitInstance(HINSTANCE, int);
LRESULT CALLBACK	WndProc(HWND, UINT, WPARAM, LPARAM);
HANDLE  LaunchWptdriver(void);

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
static unsigned __stdcall WatchThread(void* arg) {
  while (process_handle && !must_exit) {
    if (WaitForSingleObject(process_handle, 1000) == WAIT_OBJECT_0 
        && !must_exit) {
      CloseHandle(process_handle);
      process_handle = LaunchWptdriver();
    }
  }
  return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int APIENTRY _tWinMain(HINSTANCE hInstance,
                     HINSTANCE hPrevInstance,
                     LPTSTR    lpCmdLine,
                     int       nCmdShow)
{
  UNREFERENCED_PARAMETER(hPrevInstance);
  UNREFERENCED_PARAMETER(lpCmdLine);

  DWORD process_id = _ttol(lpCmdLine);
  if (process_id)
    process_handle = OpenProcess(SYNCHRONIZE, FALSE, process_id);

  // only allow a single instance to run
  HANDLE instance_mutex = CreateMutex(NULL, FALSE, _T("WPT Watchdog"));
  if (process_handle && 
      GetLastError() != ERROR_ALREADY_EXISTS && 
      GetLastError() != ERROR_ACCESS_DENIED) {
    MSG msg;

    // create the hidden main window
    WNDCLASSEX wcex;
    wcex.cbSize = sizeof(WNDCLASSEX);
    wcex.style			= CS_HREDRAW | CS_VREDRAW;
    wcex.lpfnWndProc	= WndProc;
    wcex.cbClsExtra		= 0;
    wcex.cbWndExtra		= 0;
    wcex.hInstance		= hInstance;
    wcex.hIcon			= NULL;
    wcex.hCursor		= LoadCursor(NULL, IDC_ARROW);
    wcex.hbrBackground	= (HBRUSH)(COLOR_WINDOW+1);
    wcex.lpszMenuName	= NULL;
    wcex.lpszClassName	= window_class;
    wcex.hIconSm		= NULL;
    RegisterClassEx(&wcex);
    if (InitInstance (hInstance, nCmdShow)) {
      HANDLE watch_thread = (HANDLE)_beginthreadex(0,0,::WatchThread,0,0,0);
      if (watch_thread) {
        while (GetMessage(&msg, NULL, 0, 0)) {
          TranslateMessage(&msg);
          DispatchMessage(&msg);
        }

        must_exit = true;
        if (instance_mutex) {
          CloseHandle(instance_mutex);
          instance_mutex = NULL;
        }
        WaitForSingleObject(watch_thread, 30000);
        CloseHandle(watch_thread);
      }
    }
  }

  if (instance_mutex)
    CloseHandle(instance_mutex);

  return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL InitInstance(HINSTANCE hInstance, int nCmdShow) {
   HWND hWnd;
   hInst = hInstance;
   hWnd = CreateWindow(window_class, window_class, WS_OVERLAPPEDWINDOW,
      CW_USEDEFAULT, 0, CW_USEDEFAULT, 0, NULL, NULL, hInstance, NULL);

   if (!hWnd) {
      return FALSE;
   }

   ShowWindow(hWnd, SW_HIDE);
   UpdateWindow(hWnd);

   return TRUE;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam)
{
  PAINTSTRUCT ps;
  HDC hdc;

  switch (message) {
    case WM_PAINT:
      hdc = BeginPaint(hWnd, &ps);
      EndPaint(hWnd, &ps);
      break;
    case WM_DESTROY:
      must_exit = true;
      PostQuitMessage(0);
      break;
    default:
      return DefWindowProc(hWnd, message, wParam, lParam);
  }
  return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HANDLE  LaunchWptdriver(void) {
  HANDLE process = NULL;
  PROCESS_INFORMATION pi;
  STARTUPINFO si;
  memset( &si, 0, sizeof(si) );
  si.cb = sizeof(si);
  si.dwFlags = STARTF_USESHOWWINDOW;
  si.wShowWindow = SW_SHOWMINNOACTIVE;
  TCHAR command_line[MAX_PATH];
  GetModuleFileName(NULL, command_line, MAX_PATH);
  lstrcpy(PathFindFileName(command_line), _T("wptdriver.exe"));
  if (CreateProcess(NULL, command_line, 0, 0, FALSE, 
                    NORMAL_PRIORITY_CLASS , 0, NULL, &si, &pi)) {
    process = pi.hProcess;
    if (pi.hThread)
      CloseHandle(pi.hThread);
  }
  return process;
}
