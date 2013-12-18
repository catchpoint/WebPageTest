#pragma once
#include "../wptdriver/wpt_test.h"

class WptHook;
class TestState;

class WptTestHook :
  public WptTest {
public:
  WptTestHook(WptHook& hook, TestState& test_state, DWORD timeout);
  virtual ~WptTestHook(void);
  void LoadFromFile();
  virtual void ReportData();

private:
  WptHook& hook_;
  TestState& test_state_;

protected:
    virtual bool ProcessCommand(ScriptCommand& command, bool &consumed);
};

