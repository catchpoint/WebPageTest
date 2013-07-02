#pragma once

class WptTask {
public:
  WptTask(void);
  ~WptTask(void);
  void  Reset();
  bool  ParseTask(CString task);

  typedef enum {
    UNDEFINED,
    BLOCK,
    CLEAR_CACHE,
    CLICK,
    COLLECT_STATS,
    EXEC,
    EXPIRE_CACHE,
    NAVIGATE,
    SET_COOKIE,
    SET_DOM_ELEMENT,
    SET_INNER_HTML,
    SET_INNER_TEXT,
    SET_VALUE,
    SUBMIT_FORM
  } TASK_ACTION;

  bool        _valid;
  bool        _record;
  TASK_ACTION _action;
  CString     _target;
  CString     _value;
};

