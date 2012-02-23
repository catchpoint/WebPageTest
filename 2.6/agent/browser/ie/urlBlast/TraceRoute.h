#pragma once

class CTraceRoute
{
public:
  CTraceRoute(CTestInfo &info, int maxHops = 30, DWORD timeout = 1000);
  ~CTraceRoute(void);
  void Run();

private:
  CTestInfo& _info;
  int _maxHops;
  DWORD _timeout;
};
