#pragma once
#include "../wptdriver/wpt_test.h"

class WptHook;

class WptTestHook :
  public WptTest {
public:
  WptTestHook(WptHook& hook, DWORD timeout);
  virtual ~WptTestHook(void);
  void LoadFromFile();
  virtual void ReportData();

private:
  WptHook& hook_;
};

