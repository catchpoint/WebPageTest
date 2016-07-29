#include "StdAfx.h"
#include "wpt.h"

extern HINSTANCE dll_hinstance;
Wpt* global_wpt = NULL;

#define UWM_TASK WM_APP + 1
const DWORD TASK_INTERVAL = 500;
static const TCHAR * GLOBAL_TESTING_MUTEX = _T("Global\\wpt_testing_active");
static const TCHAR * HOOK_DLL = _T("wpthook.dll");

typedef void (WINAPI * PFN_INSTALL_HOOK)(void);

// registry keys
static const TCHAR * REG_DOM_STORAGE_LOW = 
    _T("Software\\Microsoft\\Internet Explorer\\LowRegistry\\DOMStorage");
static const TCHAR * REG_DOM_STORAGE = 
    _T("Software\\Microsoft\\Internet Explorer\\DOMStorage");
static const TCHAR * REG_DOM_STORAGE_KEY = 
    _T("Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings")
    _T("\\5.0\\Cache\\Extensible Cache\\DOMStore");
static const TCHAR * REG_SHELL_FOLDERS = 
    _T("Software\\Microsoft\\Windows\\CurrentVersion")
    _T("\\Explorer\\User Shell Folders");
static const TCHAR * DOM_SCRIPT_FUNCTIONS =
    _T("var wptGetUserTimings = (function(){")
    _T("  var ret = '';")
    _T("  if (window.performance && window.performance.getEntriesByType) {")
    _T("    var m = [];")
    _T("    var marks = performance.getEntriesByType('mark');")
    _T("    for (var i = 0; i < marks.length; i++)")
    _T("      m.push({'type': 'mark', 'entryType': marks[i].entryType, 'name': marks[i].name, 'startTime': marks[i].startTime});")
    _T("    var measures = performance.getEntriesByType('measure');")
    _T("    for (var i = 0; i < measures.length; i++)")
    _T("      m.push({'type': 'measure', 'entryType': measures[i].entryType, 'name': measures[i].name, 'startTime': measures[i].startTime, 'duration': measures[i].duration});")
    _T("    if (m.length)")
    _T("      ret = JSON.stringify(m);")
    _T("  }")
    _T("  return ret;")
    _T("});")
    _T("var wptGetNavTimings = (function(){")
    _T("  var timingParams = \"\";")
    _T("  if (window.performance && window.performance.timing) {")
    _T("    function addTime(name) {")
    _T("      return name + '=' + Math.max(0, (performance.timing[name] - ")
    _T("              performance.timing['navigationStart']));")
    _T("    };")
    _T("    timingParams = addTime('domContentLoadedEventStart') + '&' +")
    _T("        addTime('domContentLoadedEventEnd') + '&' +")
    _T("        addTime('domInteractive') + '&' +")
    _T("        addTime('msFirstPaint') + '&' +")
    _T("        addTime('loadEventStart') + '&' +")
    _T("        addTime('loadEventEnd');")
    _T("  }")
    _T("  return timingParams;")
    _T("});");
LPOLESTR GET_USER_TIMINGS = L"wptGetUserTimings";
LPOLESTR GET_NAV_TIMINGS = L"wptGetNavTimings";

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Wpt::Wpt(void):
  _active(false)
  ,_task_timer(0)
  ,_hook_dll(NULL)
  ,_message_window(NULL)
  ,_navigating(false)
  ,_must_exit(false)
  ,_task_thread(NULL)
  ,_processing_task(false)
  ,_exec_count(0) {
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Wpt::~Wpt(void) {
  global_wpt = NULL;
  if (_task_thread) {
    _must_exit = true;
    WaitForSingleObject(_task_thread, 5000);
    CloseHandle(_task_thread);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
static LRESULT CALLBACK WptBHOWindowProc(HWND hwnd, UINT uMsg, 
                                                WPARAM wParam, LPARAM lParam) {
  LRESULT ret = 0;
  bool handled = false;
  if (global_wpt)
    handled = global_wpt->OnMessage(uMsg, wParam, lParam);
  if (!handled)
    ret = DefWindowProc(hwnd, uMsg, wParam, lParam);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Wpt::Install(CComPtr<IWebBrowser2> web_browser) {
  ATLTRACE(_T("[wptbho] - Install"));
  HANDLE active_mutex = OpenMutex(SYNCHRONIZE, FALSE, GLOBAL_TESTING_MUTEX);
  if (!_task_timer && active_mutex) {
    if (!global_wpt) {
      global_wpt = this;
      WNDCLASS wndClass;
      memset(&wndClass, 0, sizeof(wndClass));
      wndClass.lpszClassName = _T("wptbho");
      wndClass.lpfnWndProc = WptBHOWindowProc;
      wndClass.hInstance = dll_hinstance;
      if (RegisterClass(&wndClass)) {
        _message_window = CreateWindow(wndClass.lpszClassName,
            wndClass.lpszClassName, WS_POPUP, 0, 0, 0, 0, NULL, NULL,
            dll_hinstance, NULL);
      }
      if (InstallHook()) {
        _web_browser = web_browser;
        CComBSTR bstr_url = L"http://127.0.0.1:8888/blank.html";
        _web_browser->Navigate(bstr_url, 0, 0, 0, 0);
      }
    } else {
      ATLTRACE(_T("[wptbho] - Already installed"));
    }
  } else {
    ATLTRACE(_T("[wptbho] - Install, failed to open mutex"));
  }
  if (active_mutex)
    CloseHandle(active_mutex);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Wpt::OnMessage(UINT message, WPARAM wParam, LPARAM lParam) {
  bool ret = true;

  switch (message){
    case WM_TIMER:
        CheckBrowserState();
        break;
    case UWM_TASK:
        CheckForTask();
        _processing_task = false;
        break;
    default:
        ret = false;
        break;
  }

  return ret;
}

static unsigned __stdcall TaskThreadProc(void* arg) {
  Wpt * wpt = (Wpt *)arg;
  if( wpt )
    wpt->TaskThread();
    
  return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Wpt::Start(void) {
  if (!_task_timer && _message_window) {
    _task_thread = (HANDLE)_beginthreadex(0, 0, ::TaskThreadProc, this, 0, 0);
    _task_timer = SetTimer(_message_window, 1, TASK_INTERVAL, NULL);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Wpt::Stop(void) {
  if (_message_window) {
    KillTimer(_message_window, 1);
    _task_timer = 0;
    DestroyWindow(_message_window);
  }
  _web_browser.Release();
}

/*-----------------------------------------------------------------------------
  Load and install the hooks from wpthook if a test is currently active
  We have to do this from inside the BHO because IE launches child
  processes for each browser and we need to make sure we intercept the 
  correct one
-----------------------------------------------------------------------------*/
bool Wpt::InstallHook() {
  ATLTRACE(_T("[wptbho] - InstallHook"));
  bool ok = false;
  if (_hook_dll) {
    ok = true;
  } else {
    HANDLE active_mutex = OpenMutex(SYNCHRONIZE, FALSE, GLOBAL_TESTING_MUTEX);
    if (active_mutex) {
      TCHAR path[MAX_PATH];
      if (GetModuleFileName((HMODULE)dll_hinstance, path, _countof(path))) {
        lstrcpy(PathFindFileName(path), HOOK_DLL);
        _hook_dll = LoadLibrary(path);
        if (_hook_dll) {
          PFN_INSTALL_HOOK InstallHook = 
            (PFN_INSTALL_HOOK)GetProcAddress(_hook_dll, "_InstallHook@0");
          if (InstallHook) {
            InstallHook();
            ok = true;
          } else {
            FreeLibrary(_hook_dll);
            _hook_dll = NULL;
          }
        }
      }
      CloseHandle(active_mutex);
    }
  }
  ATLTRACE(_T("[wptbho] - InstallHook complete"));
  return ok;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Wpt::OnLoad() {
  if (_active) {
    ATLTRACE(_T("[wptbho] - Wpt::OnLoad()"));
    int fixed_viewport = 0;
    if (_web_browser) {
      CComPtr<IDispatch> dispatch;
      if (SUCCEEDED(_web_browser->get_Document(&dispatch))) {
        CComQIPtr<IHTMLDocument2> document = dispatch;
        if (document) {
          if (FindDomElementInDocument(_T("meta"), _T("name"), _T("viewport"),
                                       equal, document))
            fixed_viewport = 1;
        }
      }
    }
    CString options;
    options.Format(_T("fixedViewport=%d"), fixed_viewport);
    _wpt_interface.OnLoad(options);
    _active = false;
    _navigating = false;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Wpt::OnNavigate() {
  if (_active) {
    ATLTRACE(_T("[wptbho] - Wpt::OnNavigate()"));
    _navigating = true;
    _wpt_interface.OnNavigate();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Wpt::OnNavigateError(DWORD error) {
  if (_active) {
    ATLTRACE(_T("[wptbho] - Wpt::OnNavigateError(%d)"), error);
    CString options;
    options.Format(_T("error=%d"), error);
    _wpt_interface.OnNavigateError(options);
    _active = false;
    _navigating = false;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Wpt::OnTitle(CString title) {
  if (_active)
    _wpt_interface.OnTitle(title + _T(" - IE"));
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Wpt::OnStatus(CString status) {
  if (_active)
    _wpt_interface.OnStatus(status);
}

/*-----------------------------------------------------------------------------
  Check for new tasks that need to be executed
-----------------------------------------------------------------------------*/
void Wpt::CheckForTask() {
  if (_task._valid) {
    if (_task._record)
      _active = true;
    switch (_task._action) {
      case WptTask::BLOCK:
        Block(_task._target);
        break;
      case WptTask::CLEAR_CACHE: 
        ClearCache(); 
        break;
      case WptTask::CLICK:
        Click(_task._target);
        break;
      case WptTask::COLLECT_STATS:
        CollectStats(_task._target);
        break;
      case WptTask::EXEC:
        Exec(_task._target);
        break;
      case WptTask::EXPIRE_CACHE:
        ExpireCache(_task._target);
        break;
      case WptTask::NAVIGATE: 
        NavigateTo(_task._target); 
        break;
      case WptTask::SET_COOKIE:
        SetCookie(_task._target, _task._value);
        break;
      case WptTask::SET_DOM_ELEMENT:
        SetDomElement(_task._target);
        break;
      case WptTask::SET_INNER_HTML:
        SetInnerHTML(_task._target, _task._value);
        break;
      case WptTask::SET_INNER_TEXT:
        SetInnerText(_task._target, _task._value);
        break;
      case WptTask::SET_VALUE:
        SetValue(_task._target, _task._value);
        break;
      case WptTask::SUBMIT_FORM:
        SubmitForm(_task._target);
        break;
    }
    _task.Reset();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void  Wpt::NavigateTo(CString url) {
  ATLTRACE(CString(_T("[wptbho] NavigateTo: ")) + url);
  if (_web_browser) {
    CComBSTR bstr_url = url;
    _web_browser->Navigate(bstr_url, 0, 0, 0, 0);
  }
}

/*-----------------------------------------------------------------------------
  Recursively delete the given reg key
-----------------------------------------------------------------------------*/
static void DeleteRegKey(HKEY hParent, LPCTSTR key, bool remove) {
  HKEY hKey;
  if (SUCCEEDED(RegOpenKeyEx(hParent, key, 0, KEY_READ | KEY_WRITE, &hKey))) {
    CAtlList<CString> keys;
    TCHAR subKey[255];
    memset(subKey, 0, sizeof(subKey));
    DWORD len = 255;
    DWORD i = 0;
    while (RegEnumKeyEx(hKey, i, subKey, &len, 0, 0, 0, 0) == ERROR_SUCCESS) {
      keys.AddTail(subKey);
      i++;
      len = 255;
      memset(subKey, 0, sizeof(subKey));
    }
    while (!keys.IsEmpty()) {
      CString child = keys.RemoveHead();
      DeleteRegKey(hKey, child, true);
    }
    RegCloseKey(hKey);
    if (remove)
      RegDeleteKey(hParent, key);
  }
}

/*-----------------------------------------------------------------------------
  recursively delete the given directory
-----------------------------------------------------------------------------*/
static void DeleteDirectory(LPCTSTR inPath, bool remove) {
  if (lstrlen(inPath)) {
    TCHAR * path = new TCHAR[MAX_PATH];
    lstrcpy(path, inPath);
    PathAppend(path, _T("*.*"));
    WIN32_FIND_DATA fd;
    HANDLE hFind = FindFirstFile(path, &fd);
    if (hFind != INVALID_HANDLE_VALUE) {
      do {
        if (lstrcmp(fd.cFileName, _T(".")) && lstrcmp(fd.cFileName,_T(".."))) {
          lstrcpy(path, inPath);
          PathAppend(path, fd.cFileName);
          if( fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY ) {
            DeleteDirectory(path, true);
          }
        }
      } while(FindNextFile(hFind, &fd));
      FindClose(hFind);
    }
    delete [] path;
    if (remove)
      RemoveDirectory(inPath);
  }
}

/*-----------------------------------------------------------------------------
  Delete a directory whose path is retrieved from a reg key
-----------------------------------------------------------------------------*/
static void DeleteProfileDirectory(LPCTSTR reg_path, LPCTSTR reg_key, 
                                    LPCTSTR sub_dir = NULL) {
  HKEY key;
  TCHAR path[MAX_PATH];
  if (SUCCEEDED(RegOpenKeyEx(HKEY_CURRENT_USER, reg_path, 0, KEY_READ, &key))){
    DWORD len = _countof(path);
    if (SUCCEEDED(RegQueryValueEx(key, reg_key, 0, 0, (LPBYTE)path, &len))) {
      TCHAR dir[MAX_PATH];
      ExpandEnvironmentStrings(path, dir, _countof(dir));
      if (sub_dir)
        PathAppend(dir, sub_dir);
      DeleteDirectory(dir, false);
    }
    RegCloseKey(key);
  }
}

/*-----------------------------------------------------------------------------
  Delete IE's various caches
-----------------------------------------------------------------------------*/
void  Wpt::ClearCache(void) {
  // first WinInet's supported method for cache clearing
  HANDLE hEntry;
  DWORD len, entry_size = 0;
  GROUPID id;
  INTERNET_CACHE_ENTRY_INFO * info = NULL;
  HANDLE hGroup = FindFirstUrlCacheGroup(0, CACHEGROUP_SEARCH_ALL,
                                         0, 0, &id, 0);
  if (hGroup) {
    do {
      len = entry_size;
      hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, id, info, &len,
                                        NULL, NULL, NULL);
      if (!hEntry && GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
        entry_size = len;
        info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
        if (info) {
          hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, id, info,
                                            &len, NULL, NULL, NULL);
        }
      }
      if (hEntry && info) {
        bool ok = true;
        do {
          DeleteUrlCacheEntry(info->lpszSourceUrlName);
          len = entry_size;
          if (!FindNextUrlCacheEntryEx(hEntry, info, &len, NULL, NULL, NULL)) {
            if (GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
              entry_size = len;
              info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
              if (info) {
                if (!FindNextUrlCacheEntryEx(hEntry, info, &len, NULL, NULL, 
                                             NULL)) {
                  ok = false;
                }
              }
            } else {
              ok = false;
            }
          }
        } while (ok);
      }
      if (hEntry) {
        FindCloseUrlCache(hEntry);
      }
      DeleteUrlCacheGroup(id, CACHEGROUP_FLAG_FLUSHURL_ONDELETE, 0);
    } while(FindNextUrlCacheGroup(hGroup, &id,0));
    FindCloseUrlCache(hGroup);
  }

  len = entry_size;
  hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, 0, info, &len,
                                    NULL, NULL, NULL);
  if (!hEntry && GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
    entry_size = len;
    info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
    if (info) {
      hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, 0, info, &len,
                                        NULL, NULL, NULL);
    }
  }
  if (hEntry && info) {
    bool ok = true;
    do {
      DeleteUrlCacheEntry(info->lpszSourceUrlName);
      len = entry_size;
      if (!FindNextUrlCacheEntryEx(hEntry, info, &len, NULL, NULL, NULL)) {
        if (GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
          entry_size = len;
          info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
          if (info) {
            if (!FindNextUrlCacheEntryEx(hEntry, info, &len, NULL, NULL,
                                         NULL)) {
              ok = false;
            }
          }
        } else {
          ok = false;
        }
      }
    } while (ok);
  }
  if (hEntry) {
    FindCloseUrlCache(hEntry);
  }

  len = entry_size;
  hEntry = FindFirstUrlCacheEntry(NULL, info, &len);
  if (!hEntry && GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
    entry_size = len;
    info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
    if (info) {
      hEntry = FindFirstUrlCacheEntry(NULL, info, &len);
    }
  }
  if (hEntry && info) {
    bool ok = true;
    do {
      DeleteUrlCacheEntry(info->lpszSourceUrlName);
      len = entry_size;
      if (!FindNextUrlCacheEntry(hEntry, info, &len)) {
        if (GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
          entry_size = len;
          info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
          if (info) {
            if (!FindNextUrlCacheEntry(hEntry, info, &len)) {
              ok = false;
            }
          }
        } else {
          ok = false;
        }
      }
    } while (ok);
  }
  if (hEntry) {
    FindCloseUrlCache(hEntry);
  }
  if (info)
    free(info);

  // now delete the undocumented directories and registry keys
  DeleteProfileDirectory(REG_SHELL_FOLDERS, _T("Cookies"));
  DeleteProfileDirectory(REG_SHELL_FOLDERS, _T("History"));
  DeleteProfileDirectory(REG_SHELL_FOLDERS, _T("Cache"));
  DeleteProfileDirectory(REG_SHELL_FOLDERS, _T("Local AppData"), 
                          _T("\\Microsoft\\Silverlight"));
  DeleteProfileDirectory(REG_SHELL_FOLDERS, _T("AppData"), 
                          _T("\\Macromedia\\Flash Player\\#SharedObjects"));
  DeleteProfileDirectory(REG_DOM_STORAGE_KEY, _T("CachePath"));

  // delete the local storage quotas from the registry
  DeleteRegKey(HKEY_CURRENT_USER, REG_DOM_STORAGE_LOW, false);
  DeleteRegKey(HKEY_CURRENT_USER, REG_DOM_STORAGE, false);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void  Wpt::SetCookie(CString path, CString value) {
  InternetSetCookieEx(path.Trim(), NULL, value, 
      INTERNET_COOKIE_EVALUATE_P3P | INTERNET_COOKIE_THIRD_PARTY,
      (DWORD_PTR)_T("CP=NOI CUR OUR NOR"));
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Wpt::Exec(CString javascript) {
  bool ret = false;
  javascript.Replace(_T("\r"), _T(" "));
  javascript.Replace(_T("\n"), _T(" "));
  if (_web_browser) {
    CComPtr<IDispatch> dispatch;
    if (SUCCEEDED(_web_browser->get_Document(&dispatch))) {
      CComQIPtr<IHTMLDocument2> document = dispatch;
      if (document) {
        CComPtr<IHTMLWindow2> window;
        if (SUCCEEDED(document->get_parentWindow(&window))) {
          _variant_t result;
          BSTR lang = SysAllocString(L"Javascript");
          CComBSTR script = javascript;
          if (SUCCEEDED(window->execScript(script, lang, &result)))
            ret = true;
          SysFreeString(lang);
        }
      }
    }
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool  Wpt::Invoke(LPOLESTR function, _variant_t &result) {
  bool ret = false;
  if (_web_browser) {
    CComPtr<IDispatch> dispatch;
    if (SUCCEEDED(_web_browser->get_Document(&dispatch))) {
      CComQIPtr<IHTMLDocument> document = dispatch;
      if (document) {
        CComPtr<IDispatch> script;
        if (SUCCEEDED(document->get_Script(&script)) && script) {
          DISPID id = 0;
          if (SUCCEEDED(script->GetIDsOfNames(IID_NULL, &function, 1,
                                              LOCALE_SYSTEM_DEFAULT, &id))) {
            result.Clear();
            DISPPARAMS dpNoArgs = {NULL, NULL, 0, 0};
            if (SUCCEEDED(script->Invoke(id, IID_NULL, LOCALE_SYSTEM_DEFAULT,
                DISPATCH_METHOD, &dpNoArgs, &result, NULL, NULL)))
              ret = true;
          }
        }
      }
    }
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void  Wpt::Click(CString target) {
  CComPtr<IHTMLElement> element = FindDomElement(target);
  if (element) {
    element->click();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void  Wpt::SetInnerHTML(CString target, CString value) {
  CComPtr<IHTMLElement> element = FindDomElement(target);
  if (element) {
    element->put_innerHTML(_bstr_t(value));
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void  Wpt::SetInnerText(CString target, CString value) {
  CComPtr<IHTMLElement> element = FindDomElement(target);
  if (element) {
    element->put_innerText(_bstr_t(value));
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void  Wpt::SetValue(CString target, CString value) {
  CComPtr<IHTMLElement> element = FindDomElement(target);
  if (element) {
    CComQIPtr<IHTMLInputElement> input = element;
    if (input) {
      input->put_value(_bstr_t(value));
    } else {
      CComQIPtr<IHTMLTextAreaElement> textArea = element;
      if (textArea) {
        textArea->put_value(_bstr_t(value));
      }
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void  Wpt::SubmitForm(CString target) {
  CComQIPtr<IHTMLFormElement> form = FindDomElement(target);
  if (form) {
    form->submit();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void  Wpt::Block(CString block_string) {
  // TODO: Implement block command
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void  Wpt::SetDomElement(CString target) {
  // TODO: Implement setdomelement command
}

/*-----------------------------------------------------------------------------
  Find the given DOM element
-----------------------------------------------------------------------------*/
CComPtr<IHTMLElement> Wpt::FindDomElement(CString target) {
  CComPtr<IHTMLElement> result;

  // first, translate the target string into it's component parts
  CString attribute = _T("id");
  CString value = target;
  value.Trim();
  int index = target.Find('=');
  if (index == -1)
    index = target.Find('\'');
  int index2 = target.Find('<');
  attrOperator op = equal;
  if (index2 != -1 && (index2 < index || index == -1)) {
    index = index2;
    op = left;
  }
  int index3 = target.Find('^');
  if (index3 != -1 && (index3 < index || index == -1) 
      && (index3 < index2 || index2 == -1) ) {
    index = index3;
    op = mid;
  }
  if (index != -1) {
    attribute = target.Left(index);
    value = target.Mid(index + 1);
    value.Trim();
    value.Trim(_T("\""));
  }
  index = attribute.Find(':');
  CString tag;
  if (index != -1) {
    tag = attribute.Left(index);
    attribute = attribute.Mid(index + 1);
  }
  attribute.Trim();
  
  if (_web_browser) {
    CComPtr<IDispatch> dispatch;
    if (SUCCEEDED(_web_browser->get_Document(&dispatch))) {
      CComQIPtr<IHTMLDocument2> document = dispatch;
      if (document) {
        result = FindDomElementInDocument(tag, attribute, value, op, document);
      }
    }
  }
  
  return result;
}

/*-----------------------------------------------------------------------------
  Converts a IHTMLWindow2 object to a IWebBrowser2.
  Returns NULL in case of failure.
-----------------------------------------------------------------------------*/
CComQIPtr<IWebBrowser2> HtmlWindowToHtmlWebBrowser(
    CComQIPtr<IHTMLWindow2> window) {
  CComQIPtr<IWebBrowser2> browser;
  CComQIPtr<IServiceProvider> provider = window;
  if (provider)
    provider->QueryService(IID_IWebBrowserApp, IID_IWebBrowser2,
                           (void**)&browser);
  return browser;
}

/*-----------------------------------------------------------------------------
  Convert a window to a document, accounting for cross-domain security
  issues.
-----------------------------------------------------------------------------*/
CComQIPtr<IHTMLDocument2> HtmlWindowToHtmlDocument(
    CComQIPtr<IHTMLWindow2> window) {
  CComQIPtr<IHTMLDocument2> document;
  if (!SUCCEEDED(window->get_document(&document))) {
    CComQIPtr<IWebBrowser2>  browser = HtmlWindowToHtmlWebBrowser(window);
    if (browser) {
      CComQIPtr<IDispatch> disp;
      if(SUCCEEDED(browser->get_Document(&disp)) && disp)
        document = disp;
    }
  }
  return document;
}

/*-----------------------------------------------------------------------------
  Recursively scan the given document and any IFrames within it
-----------------------------------------------------------------------------*/
CComPtr<IHTMLElement> Wpt::FindDomElementInDocument(CString tag, 
        CString attribute, CString value, attrOperator op, 
        CComPtr<IHTMLDocument2> document) {
  CComPtr<IHTMLElement> result;
  CComBSTR attrib(attribute);
  bool innerText = false;
  bool innerHtml = false;
  bool sourceIndex = false;
  if( !attribute.CompareNoCase(_T("innerText")) )
    innerText = true;
  else if( !attribute.CompareNoCase(_T("innerHtml")) )
    innerHtml = true;
  else if( !attribute.CompareNoCase(_T("sourceIndex")) )
    sourceIndex = true;
  if (!attribute.CompareNoCase(_T("class")))
    attribute = _T("className");

  if (document) {
    if (!result) {
      bool ok = false;
      if (!sourceIndex && !innerText && !innerHtml && op == equal 
        && tag.IsEmpty() && (!attribute.CompareNoCase(_T("id")))) {
        CComQIPtr<IHTMLDocument3> doc3 = document;
        if (doc3) {
          ok = true;
          doc3->getElementById(_bstr_t(value), &result);
        }
      }
      if (!ok) {
        CComPtr<IHTMLElementCollection> dom_elements;
        ok = false;
        if (!tag.IsEmpty() || (!attribute.CompareNoCase(_T("name")) 
            && op == equal)) {
          CComQIPtr<IHTMLDocument3> doc3 = document;
          if (doc3) {
            ok = true;
            if (!attribute.CompareNoCase(_T("name")) && op == equal) {
              doc3->getElementsByName(_bstr_t(value), &dom_elements);
            } else if (!tag.IsEmpty()) {
              doc3->getElementsByTagName(_bstr_t(tag), &dom_elements);
            }
          }
        }
        if (!ok && SUCCEEDED(document->get_all(&dom_elements)))
          ok = true;
        // scan the collection of DOM elements for the one we are interested in
        if (ok && dom_elements) {
          long count = 0;
          if (SUCCEEDED(dom_elements->get_length(&count))) {
            for (long i = 0; i < count && !result; i++) {
              _variant_t index = i;
              CComPtr<IDispatch> item;
              if (SUCCEEDED(dom_elements->item(index, index, &item)) && item) {
                CComQIPtr<IHTMLElement> element = item;
                if (element) {
                  ok = false;
                  if (tag.IsEmpty())
                    ok = true;
                  else {
                    _bstr_t elementTag;
                    if (SUCCEEDED(element->get_tagName(
                        elementTag.GetAddress()))) {
                      CString elTag = elementTag;
                      if (!tag.CompareNoCase(elTag))
                        ok = true;
                    }
                  }
                  if (ok) {								
                    _variant_t varVal;
                    _bstr_t text;
                    if (sourceIndex) {
                      long index;
                      if (SUCCEEDED(element->get_sourceIndex(&index))) {
                        long lValue = _ttol(value);
                        if( index == lValue )
                          result = element;
                      }
                    } else {
                      if( innerText )
                        element->get_innerText(text.GetAddress());
                      else if (innerHtml)
                        element->get_innerHTML(text.GetAddress());
                      else if (SUCCEEDED(element->getAttribute(attrib, 0, 
                                              &varVal))) {
                        if (varVal.vt != VT_EMPTY && varVal.vt != VT_NULL 
                          && varVal.vt != VT_ERROR) {
                          text = (_bstr_t)varVal;
                        }
                      }
                      CString val = text;
                      val.Trim();
                      if (val.GetLength()) {
                        switch (op) {
                          case equal: {
                              if( val == value )
                                result = element;
                            } break;
                          case left: {
                              if( val.Left(value.GetLength()) == value )
                                result = element;
                            } break;
                          case mid: {
                              if( val.Find(value) > -1 )
                                result = element;
                            } break;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // walk the IFrames diriectly (the OLE way doesn't appear to always work)
    if (!result) {
      CComPtr<IHTMLFramesCollection2> frames;
      if (document->get_frames(&frames) && frames) {
        long count = 0;
        if (SUCCEEDED(frames->get_length(&count))) {
          for (long i = 0; i < count && !result; i++) {
            _variant_t index = i;
            _variant_t varFrame;
            if (SUCCEEDED(frames->item(&index, &varFrame))) {
              CComQIPtr<IHTMLWindow2> window(varFrame);
              if (window) {
                CComQIPtr<IHTMLDocument2> frameDoc;
                frameDoc = HtmlWindowToHtmlDocument(window);
                if (frameDoc)
                  result = FindDomElementInDocument(tag, attribute, value, op, 
                                                      frameDoc);
              }
            }
          }
        }
      }
    }
  }
  
  return result;
}

/*-----------------------------------------------------------------------------
  Expire any items in the cache that will expire within X seconds.
-----------------------------------------------------------------------------*/
void  Wpt::ExpireCache(CString target) {
  DWORD seconds = 0;
  if (target.GetLength())
    seconds = _tcstoul(target, NULL, 10);
  HANDLE hEntry;
  DWORD len, entry_size = 0;
  GROUPID id;
  INTERNET_CACHE_ENTRY_INFO * info = NULL;
  HANDLE hGroup = FindFirstUrlCacheGroup(0, CACHEGROUP_SEARCH_ALL, 0, 0,
                                         &id, 0);
  if (hGroup) {
    do {
      len = entry_size;
      hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, id, info, &len,
                                        NULL, NULL, NULL);
      if (!hEntry && GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
        entry_size = len;
        info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
        if (info)
          hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, id, info,
                                            &len, NULL, NULL, NULL);
      }
      if (hEntry && info) {
        bool ok = true;
        do {
          ExpireCacheEntry(info, seconds);
          len = entry_size;
          if (!FindNextUrlCacheEntryEx(hEntry, info, &len, NULL, NULL, NULL)) {
            if (GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
              entry_size = len;
              info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
              if (info && !FindNextUrlCacheEntryEx(hEntry, info, &len,
                                                   NULL, NULL, NULL))
                ok = false;
            } else {
              ok = false;
            }
          }
        } while (ok);
      }
      if (hEntry)
        FindCloseUrlCache(hEntry);
    } while(FindNextUrlCacheGroup(hGroup, &id,0));
    FindCloseUrlCache(hGroup);
  }

  len = entry_size;
  hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, 0, info, &len,
                                    NULL, NULL, NULL);
  if (!hEntry && GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
    entry_size = len;
    info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
    if (info)
      hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, 0, info, &len,
                                        NULL, NULL, NULL);
  }
  if (hEntry && info) {
    bool ok = true;
    do {
      ExpireCacheEntry(info, seconds);
      len = entry_size;
      if (!FindNextUrlCacheEntryEx(hEntry, info, &len, NULL, NULL, NULL)) {
        if (GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
          entry_size = len;
          info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
          if (info && !FindNextUrlCacheEntryEx(hEntry, info, &len,
                                               NULL, NULL, NULL))
            ok = false;
        } else {
          ok = false;
        }
      }
    } while (ok);
  }
  if (hEntry)
    FindCloseUrlCache(hEntry);

  len = entry_size;
  hEntry = FindFirstUrlCacheEntry(NULL, info, &len);
  if (!hEntry && GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
    entry_size = len;
    info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
    if (info)
      hEntry = FindFirstUrlCacheEntry(NULL, info, &len);
  }
  if (hEntry && info) {
    bool ok = true;
    do {
      ExpireCacheEntry(info, seconds);
      len = entry_size;
      if (!FindNextUrlCacheEntry(hEntry, info, &len)) {
        if (GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
          entry_size = len;
          info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
          if (info && !FindNextUrlCacheEntry(hEntry, info, &len))
            ok = false;
        } else {
          ok = false;
        }
      }
    } while (ok);
  }
  if (hEntry)
    FindCloseUrlCache(hEntry);
  if (info)
    free(info);
}

/*-----------------------------------------------------------------------------
  Expire a single item in the cache if it expires within X seconds.
-----------------------------------------------------------------------------*/
void Wpt::ExpireCacheEntry(INTERNET_CACHE_ENTRY_INFO * info, DWORD seconds) {
  if (info->lpszSourceUrlName) {
    FILETIME now_filetime;
    GetSystemTimeAsFileTime(&now_filetime);
    ULARGE_INTEGER now;
    now.HighPart = now_filetime.dwHighDateTime;
    now.LowPart = now_filetime.dwLowDateTime;
    ULARGE_INTEGER expires;
    expires.HighPart = info->ExpireTime.dwHighDateTime;
    expires.LowPart = info->ExpireTime.dwLowDateTime;
    if (!seconds || now.QuadPart <= expires.QuadPart) {
      now.QuadPart = now.QuadPart / 1000000;
      expires.QuadPart = expires.QuadPart / 1000000;
      ULARGE_INTEGER remaining;
      remaining.QuadPart = expires.QuadPart - now.QuadPart;
      if (!seconds || remaining.QuadPart <= seconds) {
        // just set the expiration as the last accessed time
        info->ExpireTime.dwHighDateTime = info->LastAccessTime.dwHighDateTime;
        info->ExpireTime.dwLowDateTime = info->LastAccessTime.dwLowDateTime;
        SetUrlCacheEntryInfo(info->lpszSourceUrlName, info,
                             CACHE_ENTRY_EXPTIME_FC);
      }
    }
  }
}

/*-----------------------------------------------------------------------------
  Recursively count the number of DOM elements on the page
-----------------------------------------------------------------------------*/
DWORD Wpt::CountDOMElements(CComQIPtr<IHTMLDocument2> &document) {
  DWORD count = 0;
  if (document) {
    IHTMLElementCollection *coll;
    if (SUCCEEDED(document->get_all(&coll)) && coll) {
      long nodes = 0;
      if( SUCCEEDED(coll->get_length(&nodes)) )
        count += nodes;
      coll->Release();
    }

    // Recursively walk any iFrames
    IHTMLFramesCollection2 * frames = NULL;
    if (document->get_frames(&frames) && frames) {
      long num_frames = 0;
      if (SUCCEEDED(frames->get_length(&num_frames))) {
        for (long i = 0; i < num_frames; i++) {
          _variant_t index = i;
          _variant_t varFrame;
          if (SUCCEEDED(frames->item(&index, &varFrame))) {
            CComQIPtr<IHTMLWindow2> window(varFrame);
            if (window) {
              CComQIPtr<IHTMLDocument2> frameDoc;
              frameDoc = HtmlWindowToHtmlDocument(window);
              if (frameDoc)
                count += CountDOMElements(frameDoc);
            }
          }
        }
      }
      frames->Release();
    }
  }

  return count;
}

/*-----------------------------------------------------------------------------
  Collect the stats at the end of a test
-----------------------------------------------------------------------------*/
void Wpt::CollectStats(CString custom_metrics) {
  ATLTRACE(_T("[wptbho] - Wpt::CollectStats()"));
  if (_web_browser) {
    CComPtr<IDispatch> dispatch;
    if (SUCCEEDED(_web_browser->get_Document(&dispatch))) {
      CComQIPtr<IHTMLDocument2> document = dispatch;
      if (document) {
        DWORD count = CountDOMElements(document);
        _wpt_interface.ReportDOMElementCount(count);
        ATLTRACE(_T("[wptbho] - Wpt::CollectStats() Reported %d DOM elements"),
                count);
      }
    }
  }
  if (Exec(DOM_SCRIPT_FUNCTIONS)) {
    _variant_t timings;
    if (Invoke(GET_USER_TIMINGS, timings)) {
      if (timings.vt == VT_BSTR) {
        CString user_timings(timings);
        _wpt_interface.ReportUserTiming(user_timings.Trim(_T("[]")));
      }
    }
    if (Invoke(GET_NAV_TIMINGS, timings)) {
      if (timings.vt == VT_BSTR) {
        CString nav_timings(timings);
        _wpt_interface.ReportNavigationTiming(nav_timings);
      }
    }
  }
  int len = custom_metrics.GetLength();
  if (len) {
    char * buff = (char *)malloc(len + 1);
    if (buff) {
      CString out = _T("{");
      int pos = 0;
      int count = 0;
      CString line = custom_metrics.Tokenize(_T("\r\n"), pos);
      while (pos != -1) {
        int split = line.Find(_T(":"));
        if (split > 0) {
          CString name = line.Left(split);
          CStringA encoded = CT2A(line.Mid(split + 1), CP_UTF8);
          int decoded_len = len;
          if (Base64Decode((LPCSTR)encoded, encoded.GetLength(),
              (BYTE*)buff, &decoded_len) && decoded_len) {
            buff[decoded_len] = 0;
            CStringA code = buff;
            CString result = GetCustomMetric((LPCTSTR)CA2T(code, CP_UTF8));
            if (count)
              out += _T(",");
            out += _T("\"");
            out += JSONEscape(name);
            out += "\":\"";
            out += JSONEscape(result);
            out += "\"";
            count++;
          }
        }
        line = custom_metrics.Tokenize(_T("\r\n"), pos);
      }
      out += _T("}");
      if (count)
        _wpt_interface.ReportCustomMetrics(out);
      free(buff);
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CString Wpt::GetCustomMetric(CString code) {
  CString ret;
  CString functionName;

  _exec_count++;
  functionName.Format(_T("wptCustomJs%d"), _exec_count);
  CString functionBody = CString(_T("var ")) + functionName +
                         _T(" = (function(){");
  functionBody += code;
  functionBody += _T(";});");

  if (Exec(functionBody)) {
    _variant_t result;
    DWORD len = functionName.GetLength() + 1;
    LPOLESTR fn = (LPOLESTR)malloc(len * sizeof(OLECHAR));
    if (fn) {
      lstrcpyn(fn, (LPCTSTR)functionName, len);
      if (Invoke(fn, result)) {
        if (result.vt != VT_BSTR)
          result.ChangeType(VT_BSTR);
        if (result.vt == VT_BSTR)
          ret.SetString(result.bstrVal);
      }
      free(fn);
    }
  }
  
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CString Wpt::JSONEscape(CString src) {
  src.Replace(_T("\\"), _T("\\\\"));
  src.Replace(_T("\""), _T("\\\""));
  src.Replace(_T("/"),  _T("\\/"));
  src.Replace(_T("\b"), _T("\\b"));
  src.Replace(_T("\r"), _T("\\r"));
  src.Replace(_T("\n"), _T("\\n"));
  src.Replace(_T("\t"), _T("\\t"));
  src.Replace(_T("\f"), _T("\\f"));
  return src;
}

/*-----------------------------------------------------------------------------
  Periodically check the browser state in case it changes to ready but
  the onload event never fired.
-----------------------------------------------------------------------------*/
void Wpt::CheckBrowserState() {
  if (_navigating && _web_browser) {
    READYSTATE ready_state = READYSTATE_COMPLETE;
    if (SUCCEEDED(_web_browser->get_ReadyState(&ready_state)) &&
        ready_state == READYSTATE_COMPLETE)
      OnLoad();
  }
}

/*-----------------------------------------------------------------------------
  Check for tasks on a background thread so we don't block the browser thread
-----------------------------------------------------------------------------*/
void Wpt::TaskThread(void) {
  while (!_must_exit) {
    if (!_active && !_processing_task && _wpt_interface.GetTask(_task)) {
      SendMessage(_message_window, UWM_TASK, 0, 0);
      if (_active)
        Sleep(TASK_INTERVAL);
    } else
      Sleep(TASK_INTERVAL);
  }
}
