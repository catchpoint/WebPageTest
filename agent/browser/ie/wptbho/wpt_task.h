#pragma once

class WptTask {
public:
  WptTask(void);
  ~WptTask(void);
  void  Reset();
  bool  ParseTask(CString task);

  typedef enum {
    UNDEFINED,
    NAVIGATE,
    CLEAR_CACHE,
    SET_COOKIE,
    EXEC,
    CLICK,
    SET_INNER_HTML,
    SET_INNER_TEXT,
    SET_VALUE,
    SUBMIT_FORM,
    BLOCK,
    SET_DOM_ELEMENT,
    EXPIRE_CACHE
  } TASK_ACTION;

  bool        _valid;
  bool        _record;
  TASK_ACTION _action;
  CString     _target;
  CString     _value;
};

