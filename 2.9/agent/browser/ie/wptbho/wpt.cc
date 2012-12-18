#include "StdAfx.h"
#include "wpt.h"
#include "wpt_task.h"
#include <comdef.h>

extern HINSTANCE dll_hinstance;

const DWORD TASK_INTERVAL = 1000;
static const TCHAR * GLOBAL_TESTING_MUTEX = _T("Global\\wpt_testing_active");
static const TCHAR * HOOK_DLL = _T("wpthook.dll");

typedef BOOL (WINAPI * PFN_INSTALL_HOOK)(HANDLE process);

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


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Wpt::Wpt(void):_active(false),_task_timer(NULL),_hook_dll(NULL) {
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Wpt::~Wpt(void) {
}

VOID CALLBACK TaskTimer(PVOID lpParameter, BOOLEAN TimerOrWaitFired) {
  if( lpParameter )
    ((Wpt *)lpParameter)->CheckForTask();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Wpt::Install(CComPtr<IWebBrowser2> web_browser) {
  AtlTrace(_T("[wptbho] - Start"));
  HANDLE active_mutex = OpenMutex(SYNCHRONIZE, FALSE, GLOBAL_TESTING_MUTEX);
  if (!_task_timer && active_mutex) {
    if (InstallHook()) {
      _web_browser = web_browser;
      CComBSTR bstr_url = L"http://127.0.0.1:8888/blank.html";
      _web_browser->Navigate(bstr_url, 0, 0, 0, 0);
    }
  } else {
    AtlTrace(_T("[wptbho] - Start, failed to open mutex"));
  }
  if (active_mutex)
    CloseHandle(active_mutex);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Wpt::Start(void) {
  if (!_task_timer) {
    timeBeginPeriod(1);
    CreateTimerQueueTimer(&_task_timer, NULL, ::TaskTimer, this, 
                          TASK_INTERVAL, TASK_INTERVAL, WT_EXECUTEDEFAULT);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Wpt::Stop(void) {
  if (_task_timer) {
    DeleteTimerQueueTimer(NULL, _task_timer, NULL);
    _task_timer = NULL;
    timeEndPeriod(1);
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
  AtlTrace(_T("[wptbho] - InstallHook"));
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
            (PFN_INSTALL_HOOK)GetProcAddress(_hook_dll, "_InstallHook@4");
          if (InstallHook && InstallHook(GetCurrentProcess()) ) {
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
  AtlTrace(_T("[wptbho] - InstallHook complete"));
  return ok;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Wpt::OnLoad() {
  if (_active) {
    _wpt_interface.OnLoad();
    _active = false;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Wpt::OnNavigate() {
  if (_active)
    _wpt_interface.OnNavigate();
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
  if (!_active) {
    WptTask task;
    if (_wpt_interface.GetTask(task)) {
      if (task._record)
        _active = true;
      switch (task._action) {
        case WptTask::NAVIGATE: 
          NavigateTo(task._target); 
          break;
        case WptTask::CLEAR_CACHE: 
          ClearCache(); 
          break;
        case WptTask::SET_COOKIE:
          SetCookie(task._target, task._value);
          break;
        case WptTask::EXEC:
          Exec(task._target);
          break;
        case WptTask::CLICK:
          Click(task._target);
          break;
        case WptTask::SET_INNER_HTML:
          SetInnerHTML(task._target, task._value);
          break;
        case WptTask::SET_INNER_TEXT:
          SetInnerText(task._target, task._value);
          break;
        case WptTask::SET_VALUE:
          SetValue(task._target, task._value);
          break;
        case WptTask::SUBMIT_FORM:
          SubmitForm(task._target);
          break;
        case WptTask::BLOCK:
          Block(task._target);
          break;
        case WptTask::SET_DOM_ELEMENT:
          SetDomElement(task._target);
          break;
      }
      if (!_active)
        CheckForTask();
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void  Wpt::NavigateTo(CString url) {
  AtlTrace(CString(_T("[wptbho] NavigateTo: ")) + url);
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
void  Wpt::Exec(CString javascript) {
  javascript.Replace(_T("\r"), _T(" "));
  javascript.Replace(_T("\n"), _T(" "));
  if (_web_browser) {
    CComPtr<IDispatch> dispatch;
    if (SUCCEEDED(_web_browser->get_Document(&dispatch))) {
      CComQIPtr<IHTMLDocument2> document = dispatch;
      if (document) {
        CComPtr<IHTMLWindow2> window;
        if (SUCCEEDED(document->get_parentWindow(&window))) {
          VARIANT var;
          VariantInit(&var);
          BSTR lang = SysAllocString(L"Javascript");
          CComBSTR script = javascript;
          window->execScript(script, lang, &var);
          SysFreeString(lang);
        }
      }
    }
  }
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

    // walk the IFrames using OLE (to bypass security blocks)
    if (!result) {
      CComQIPtr<IOleContainer> ole(document);
      if (ole) {
        CComPtr<IEnumUnknown> objects;
        if (SUCCEEDED(ole->EnumObjects(OLECONTF_EMBEDDINGS, &objects)) 
                        && objects) {
          IUnknown* pUnk;
          ULONG uFetched;
          while (!result && S_OK == objects->Next(1, &pUnk, &uFetched)) {
            CComQIPtr<IWebBrowser2> browser(pUnk);
            pUnk->Release();
            if (browser) {
              CComPtr<IDispatch> disp;
              if (SUCCEEDED(browser->get_Document(&disp)) && disp) {
                CComQIPtr<IHTMLDocument2> frameDoc(disp);
                if (frameDoc)
                  result = FindDomElementInDocument(tag, attribute, value, op, 
                                                          frameDoc);
              }
            }
          }
        }
      }			
    }

    // walk the IFrames diriectly (the OLE way doesn't appear to always work)
    if (!result) {
      CComPtr<IHTMLFramesCollection2> frames;
      if (SUCCEEDED(document->get_frames(&frames)) && frames) {
        long count = 0;
        if (SUCCEEDED(frames->get_length(&count))) {
          for (long i = 0; i < count && !result; i++) {
            _variant_t index = i;
            _variant_t varFrame;
            if (SUCCEEDED(frames->item(&index, &varFrame))) {
              CComQIPtr<IHTMLWindow2> window(varFrame);
              if (window) {
                CComQIPtr<IHTMLDocument2> frameDoc;
                if (SUCCEEDED(window->get_document(&frameDoc)) && frameDoc)
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
