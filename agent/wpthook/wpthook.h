#pragma once

extern HINSTANCE global_dll_handle; // DLL handle

class WptHook
{
public:
  WptHook(void);
  ~WptHook(void);

  void Init();
};
