// wptRecord.cpp : Defines the entry point for the application.
//

#include "stdafx.h"
#include "wptRecord.h"

// Global Variables:
HINSTANCE hInst;                                // current instance
LPCWSTR szTitle = L"wptRecord";
LPCWSTR szWindowClass = L"wptRecord";

// Forward declarations of functions included in this code module:
ATOM                RegisterWindowClass(HINSTANCE hInstance);
BOOL                InitInstance(HINSTANCE, int);
LRESULT CALLBACK    WndProc(HWND, UINT, WPARAM, LPARAM);
INT_PTR CALLBACK    About(HWND, UINT, WPARAM, LPARAM);

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

  // Main message loop:
  MSG msg;
  while (GetMessage(&msg, nullptr, 0, 0)) {
    TranslateMessage(&msg);
    DispatchMessage(&msg);
  }

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

  // Keep the window hidden.  We don't show any UI but use the window for messaging
  ShowWindow(hWnd, nCmdShow);
  UpdateWindow(hWnd);

  return TRUE;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam) {
  switch (message) {
  case WM_DESTROY:
      PostQuitMessage(0);
      break;
  default:
      return DefWindowProc(hWnd, message, wParam, lParam);
  }
  return 0;
}
