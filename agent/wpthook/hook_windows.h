#pragma once
#include "ncodehook/NCodeHookInstantiation.h"

class TestState;
class TrackSockets;

typedef BOOL (__stdcall * PFN_SHOWWINDOW)(HWND hWnd, int nCmdShow);


class WindowsHook {
public:
  WindowsHook(TestState& test_state);
  ~WindowsHook();
  void Init();
  BOOL ShowWindow(HWND hWnd, int nCmdShow);

private:
  TestState& _test_state;
  NCodeHookIA32* _hook;

  // Original Functions
  PFN_SHOWWINDOW ShowWindow_;
};

