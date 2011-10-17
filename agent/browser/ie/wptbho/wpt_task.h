#pragma once

class WptTask {
public:
  WptTask(void);
  ~WptTask(void);
  void  Reset();
  bool  ParseTask(CString task);

  typedef enum {
    UNDEFINED,
    NAVIGATE
  } TASK_ACTION;

  bool        _valid;
  bool        _record;
  TASK_ACTION _action;
  CString     _target;
  CString     _value;
};

