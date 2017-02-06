#pragma once
#include "wpt_test.h"

class WptTestDriver :
  public WptTest
{
public:
  WptTestDriver(DWORD default_timeout, bool has_gpu);
  virtual ~WptTestDriver(void);
  virtual bool  Load(CString& test);
  bool  Start();
  bool  SetFileBase();
  bool  marked_done_;
};

