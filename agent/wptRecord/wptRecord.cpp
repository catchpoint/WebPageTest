// wptRecord.cpp : Defines the entry point for the application.
//

#include "stdafx.h"
#include "wptRecord.h"
#include "WptRecorder.h"
#include <shellapi.h>

// Global Variables:
HINSTANCE hInst;                                // current instance
LPCWSTR szTitle = L"wptRecord";
LPCWSTR szWindowClass = L"wptRecord";

// Window messages for controlling recording activity
#define UWM_PREPARE (WM_APP + 0)  // Call after browser is launched to find viewport
#define UWM_START   (WM_APP + 1)  // Start actual recording
#define UWM_STOP    (WM_APP + 2)  // Stop recording
#define UWM_PROCESS (WM_APP + 3)  // Process captured results and write files (WPARAM can include a ms offset to remove from all timings)
#define UWM_DONE    (WM_APP + 4)  // Exit
#define UWM_WAIT_FOR_IDLE    (WM_APP + 5)  // Wait for the network to go idle (WPARAM includes the waqit time in seconds)

// Forward declarations of functions included in this code module:
ATOM                RegisterWindowClass(HINSTANCE hInstance);
BOOL                InitInstance(HINSTANCE, int);
LRESULT CALLBACK    WndProc(HWND, UINT, WPARAM, LPARAM);
INT_PTR CALLBACK    About(HWND, UINT, WPARAM, LPARAM);

// Globals
WptRecorder * g_recorder = NULL;

int APIENTRY wWinMain(_In_ HINSTANCE hInstance,
                     _In_opt_ HINSTANCE hPrevInstance,
                     _In_ LPWSTR    lpCmdLine,
                     _In_ int       nCmdShow) {
  UNREFERENCED_PARAMETER(hPrevInstance);
  UNREFERENCED_PARAMETER(lpCmdLine);

  RegisterWindowClass(hInstance);

  // Perform application initialization:
  if (!InitInstance (hInstance, nCmdShow))
      return FALSE;

  // Create the global instance of the recorder
  WptRecorder recorder;
  g_recorder = &recorder;

  // Process the command-line options
  bool ok = false;
  int argc = 0;
  LPWSTR *argv = CommandLineToArgvW(GetCommandLineW(), &argc);
  if (argc && argv) {
    for (int i = 0; i < argc; i++) {
      LPWSTR cmd = argv[i];
      if (cmd) {
        if (!lstrcmpiW(cmd, L"--filebase")) {
          i++;
          if (i < argc && argv[i]) {
            ok = true;
            recorder.SetFileBase(argv[i]);
          }
        } else if (!lstrcmpiW(cmd, L"--video")) {
          recorder.EnableVideo();
        } else if (!lstrcmpiW(cmd, L"--tcpdump")) {
          recorder.EnableTcpdump();
        } else if (!lstrcmpiW(cmd, L"--histograms")) {
          recorder.EnableHistograms();
        } else if (!lstrcmpiW(cmd, L"--noresize")) {
          recorder.EnableFullSizeVideo();
        } else if (!lstrcmpiW(cmd, L"--quality")) {
          i++;
          if (i < argc && argv[i]) {
            int quality = _wtoi(argv[i]);
            if (quality > 0 && quality <= 100)
              recorder.SetImageQuality(quality);
          }
        }
      }
    }
  }

  // Main message loop:
  MSG msg;
  msg.wParam = -1;
  if (ok) {
    while (GetMessage(&msg, nullptr, 0, 0)) {
      TranslateMessage(&msg);
      DispatchMessage(&msg);
    }
  }

  g_recorder = NULL;

  return (int) msg.wParam;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
ATOM RegisterWindowClass(HINSTANCE hInstance) {
  WNDCLASSEXW wcex;

  wcex.cbSize = sizeof(WNDCLASSEX);

  wcex.style          = CS_HREDRAW | CS_VREDRAW;
  wcex.lpfnWndProc    = WndProc;
  wcex.cbClsExtra     = 0;
  wcex.cbWndExtra     = 0;
  wcex.hInstance      = hInstance;
  wcex.hIcon          = NULL;
  wcex.hCursor        = NULL;
  wcex.hbrBackground  = (HBRUSH)(COLOR_WINDOW+1);
  wcex.lpszMenuName   = NULL;
  wcex.lpszClassName  = szWindowClass;
  wcex.hIconSm        = NULL;

  return RegisterClassExW(&wcex);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL InitInstance(HINSTANCE hInstance, int nCmdShow) {
  hInst = hInstance; // Store instance handle in our global variable

  HWND hWnd = CreateWindowW(szWindowClass, szTitle, WS_OVERLAPPEDWINDOW,
    0, 0, 200, 100, nullptr, nullptr, hInstance, nullptr);

  if (!hWnd)
    return FALSE;

  return TRUE;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam) {
  LRESULT ret = 0;
  switch (message) {
    case UWM_PREPARE:
        if (g_recorder)
          ret = g_recorder->Prepare();
        break;
    case UWM_START:
        if (g_recorder)
          ret = g_recorder->Start();
        break;
    case UWM_STOP:
        if (g_recorder)
          ret = g_recorder->Stop();
        break;
    case UWM_PROCESS:
        if (g_recorder)
          ret = g_recorder->Process(wParam);
        break;
    case UWM_DONE:
        if (g_recorder)
          ret = g_recorder->Done();
        PostQuitMessage(0);
        break;
    case UWM_WAIT_FOR_IDLE:
        if (g_recorder)
          ret = g_recorder->WaitForIdle(wParam);
        break;
    case WM_DESTROY:
        PostQuitMessage(0);
        break;
    default:
        return DefWindowProc(hWnd, message, wParam, lParam);
  }
  return ret;
}
