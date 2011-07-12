#pragma once
class HookChrome
{
public:
  HookChrome(void);
  ~HookChrome(void);
  void InstallHooks(void);

private:
  bool  hooked;
};

