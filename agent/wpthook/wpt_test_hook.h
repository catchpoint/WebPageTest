#pragma once
#include "../wptdriver/wpt_test.h"

class WptTestHook :
  public WptTest
{
public:
  WptTestHook(void);
  virtual ~WptTestHook(void);
  void LoadFromFile();
};

