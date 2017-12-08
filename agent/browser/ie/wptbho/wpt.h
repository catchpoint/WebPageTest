#pragma once

#include "wpt_interface.h"
#include "wpt_task.h"

class Wpt {
public:
  Wpt(void);
  ~Wpt(void);
  void Install(CComPtr<IWebBrowser2> web_browser);
  void Start(void);
  void Stop(void);
  bool InstallHook();
  void CheckForTask();
  void TaskThread();
  bool OnMessage(UINT message, WPARAM wParam, LPARAM lParam);

  // browser events
  void  OnLoad();
  void  OnNavigate();
  void  OnNavigateError(DWORD error);
  void  OnTitle(CString title);
  void  OnStatus(CString status);

  bool _active;

private:
  CComPtr<IWebBrowser2> _web_browser;
  UINT          _task_timer;
  WptInterface  _wpt_interface;
  HMODULE       _hook_dll;
  HWND          _message_window;
  bool          _navigating;
  bool          _must_exit;
  HANDLE        _task_thread;
  bool          _processing_task;
  WptTask       _task;
  int           _exec_count;

  typedef enum{
    equal = 0,
    left = 1,
    mid = 2
  }attrOperator;

  CComPtr<IHTMLElement> FindDomElement(CString target);
  CComPtr<IHTMLElement> FindDomElementInDocument(CString tag, 
          CString attribute, CString value, attrOperator op, 
          CComPtr<IHTMLDocument2> document);

  // commands
  void  Block(CString block_string);
  void  ClearCache(void);
  void  Click(CString target);
  void  CollectStats(CString custom_metrics);
  bool  Exec(CString javascript);
  void  ExpireCache(CString target);
  bool  Invoke(LPOLESTR function, _variant_t &result);
  void  NavigateTo(CString url);
  void  SetCookie(CString path, CString value);
  void  SetDomElement(CString target);
  void  SetInnerHTML(CString target, CString value);
  void  SetInnerText(CString target, CString value);
  void  SetValue(CString target, CString value);
  void  SubmitForm(CString target);

  // support routines
  DWORD CountDOMElements(CComQIPtr<IHTMLDocument2> &document);
  void  ExpireCacheEntry(INTERNET_CACHE_ENTRY_INFO * info, DWORD seconds);
  void  CheckBrowserState();
  CString JSONEscape(CString src);
  CString GetCustomMetric(CString code);
};
