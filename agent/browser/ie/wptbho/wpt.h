#pragma once

#include "wpt_interface.h"

class Wpt {
public:
  Wpt(void);
  ~Wpt(void);
  void Install(CComPtr<IWebBrowser2> web_browser);
  void Start(void);
  void Stop(void);
  bool InstallHook();
  void CheckForTask();

  // browser events
  void  OnLoad();
  void  OnNavigate();
  void  OnTitle(CString title);
  void  OnStatus(CString status);

  bool _active;

private:
  CComPtr<IWebBrowser2> _web_browser;
  HANDLE        _task_timer;
  WptInterface  _wpt_interface;
  HMODULE       _hook_dll;

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
  void  NavigateTo(CString url);
  void  ClearCache(void);
  void  SetCookie(CString path, CString value);
  void  Exec(CString javascript);
  void  Click(CString target);
  void  SetInnerHTML(CString target, CString value);
  void  SetInnerText(CString target, CString value);
  void  SetValue(CString target, CString value);
  void  SubmitForm(CString target);
  void  Block(CString block_string);
  void  SetDomElement(CString target);
  void  ExpireCache(CString target);
  void  ExpireCacheEntry(INTERNET_CACHE_ENTRY_INFO * info, DWORD seconds);
  DWORD CountDOMElements(CComQIPtr<IHTMLDocument2> &document);
};
