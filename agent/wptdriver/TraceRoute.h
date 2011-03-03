#pragma once

class CTraceRoute
{
public:
  CTraceRoute(WptTest &test, int maxHops = 30, DWORD timeout = 1000);
  ~CTraceRoute(void);
  void Run();

private:
  WptTest& _test;
  int _maxHops;
  DWORD _timeout;
};
