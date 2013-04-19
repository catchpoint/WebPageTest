#pragma once
#include "../wptdriver/wpt_test.h"

class WptTestHook :
  public WptTest
{
public:
  WptTestHook(DWORD timeout);
  virtual ~WptTestHook(void);
  void LoadFromFile();
};

