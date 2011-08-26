#pragma once
#include "../wptdriver/wpt_test.h"

class WptTestHook :
  public WptTest
{
public:
  WptTestHook(DWORD test_timeout);
  virtual ~WptTestHook(void);
  void LoadFromFile();
};

