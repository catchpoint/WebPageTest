/*
Copyright (c) 2005-2007, AOL, LLC.

All rights reserved.

Redistribution and use in source and binary forms, with or without modification, 
are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
		this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice, 
		this list of conditions and the following disclaimer in the documentation 
		and/or other materials provided with the distribution.
    * Neither the name of the company nor the names of its contributors may be 
		used to endorse or promote products derived from this software without 
		specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

#include "StdAfx.h"
#include "WatchDlg.h"
#include "ScriptEngine.h"

CScriptEngine::CScriptEngine(void):
	scriptStep(0)
	, script_ignoreErrors(false)
	, hIntervalMutex(NULL)
	, script_result(0)
	, script_logErrors(true)
	, script_error(false)
	, script_logData(true)
	, script_timeout(-1)
  , script_activity_timeout(0)
	, script_active(false)
	, script_modifyUserAgent(true)
  , script_waitForJSDone(false)
  , script_combineSteps(0)
  , no_run(0)
{
}

CScriptEngine::~CScriptEngine(void)
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CScriptEngine::Reset(void)
{
	__super::Reset();

	EnterCriticalSection(&cs);

	script_domElement.Empty();
	script_domRequest.Empty();
	script_domRequestType = END;
	script_endRequest.Empty();
	newEventName.Empty();
	script_error = false;

	LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
	Script is done - reset all of the scripting states and exit if necessary
-----------------------------------------------------------------------------*/
void CScriptEngine::ScriptComplete(void)
{
	ATLTRACE(_T("[Pagetest] - CScriptEngine::ScriptComplete\n"));

	DWORD stepsRun = (DWORD)scriptStep;
	scriptStep = 0;
	script_ABM = -1;
	script_ignoreErrors = false;
	script_logErrors = true;
	script_logData = true;
	script_timeout = -1;
  script_activity_timeout = 0;
	script_active = false;
	script_modifyUserAgent = true;
	script_lastCommand.Empty();
	userAgent.Empty();
	dnsServers.RemoveAll();
  hostOverride.RemoveAll();
  overrideHostUrls.RemoveAll();
	runningScript = false;
  script_combineSteps = 0;
  no_run = 0;
	
	if( hIntervalMutex )
	{
		ReleaseMutex(hIntervalMutex);
		CloseHandle(hIntervalMutex);
		hIntervalMutex = NULL;
	}
	
	script_eventName.Empty();
	variables.RemoveAll();
	script.RemoveAll();
	dnsOverride.RemoveAll();
	dnsNameOverride.RemoveAll();
	script_basicAuth.Empty();

	// re-store the result in the registry in case there was a script error
	CRegKey key;
	if( key.Open(HKEY_CURRENT_USER, _T("Software\\AOL\\ieWatch"), KEY_WRITE) == ERROR_SUCCESS )
	{
		key.SetDWORDValue(_T("Result"), script_result);
		
		// also save out the number of script steps that were run
		key.SetDWORDValue(_T("Script Steps"), stepsRun);
		
		key.Close();
	}

	// if we're running from within urlBlaster - now is the time to exit
	if( exitWhenDone )
	{
		ATLTRACE(_T("[Pagetest] Exiting\n"));
    available = false;
		POSITION pos = browsers.GetHeadPosition();
		while(pos)
		{
			CBrowserTracker tracker = browsers.GetNext(pos);
			if( tracker.browser && tracker.threadId == GetCurrentThreadId())
				tracker.browser->Quit();
		}

		if( hMainWindow )
			::PostMessage(hMainWindow, WM_CLOSE, 0, 0);
	}
	else
		TestComplete();
}

/*-----------------------------------------------------------------------------
	Start running a script
-----------------------------------------------------------------------------*/
bool CScriptEngine::RunScript(CString file)
{
	bool ret = false;
	
	// switch everything into script mode
	runningScript = true;
	script_result = 0;
	script_active = true;

  if (!script.IsEmpty() || LoadScript(file)) {
		ret = true;
		ContinueScript(true);
	} else {
		ScriptComplete();
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
	Load and parse the provided script
-----------------------------------------------------------------------------*/
bool CScriptEngine::LoadScript(CString file)
{
	bool ret = false;
	
	script.RemoveAll();
	scriptFile.Empty();
	
	ATLTRACE(_T("[Pagetest] Loading script - '%s'\n"), (LPCTSTR)file);
	if( LocateFile(file) )
	{
		ATLTRACE(_T("[Pagetest] Script located - '%s'\n"), (LPCTSTR)file);
		
		// load the whole script file into a string and then we'll tokenize it
		HANDLE hFile = CreateFile(file, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, 0, OPEN_EXISTING, 0, 0 );
		if( hFile != INVALID_HANDLE_VALUE )
		{
			DWORD size = GetFileSize(hFile, 0);
			if( size )
			{
				char * buff = (char *)malloc(size + 1);
				if( buff )
				{
					DWORD bytes;
					if( ReadFile(hFile, buff, size, &bytes, 0) && bytes == size )
					{
						bool skipping = false;
						buff[size] = 0;	// NULL terminate it
						CString scriptBuff = CA2T(buff);
						
						int pos = 0;
						do
						{
							 CString line= scriptBuff.Tokenize(_T("\r\n"), pos);
							 if( !skipping && !line.IsEmpty() && line.GetAt(0) != _T('/') && line.GetAt(0) != _T('*') && line.GetAt(0) != _T('\t') )
							 {
								int linePos = 0;
								CScriptItem item;
								item.command = line.Tokenize(_T("\t"), linePos).Trim();
								if( linePos >= 0 && !item.command.IsEmpty() )
								{
									item.target = line.Tokenize(_T("\t"), linePos).Trim();
									if( linePos >= 0 && !item.target.IsEmpty() )
										item.value = line.Tokenize(_T("\t"), linePos);

                  if (PreProcessScriptItem(item)) {
									  // add this item to the script
									  script.AddTail(item);
                  }
								}
							 }
							 else if( !line.IsEmpty() )
							 {
								if( skipping && line.GetAt(0) == _T('*') )
									skipping = false;
								else if( line.GetAt(0) == _T('/') && line.GetAt(1) == _T('*') )
									skipping = true;
							 }
							 
						}while( pos >= 0 );
					}
					
					free(buff);
				}
			}
			
			CloseHandle(hFile);
		}
		else
		{
			ATLTRACE(_T("[Pagetest] Error opening script\n"));
		}
	}
	
	if( !script.IsEmpty() )
	{
		ret = true;
		scriptFile = file;

		// load the cached setting from the registry (we need to know before testing actually starts)
		CRegKey key;		
		if( key.Open(HKEY_CURRENT_USER, _T("Software\\America Online\\SOM"), KEY_READ) == ERROR_SUCCESS )
			key.QueryDWORDValue(_T("Cached"), cached);
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
	Run the commands in the script until we get to a wait point
	Also exit when the script is complete
-----------------------------------------------------------------------------*/
void CScriptEngine::ContinueScript(bool reset)
{
	ATLTRACE(_T("[Pagetest] - CScriptEngine::ContinueScript: errorCode = %d\n"), errorCode);

	if( !script_result && errorCode != 0 && errorCode != 99999 )
		script_result = errorCode;
		
	if( script.IsEmpty() || (errorCode != 0 && errorCode != 99999 && !script_ignoreErrors) )
		ScriptComplete();
	else
	{
		if( reset )
			available = true;

		// reset the required events for this step
		requiredRequests.RemoveAll();
    script_waitForJSDone = false;

		// loop through the script until it is done or we get to a wait event
		bool done = false;
		bool err = false;
		while( (!err || script_ignoreErrors) && !done && !script.IsEmpty() )
		{
			CScriptItem item = script.RemoveHead();
			err = true;
			
			script_lastCommand.Format(_T("%s %s %s"), (LPCTSTR)item.command, (LPCTSTR)item.target, (LPCTSTR)item.value);
			
			CString buff;
			buff.Format(_T("[Pagetest] - Parsing - %s\n"), (LPCTSTR)script_lastCommand);
			OutputDebugString(buff);
			
			// do any string substitution that is necessary
			VarReplace(item.target);
			VarReplace(item.value);
			
      if (no_run > 0) {
        if( !item.command.CompareNoCase(_T("if")) ) {
          no_run++;
        } else if( !item.command.CompareNoCase(_T("else")) ) {
          if (no_run == 1) {
            // else clause for the top-level condition
            no_run = 0;
          }
        } else if( !item.command.CompareNoCase(_T("endif")) ) {
          no_run = max(0, no_run - 1);
        }
        ATLTRACE(_T("[Pagetest] - no_run is now %d"), no_run);
			  err = false;
      } else {
			  buff.Format(_T("[Pagetest] - Executing - %s\n"), (LPCTSTR)script_lastCommand);
			  OutputDebugString(buff);

        if( !item.command.CompareNoCase(_T("if")) ) {
          if (!ConditionMatches(item.target, item.value)) {
            no_run = 1;
          }
				  err = false;
        } else if( !item.command.CompareNoCase(_T("else")) ) {
          // we just hit an else clause while we were in a block we were executing
          no_run = 1;
				  err = false;
        } else if( !item.command.CompareNoCase(_T("endif")) ) {
				  err = false;
        } else if( !item.command.CompareNoCase(_T("setEventName")) )
			  {
				  // set the script event name for the next event to happen
				  newEventName = item.target;
				  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("startMeasurement")) )
			  {
				  IncrementStep();
				  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("setDOMElement")) )
			  {
				  script_domElement = item.target;
				  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("setDOMRequest")) )
			  {
				  script_domRequest = item.target;
				  script_domRequestType = END;
				  if( !item.value.CompareNoCase(_T("TTFB")) )
					  script_domRequestType = TTFB;
				  else if( !item.value.CompareNoCase(_T("START")) )
					  script_domRequestType = START;
  					
				  err = false;
			  }
			  else if(!item.command.CompareNoCase(_T("requireRequest")) || !item.command.CompareNoCase(_T("requiredRequest")))
			  {
				  requiredRequests.AddTail(item.target);
				  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("setEndRequest")) )
			  {
				  script_endRequest = item.target;
				  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("setABM")) )
			  {
				  // set the ABM mode
				  script_ABM = _ttol(item.target);
				  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("setActivityTimeout")) )
			  {
				  // set the timeout for a given step (in seconds)
				  script_activity_timeout = __min(__max(_ttol(item.target), 0), 30000);
				  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("setTimeout")) )
			  {
				  // set the timeout for a given step (in seconds)
				  script_timeout = _ttol(item.target);
				  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("fvOnly")) )
			  {
				  err = false;
				  // if we are running a cached test, exit now
				  if( cached == 1 )
				  {
					  done = false;
					  script.RemoveAll();
				  }
			  }
			  else if( !item.command.CompareNoCase(_T("waitforComplete")) )
			  {
				  // wait for measurement to finish
				  done = IncrementStep();
				  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("navigate")) )
			  {
				  done = IncrementStep();	// implicit wait with any navigations

				  // navigate to the given url
				  if( !browsers.IsEmpty() )
				  {
					  CBrowserTracker tracker = browsers.GetHead();
					  if( tracker.browser && tracker.threadId == GetCurrentThreadId() )
					  {
						  if( script_url.IsEmpty() )
							  script_url = item.target;
  							
						  _bstr_t url = item.target;
						  if( SUCCEEDED(tracker.browser->Navigate(url, 0, 0, 0, 0)) )
							  err = false;
					  }
				  }

				  if( err )
				  {
					  done = false;
					  Reset();
				  }
			  }
			  else if( !item.command.CompareNoCase(_T("setValue")) )
			  {
          IncrementStep();
				  // set the value of a given HTML element
				  CComPtr<IHTMLElement> element = FindDomElementByAttribute( item.target );
  				
				  if( element )
				  {
					  // Try it as an input field (most common)
					  CComQIPtr<IHTMLInputElement> input = element;
					  if( input )
					  {
						  _bstr_t val = item.value;
						  if( SUCCEEDED(input->put_value(val)) )
							  err = false;
					  }
					  else
					  {
						  // try it as a textArea
						  CComQIPtr<IHTMLTextAreaElement> textArea = element;
						  if( textArea )
						  {
							  _bstr_t val = item.value;
							  if( SUCCEEDED(textArea->put_value(val)) )
								  err = false;
						  }
					  }
				  }
			  }
			  else if( !item.command.CompareNoCase(_T("setInnerText")) )
			  {
          IncrementStep();
				  // set the innerText of a given HTML element
				  CComPtr<IHTMLElement> element = FindDomElementByAttribute( item.target );
				  if( element )
				  {
					  _bstr_t val = item.value;
					  if( SUCCEEDED(element->put_innerText(val)) )
						  err = false;
				  }
			  }
			  else if( !item.command.CompareNoCase(_T("setInnerHTML")) )
			  {
          IncrementStep();
				  // set the innerText of a given HTML element
				  CComPtr<IHTMLElement> element = FindDomElementByAttribute( item.target );
				  if( element )
				  {
					  _bstr_t val = item.value;
					  if( SUCCEEDED(element->put_innerHTML(val)) )
						  err = false;
				  }
			  }
			  else if( !item.command.CompareNoCase(_T("selectValue")) )
			  {
          IncrementStep();
				  // Set the value of a drop-down list
				  CComPtr<IHTMLElement> element = FindDomElementByAttribute( item.target );
				  if( element )
				  {
					  CComQIPtr<IHTMLSelectElement> select = element;
					  if( select )
					  {
						  _bstr_t val = item.value;
						  if( SUCCEEDED(select->put_value(val)) )
							  err = false;
					  }
				  }
			  }
			  else if( !item.command.CompareNoCase(_T("submitForm")) )
			  {
				  done = IncrementStep();	// implicit wait with any navigations

				  // submit the given form
				  CComQIPtr<IHTMLFormElement> form = FindDomElementByAttribute( item.target );
				  if( form )
					  if( SUCCEEDED(form->submit()) )
						  err = false;
  				
				  if( err )
				  {
					  done = false;
					  Reset();
				  }
			  }
			  else if( !item.command.CompareNoCase(_T("click")) || !item.command.CompareNoCase(_T("clickAndWait")) )
			  {
				  if( !item.command.CompareNoCase(_T("clickAndWait")) )
					  done = IncrementStep();
          else
            IncrementStep();

				  // Click on the element
				  CComPtr<IHTMLElement> element = FindDomElementByAttribute( item.target );
				  if( element )
				  {
					  bool disabled = false;
  					
					  _bstr_t attrib = _T("disabled");
					  _variant_t varVal;
					  if( SUCCEEDED(element->getAttribute(attrib, 0, &varVal)) )
					  {
						  if( varVal.vt == VT_BOOL && varVal.boolVal == VARIANT_TRUE )
						  {
							  disabled = true;
							  OutputDebugString(_T("[Pagetest] - Element is disabled\n"));
						  }
					  }

					  if( !disabled && SUCCEEDED(element->click()) )
						  err = false;
				  }
  				
				  if( err )
				  {
					  done = false;
					  Reset();
				  }
			  }
			  else if( !item.command.CompareNoCase(_T("sleep")) )
			  {
				  long delay = _ttol(item.target);
				  if( delay < 1 )
					  delay = 1;
				  else if( delay > 60 )
					  delay = 60;
				  StartTimer(TIMER_SCRIPT, delay * 1000);
				  done = true;
				  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("loadFile")) )
			  {
				  if( LoadFile(item.target, item.value) )
					  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("loadVariables")) )
			  {
				  if( LoadVariables(item.target) )
					  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("fileDialog")) )
			  {
				  if( FileDialog(item.target, item.value) )
					  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("ignoreErrors")) )
			  {
				  err = false;
				  if( _ttol(item.target) )
					  script_ignoreErrors = true;
				  else
					  script_ignoreErrors = false;
			  }
			  else if( !item.command.CompareNoCase(_T("logData")) )
			  {
				  err = false;
				  if( _ttol(item.target) )
					  script_logData = true;
				  else
					  script_logData = false;
			  }
			  else if( !item.command.CompareNoCase(_T("logErrors")) )
			  {
				  err = false;
				  if( _ttol(item.target) )
					  script_logErrors = true;
				  else
					  script_logErrors = false;
			  }
			  else if( !item.command.CompareNoCase(_T("modifyUserAgent")) )
			  {
				  err = false;
				  if( _ttol(item.target) )
					  script_modifyUserAgent = true;
				  else
					  script_modifyUserAgent = false;
			  }
			  else if( !item.command.CompareNoCase(_T("minInterval")) )
			  {
				  err = false;
				  if( !MinInterval(item.target, _ttol(item.value) ) )
				  {
					  bool ended = false;
					  while( !ended && !script.IsEmpty() )
					  {
						  CScriptItem newItem = script.RemoveHead();
						  if( !newItem.command.CompareNoCase(_T("endInterval")) )
							  ended = true;
					  }
				  }
			  }
			  else if( !item.command.CompareNoCase(_T("endInterval")) )
			  {
				  err = false;
				  if( hIntervalMutex )
				  {
					  ReleaseMutex(hIntervalMutex);
					  CloseHandle(hIntervalMutex);
					  hIntervalMutex = NULL;
				  }
			  }
			  else if( !item.command.CompareNoCase(_T("sendKeyPress")) || !item.command.CompareNoCase(_T("sendKeyPressAndWait")))
				  SendKeyCommand(L"OnKeyPress", item, err, done);
			  else if( !item.command.CompareNoCase(_T("sendKeyDown")) || !item.command.CompareNoCase(_T("sendKeyDownAndWait")))
				  SendKeyCommand(L"OnKeyDown", item, err, done);
			  else if( !item.command.CompareNoCase(_T("sendKeyUp")) || !item.command.CompareNoCase(_T("sendKeyUpAndWait")))
				  SendKeyCommand(L"OnKeyUp", item, err, done);
			  else if( !item.command.CompareNoCase(_T("sendClick")) || !item.command.CompareNoCase(_T("sendClickAndWait")))
				  SendMouseCommand(L"OnClick", item, err, done);
			  else if( !item.command.CompareNoCase(_T("sendMouseDown")) || !item.command.CompareNoCase(_T("sendMouseDownAndWait")))
				  SendMouseCommand(L"OnMouseDown", item, err, done);
			  else if( !item.command.CompareNoCase(_T("sendMouseUp")) || !item.command.CompareNoCase(_T("sendMouseUpAndWait")))
				  SendMouseCommand(L"OnMouseUp", item, err, done);
			  else if( !item.command.CompareNoCase(_T("sendCommand")) || !item.command.CompareNoCase(_T("sendCommandAndWait")))
				  SendCommand(item, err, done);
			  else if( !item.command.CompareNoCase(_T("exec")) || !item.command.CompareNoCase(_T("execAndWait")) )
			  {
				  if( !item.command.CompareNoCase(_T("execAndWait")) )
					  done = IncrementStep();
          else
            IncrementStep();
  					
				  // replace all of the line feeds with spaces
				  item.target.Replace(_T("\r"), _T(" "));
				  item.target.Replace(_T("\n"), _T(" "));
				  ExecuteScript((LPCTSTR)item.target);
				  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("block")) )
			  {
				  blockRequests.RemoveAll();
				  CString block = item.target;
				  int pos = 0;
				  CString token = block.Tokenize(_T(" "), pos);
				  while( pos >= 0 )
				  {
					  token.Trim();
					  blockRequests.AddTail(token);
					  token = block.Tokenize(_T(" "), pos);
				  }
  				
				  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("basicAuth")) )
			  {
				  script_basicAuth.Empty();
				  if( item.target.GetLength() )
					  script_basicAuth = item.target;
				  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("setCookie")) )
			  {
				  if( InternetSetCookieEx(item.target.Trim(), NULL, item.value, INTERNET_COOKIE_EVALUATE_P3P | INTERNET_COOKIE_THIRD_PARTY,(DWORD_PTR)_T("CP=NOI CUR OUR NOR") ) )
					  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("setHeader")) )
			  {
          CFilteredHeader header(item.target.Trim(), item.value.Trim());
          headersSet.AddTail(header);
				  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("addHeader")) )
			  {
          CFilteredHeader header(item.target.Trim(), item.value.Trim());
          headersAdd.AddTail(header);
				  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("resetHeaders")) )
			  {
          headersAdd.RemoveAll();
          headersSet.RemoveAll();
				  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("setDNS")) )
			  {
				  CDNSEntry entry(item.target.Trim(), item.value.Trim());
				  if( entry.addr.S_un.S_addr )
				  {
					  dnsOverride.AddTail(entry);
					  err = false;
				  }
			  }
			  else if( !item.command.CompareNoCase(_T("setDnsName")) )
			  {
				  CDNSName entry(item.target.Trim(), item.value.Trim());
				  if( entry.name.GetLength() && entry.realName.GetLength() )
				  {
					  dnsNameOverride.AddTail(entry);
					  err = false;
				  }
			  }
			  else if( !item.command.CompareNoCase(_T("setUserAgent")) )
			  {
				  userAgent = item.target.Trim();
				  err = false;
			  }
			  else if( !item.command.CompareNoCase(_T("setDNSServers")) )
			  {
				  // comma-separated list of DNS servers
				  dnsServers.RemoveAll();
				  CString servers = item.target.Trim();
				  int pos = 0;
				  CString token = servers.Tokenize(_T(","), pos);
				  while( pos >= 0 )
				  {
					  CString server = token.Trim();
					  struct in_addr addr;
					  addr.S_un.S_addr = inet_addr(CT2A(server));
					  if( addr.S_un.S_addr )
						  dnsServers.Add(addr);
					  token = servers.Tokenize(_T(" "), pos);
				  }
				  err = false;
			  }
        else if(!item.command.CompareNoCase(_T("waitForJSDone")))
        {
          script_waitForJSDone = true;
          err = false;
        }
        else if(!item.command.CompareNoCase(_T("combineSteps")) || !item.command.CompareNoCase(_T("mergeSteps")))
        {
          script_combineSteps = _ttol(item.target);
          if( !script_combineSteps )
            script_combineSteps = -1; // default to combining ALL steps
          err = false;
        }
        else if(!item.command.CompareNoCase(_T("overrideHost")))
        {
          if( item.target.GetLength() && item.value.GetLength() )
          {
            bool duplicate = false;
            POSITION pos = hostOverride.GetHeadPosition();
            while (pos && !duplicate) {
              CHostOverride &existing = hostOverride.GetNext(pos);
              if (!existing.originalHost.CompareNoCase(item.target)) {
                duplicate = true;
              }
            }
            if (!duplicate) {
              CHostOverride host(item.target, item.value);
              hostOverride.AddTail(host);
            }
          }
          else
            hostOverride.RemoveAll();
          err = false;
        }
        else if(!item.command.CompareNoCase(_T("overrideHostUrl")))
        {
          if( item.target.GetLength() && item.value.GetLength() )
          {
            CHostOverride host(item.target, item.value);
            overrideHostUrls.AddTail(host);
          }
          else
            overrideHostUrls.RemoveAll();
          err = false;
        }
        else if(!item.command.CompareNoCase(_T("addCustomRule")))
        {
          int separator = item.target.Find(_T('='));
          if (separator > 0) 
          {
            CCustomRule newrule;
            newrule.name = item.target.Left(separator).Trim();
            newrule.mime = item.target.Mid(separator + 1).Trim();
            newrule.regex = item.value.Trim();
            customRules.AddTail(newrule);
          }
          err = false;
        }
        else if(!item.command.CompareNoCase(_T("expireCache")))
        {
          DWORD seconds = 0;
          if (item.target.GetLength())
            seconds = _tcstoul(item.target, NULL, 10);
          ExpireCache(seconds);
          err = false;
        }
       
  			
			  if( err && script_logErrors && !script_ignoreErrors )
			  {
				  script_error = true;
				  OutputDebugString(_T("[Pagetest] - Script error\n"));
			  }

			  if( err && !script_ignoreErrors && interactive )
			  {
				  CString buff;
				  buff.Format(_T("Script error - failed: '%s' '%s' '%s'"), 
					  (LPCTSTR)item.command, (LPCTSTR)item.target, (LPCTSTR)item.value);
				  MessageBox(NULL, buff, _T("AOL Pagetest"), MB_OK | MB_SYSTEMMODAL);
			  }
      }
		}
		
		if( err && !script_ignoreErrors )
		{
			errorCode = 88888;
			FlushResults();
			ScriptComplete();
		}
		else if( !done && script.IsEmpty() )
		{
			ScriptComplete();
		}
	}
}

/*-----------------------------------------------------------------------------
	Move the script step counter and generate an event name if we don't have one
-----------------------------------------------------------------------------*/
bool CScriptEngine::IncrementStep(bool waitForActivity)
{
  ATLTRACE(_T("[Pagetest] - CScriptEngine::IncrementStep()"));
  if( !active && (!script_combineSteps || !start) )
  {
	  scriptStep++;
	  if( newEventName.IsEmpty() )
		  script_eventName.Format(_T("Step%d"), scriptStep);
	  else
		  script_eventName = newEventName;

	  if( !waitForActivity )
	  {
      ATLTRACE(_T("[Pagetest] - CScriptEngine::IncrementStep() - Starting measurement"));
		  CString url(_T("Script Event"));
		  DoStartup(url);
		  StartMeasuring();
		  QueryPerfCounter(start);
		  firstByte = 0;
	  }
  }
  else
  {
    if( active )
    {
      ATLTRACE(_T("[Pagetest] - CScriptEngine::IncrementStep() - Already active"));
    }
    else if(script_combineSteps && start)
    {
      ATLTRACE(_T("[Pagetest] - CScriptEngine::IncrementStep() - Already started"));
    }
  }

	return true;
}

/*-----------------------------------------------------------------------------
	Replace any occurrences of our variable list within the provided string
	Primarily used for user name and password substitution
-----------------------------------------------------------------------------*/
void CScriptEngine::VarReplace(CString& value)
{
	POSITION pos = variables.GetHeadPosition();
	while(pos)
	{
		CScriptVariable var = variables.GetNext(pos);
		value.Replace(var.key, var.value);
	}
}

/*-----------------------------------------------------------------------------
	Loads a file into the provided variable
-----------------------------------------------------------------------------*/
bool CScriptEngine::LoadFile(CString file, CString variable)
{
	bool ret = false;
	
	// first remove any instances of that variable that already exist
	POSITION pos = variables.GetHeadPosition();
	while(pos)
	{
		POSITION oldPos = pos;
		CScriptVariable var = variables.GetNext(pos);
		if( var.key == variable )
			variables.RemoveAt(oldPos);
	}
	
	if( LocateFile(file) )
	{
		HANDLE hFile = CreateFile(file, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, 0, OPEN_EXISTING, 0, 0);
		if( hFile != INVALID_HANDLE_VALUE )
		{
			DWORD len = GetFileSize(hFile, 0);
			if( len )
			{
				char * buff = (char *)malloc(len + 1);
				if( buff )
				{
					DWORD bytes;
					if( ReadFile(hFile, buff, len, &bytes, 0) && len == bytes )
					{
						buff[len]=0;
						CScriptVariable var;
						var.key = variable;
						var.value = buff;
						
						variables.AddTail(var);
						ret = true;
					}
					
					free(buff);
				}
			}
			
			CloseHandle(hFile);
		}
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
	Loads the provided variables file and populates the variable table
-----------------------------------------------------------------------------*/
bool CScriptEngine::LoadVariables(CString file)
{
	bool ret = false;
	
	if( LocateFile(file) )
	{
		HANDLE hFile = CreateFile(file, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, 0, OPEN_EXISTING, 0, 0);
		if( hFile != INVALID_HANDLE_VALUE )
		{
			DWORD len = GetFileSize(hFile, 0);
			if( len )
			{
				char * buff = (char *)malloc(len + 1);
				if( buff )
				{
					DWORD bytes;
					if( ReadFile(hFile, buff, len, &bytes, 0) && len == bytes )
					{
						buff[len]=0;
						
						// parse the file
						CString szFile = CA2T(buff);
						int tokenPos = 0;
						CString line = szFile.Tokenize(_T("\r\n"), tokenPos);
						while( tokenPos >= 0 )
						{
							line.Trim();
							int index = line.Find(_T('='));
							if( index > -1 )
							{
								CString variable = line.Left(index);
								CString value = line.Right(line.GetLength() - (index + 1));
								
								variable.Trim();
								value.Trim();
								
								if( !variable.IsEmpty() && !value.IsEmpty() )
								{
									// remove any instances of that variable that already exist
									POSITION pos = variables.GetHeadPosition();
									while(pos)
									{
										POSITION oldPos = pos;
										CScriptVariable var = variables.GetNext(pos);
										if( var.key == variable )
											variables.RemoveAt(oldPos);
									}

									// add it to the list
									CScriptVariable var;
									var.key = variable;
									var.value = value;
									variables.AddTail(var);
									
									ret = true;
								}
							}
							
							// on to the next line
							line = szFile.Tokenize(_T("\r\n"), tokenPos);
						}
					}
					
					free(buff);
				}
			}
			
			CloseHandle(hFile);
		}
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CALLBACK WndEnumProc(HWND hwnd, LPARAM lParam )
{
	BOOL ret = FALSE;
	
	if( lParam )
		ret = ((CScriptEngine *)lParam)->WndEnumProc(hwnd);
		
	return ret;
}

/*-----------------------------------------------------------------------------
	Look for the open file dialog box
-----------------------------------------------------------------------------*/
BOOL CScriptEngine::WndEnumProc(HWND hwnd)
{
	BOOL ret = TRUE;
	
	DWORD proc = 0;
	GetWindowThreadProcessId(hwnd, &proc);
	if( proc == GetCurrentProcessId() )
	{
		TCHAR title[256];
		if( GetWindowText(hwnd, title, _countof(title)) )
		{
			if( !_tcsncicmp(title, _T("Choose File"), 11) )
			{
				hDlg = hwnd;
				ret = FALSE;
			}
		}
	}
	
	return ret;
}

unsigned __stdcall ScriptThreadProc( void* arg )
{
	if( arg )
		((CScriptEngine*)arg)->ThreadProc();
		
	return 0;
}

/*-----------------------------------------------------------------------------
	Wait for the dialog to show up and then fill in the file name
-----------------------------------------------------------------------------*/
void CScriptEngine::ThreadProc(void)
{
	// potential for wrap-around but should be ok under normal use
	DWORD end = GetTickCount() + 30000;
	bool done = false;
	
	do
	{
		Sleep(100);

		// file dialog
		hDlg = NULL;
		EnumWindows(::WndEnumProc, (LPARAM)this);
		if( hDlg )
		{
			// find the "File Name" label
			HWND hFileName = FindWindowEx(hDlg, NULL, NULL, _T("File &name:") );

			// now find the combo box
			HWND hCombo32 = FindWindowEx(hDlg, hFileName, _T("ComboBoxEx32"), NULL);
			if( hCombo32 )
			{
				HWND hCombo = FindWindowEx(hCombo32, NULL, _T("ComboBox"), NULL);
				if( hCombo )
				{
					HWND hEdit = FindWindowEx(hCombo, NULL, _T("Edit"), NULL);
					if( hEdit )
					{
						::SendMessage(hEdit, WM_SETFOCUS, 0, 0);
						::SendMessage(hEdit, WM_SETTEXT, 0, (LPARAM)(LPCTSTR)fileToLoad);
						::SendMessage(hEdit, WM_KILLFOCUS, 0, 0);
						
						// now press the open button
						HWND hOpen = FindWindowEx(hDlg, NULL, NULL, _T("&Open"));
						::SendMessage( hDlg, WM_COMMAND, 1, (LPARAM)hOpen);
						
						fileOk = true;
						done = true;
					}
				}
			}
		}
	}while(!done && GetTickCount() < end);
}

/*-----------------------------------------------------------------------------
	Enter the given file into the file dialog
-----------------------------------------------------------------------------*/
bool CScriptEngine::FileDialog(CString attribute, CString file)
{
	bool ret = false;
	
	// first, locate the file
	if( LocateFile(file) )
	{
		fileToLoad = file;
		
		// locate the element
		CComPtr<IHTMLElement> element = FindDomElementByAttribute( attribute );
		if( element )
		{
			// spawn a thread to fill in the file while we click on the button (will block the main thread)
			unsigned int addr = 0;
			fileOk = false;
			HANDLE hThread = (HANDLE)_beginthreadex( 0, 0, ::ScriptThreadProc, this, 0, &addr);
			if( hThread )
			{
				if( SUCCEEDED(element->click()) )
					WaitForSingleObject(hThread, INFINITE);

				CloseHandle(hThread);
				
				ret = fileOk;
			}
		}
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
	Find a file and update the string to be the full path for the file
-----------------------------------------------------------------------------*/
bool CScriptEngine::LocateFile(CString& file)
{
	bool ret = false;

	// try relative to the script
	if( !scriptFile.IsEmpty() )
	{
		TCHAR szFile[MAX_PATH];
		lstrcpy( szFile, scriptFile );
		*PathFindFileName(szFile) = 0;
		CString filePath = szFile;
		filePath += file;
		HANDLE hFile = CreateFile(filePath, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, 0, OPEN_EXISTING, 0, 0);
		if( hFile != INVALID_HANDLE_VALUE )
		{
			file = filePath;
			ret = true;
			CloseHandle(hFile);
		}
	}
		
	// now try opening the file relative to where we are running from
	if( !ret )
	{
		TCHAR szFile[MAX_PATH];
		if( GetModuleFileName((HMODULE)_AtlBaseModule.GetModuleInstance(), szFile, _countof(szFile)) )
		{
			*PathFindFileName(szFile) = 0;
			CString filePath = szFile;
			filePath += file;
			
			HANDLE hFile = CreateFile(filePath, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, 0, OPEN_EXISTING, 0, 0);
			if( hFile != INVALID_HANDLE_VALUE )
			{
				file = filePath;
				ret = true;
				CloseHandle(hFile);
			}
		}
	}
	
	// try an absolute path if it wasn't relative
	if( !ret )
	{
		HANDLE hFile = CreateFile(file, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, 0, OPEN_EXISTING, 0, 0);
		if( hFile != INVALID_HANDLE_VALUE )
		{
			ret = true;
			CloseHandle(hFile);
		}
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
	Make sure we don't run a given script multiple times simultaneously
	or more frequently than every X minutes on the local machine
	
	Returns true if it is ok to continue running
-----------------------------------------------------------------------------*/
bool CScriptEngine::MinInterval(CString key, long minutes)
{
	bool ok = false;

	// use a NULL security descriptor
	SECURITY_ATTRIBUTES MutexAttributes;
	ZeroMemory( &MutexAttributes, sizeof(MutexAttributes) );
	MutexAttributes.nLength = sizeof( MutexAttributes );
	MutexAttributes.bInheritHandle = FALSE; // object uninheritable

	SECURITY_DESCRIPTOR SD;
	if( InitializeSecurityDescriptor( &SD, SECURITY_DESCRIPTOR_REVISION ) )
	{
		if( SetSecurityDescriptorDacl( &SD, TRUE, (PACL)NULL, FALSE ) )
		{
			MutexAttributes.lpSecurityDescriptor = &SD;

			hIntervalMutex = CreateMutex(&MutexAttributes, FALSE, CString(_T("Global\\")) + key);
			if( hIntervalMutex )
			{
				if( WaitForSingleObject(hIntervalMutex, 300000) == WAIT_OBJECT_0 )
				{
					// see if there is a time constraint at all, otherwise it's just used as a mutex
					if( minutes )
					{
						// now that we're holding the mutex, check the stored time against the current time
						// to see if enough time has elapsed
						CRegKey reg;
						if( SUCCEEDED(reg.Create(HKEY_LOCAL_MACHINE, _T("SOFTWARE\\AOL\\Pagetest\\Interval")) ) )
						{
							__time64_t lastRun = 0;
							__time64_t now;
							_time64(&now);
							ULONG len = sizeof(lastRun);
							
							if( minutes && SUCCEEDED(reg.QueryBinaryValue(key, &lastRun, &len)) )
							{
								if( lastRun < now )
								{
									long elapsed = (long)((now - lastRun) / (__time64_t)60);
									if( elapsed >= minutes )
										ok = true;
								}
							}
							else
								ok = true;
								
							// store the current time
							if( ok )
								reg.SetBinaryValue(key, &now, sizeof(now));
						}
					}
					else
						ok = true;
				}

				if( !ok && hIntervalMutex )
				{
					ReleaseMutex(hIntervalMutex);
					CloseHandle(hIntervalMutex);
					hIntervalMutex = NULL;
				}
			}
		}
	}

	return ok;
}

/*-----------------------------------------------------------------------------
	Send a javascript key command to an element
-----------------------------------------------------------------------------*/
void CScriptEngine::SendKeyCommand(const OLECHAR * command, CScriptItem & item, bool & err, bool & done)
{
	bool ctrl = false;
	bool shift = false;
	bool alt = false;
	char key = 0;
	CString val = item.value;
	val.MakeUpper();
	if( val.GetLength() == 1 )
		key = (char)val.GetAt(0);
	else
	{
		int tokenPos = 0;
		CString k = val.Tokenize(_T("+"), tokenPos);
		while( tokenPos >= 0 )
		{
			if( k.GetLength() == 1 )
				key = (char)k.GetAt(0);
			else if( k == "CTRL" )
				ctrl = true;
			else if( k == "SHIFT" )
				shift = true;
			else if( k == "ALT" )
				alt = true;
			else if( k == "ENTER" )
				key = 13;
			else if( k == "DEL" || k == "DELETE" )
				key = 46;
			else if( k == "BACKSPACE" )
				key = 8;
			else if( k == "TAB" )
				key = 9;
			else if( k == "ESCAPE" )
				key = 27;
			else if( k == "PAGEUP" )
				key = 33;
			else if( k == "PAGEDOWN" )
				key = 34;
			
			k = val.Tokenize(_T("+"), tokenPos);
		}
	}
	
	if( key )
	{
		// get the element we are going to send the event to
		CComQIPtr<IHTMLElement3> element;
		CComPtr<IHTMLEventObj> eventObj;
		
		// Work with the top-level browser window
		CBrowserTracker tracker = browsers.GetTail();
		if( tracker.browser )
		{
			CComPtr<IDispatch> disp;
			if( SUCCEEDED(tracker.browser->get_Document(&disp)) )
			{
				// see if we're targeting a specific element or just the default
				if( !item.target.CompareNoCase(_T("default")) )
				{
					CComQIPtr<IHTMLDocument2> doc = disp;
					if( doc )
					{
						// get the element
						CComPtr<IHTMLElement> el;
						if( SUCCEEDED(doc->get_activeElement(&el)) )
							element = el;
					}
				}
				else
					element = FindDomElementByAttribute( item.target );
				
				// create the event
				CComQIPtr<IHTMLDocument4> doc4 = disp;
				if( doc4 )
				{
					if( SUCCEEDED(doc4->createEventObject(NULL, &eventObj)) )
					{
						eventObj->put_keyCode(key);
						
						CComQIPtr<IHTMLEventObj2> ev = eventObj;
						if( ctrl && ev )
							ev->put_ctrlKey(VARIANT_TRUE);
						if( alt && ev )
							ev->put_altKey(VARIANT_TRUE);
						if( shift && ev )
							ev->put_shiftKey(VARIANT_TRUE);
					}
				}
			}
		}
		
		// fire the actual event
		if( element && eventObj )
		{
			CString cmd = item.command;
			cmd.MakeLower();
			if( cmd.Find(_T("andwait")) >= 0 )
				done = IncrementStep();
      else
        IncrementStep();

			VARIANT eventObject;
			VariantInit(&eventObject);
			V_VT(&eventObject) = VT_DISPATCH;
			V_DISPATCH(&eventObject) = eventObj;
			VARIANT_BOOL canceled = VARIANT_FALSE;

			BSTR cmdText = SysAllocString(command);
			if( cmdText )
			{
				if( SUCCEEDED(element->fireEvent(cmdText, &eventObject, &canceled)) )
					err = false;
				
				SysFreeString(cmdText);
			}
		}
	}
}

/*-----------------------------------------------------------------------------
	Wrap the event firing in an exception handler
-----------------------------------------------------------------------------*/
bool FireEvent(CComQIPtr<IHTMLElement3> &element, BSTR &cmdText, VARIANT &eventObject)
{
	bool ret = false;

	__try
	{
    	VARIANT_BOOL canceled = VARIANT_FALSE;
		if( SUCCEEDED(element->fireEvent(cmdText, &eventObject, &canceled)) )
			ret = true;
	}__except(1){}
	
	return ret;
}

/*-----------------------------------------------------------------------------
	Send a javascript mouse command to an element 
	(better than click - allows for event bubbling)
-----------------------------------------------------------------------------*/
void CScriptEngine::SendMouseCommand(const OLECHAR * command, CScriptItem & item, bool & err, bool & done)
{
	// get the element we are going to send the event to
	CComQIPtr<IHTMLElement3> element;
	CComPtr<IHTMLEventObj> eventObj;
	
	// Work with the top-level browser window
	CBrowserTracker tracker = browsers.GetTail();
	if( tracker.browser )
	{
		CComPtr<IDispatch> disp;
		if( SUCCEEDED(tracker.browser->get_Document(&disp)) )
		{
			// see if we're targeting a specific element or just the default
			if( !item.target.CompareNoCase(_T("default")) )
			{
				CComQIPtr<IHTMLDocument2> doc = disp;
				if( doc )
				{
					// get the element
					CComPtr<IHTMLElement> el;
					if( SUCCEEDED(doc->get_activeElement(&el)) )
						element = el;
				}
			}
			else
				element = FindDomElementByAttribute( item.target );
			
			// create the event
			CComQIPtr<IHTMLDocument4> doc4 = disp;
			if( doc4 )
			{
				if( SUCCEEDED(doc4->createEventObject(NULL, &eventObj)) )
				{
					CComQIPtr<IHTMLEventObj2> ev = eventObj;
					if( ev )
					{
						// give it fake coordinates (for now)
						ev->put_clientX(100);
						ev->put_clientY(100);
					}
				}
			}
		}
	}
	
	// fire the actual event
	if( element && eventObj )
	{
		CString cmd = item.command;
		cmd.MakeLower();
		if( cmd.Find(_T("andwait")) >= 0 )
			done = IncrementStep();
    else
      IncrementStep();

		VARIANT eventObject;
		VariantInit(&eventObject);
		V_VT(&eventObject) = VT_DISPATCH;
		V_DISPATCH(&eventObject) = eventObj;
		
		BSTR cmdText = SysAllocString(command);
		if( cmdText )
		{
			if( FireEvent(element, cmdText, eventObject) )
				err = false;
				
			SysFreeString(cmdText);
		}
	}
}

/*-----------------------------------------------------------------------------
	Fire an arbitrary event
-----------------------------------------------------------------------------*/
void CScriptEngine::SendCommand(CScriptItem & item, bool & err, bool & done)
{
	if( item.value.GetLength() )
	{
		// get the element we are going to send the event to
		CComQIPtr<IHTMLElement3> element;
		CComPtr<IHTMLEventObj> eventObj;
		
		// Work with the top-level browser window
		CBrowserTracker tracker = browsers.GetTail();
		if( tracker.browser )
		{
			CComPtr<IDispatch> disp;
			if( SUCCEEDED(tracker.browser->get_Document(&disp)) )
			{
				// see if we're targeting a specific element or just the default
				if( !item.target.CompareNoCase(_T("default")) )
				{
					CComQIPtr<IHTMLDocument2> doc = disp;
					if( doc )
					{
						// get the element
						CComPtr<IHTMLElement> el;
						if( SUCCEEDED(doc->get_activeElement(&el)) )
							element = el;
					}
				}
				else
					element = FindDomElementByAttribute( item.target );
				
				// create the event
				CComQIPtr<IHTMLDocument4> doc4 = disp;
				if( doc4 )
					doc4->createEventObject(NULL, &eventObj);
			}
		}
		
		// fire the actual event
		if( element && eventObj )
		{
			CString cmd = item.command;
			cmd.MakeLower();
			if( cmd.Find(_T("andwait")) >= 0 )
				done = IncrementStep();
      else
        IncrementStep();

			VARIANT eventObject;
			VariantInit(&eventObject);
			V_VT(&eventObject) = VT_DISPATCH;
			V_DISPATCH(&eventObject) = eventObj;
			
			BSTR cmdText = SysAllocString(item.value);
			if( cmdText )
			{
				if( FireEvent(element, cmdText, eventObject) )
					err = false;
					
				SysFreeString(cmdText);
			}
		}
	}
}

/*-----------------------------------------------------------------------------
	Execute arbitrary javascript
-----------------------------------------------------------------------------*/
bool CScriptEngine::ExecuteScript(_bstr_t script)
{
	bool ret = false;
	
	// Work with the top-level browser window
	CBrowserTracker tracker = browsers.GetTail();
	if( tracker.browser )
	{
		CComPtr<IDispatch> disp;
		if( SUCCEEDED(tracker.browser->get_Document(&disp)) )
		{
			CComQIPtr<IHTMLDocument2> doc = disp;
			if( doc )
			{
				// get the parent window
				CComPtr<IHTMLWindow2> window;
				if( SUCCEEDED(doc->get_parentWindow(&window)) )
				{
					VARIANT var;
					VariantInit(&var);
					BSTR lang = SysAllocString(L"Javascript");
					window->execScript(script, lang, &var);
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
bool CScriptEngine::InvokeScript(LPOLESTR function, _variant_t &result) {
  bool ret = false;
	// Work with the top-level browser window
	CBrowserTracker tracker = browsers.GetTail();
	if( tracker.browser ) {
		CComPtr<IDispatch> disp;
		if( SUCCEEDED(tracker.browser->get_Document(&disp)) ) {
			CComQIPtr<IHTMLDocument> doc = disp;
			if( doc ) {
        CComPtr<IDispatch> script;
        if (SUCCEEDED(doc->get_Script(&script)) && script) {
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
	See if the specified condition is a match
-----------------------------------------------------------------------------*/
bool CScriptEngine::ConditionMatches(CString condition, CString value) {
  bool match = false;

  if (!condition.CompareNoCase(_T("run"))) {
    if (currentRun == _ttoi(value)) {
      match = true;
    }
  } else if (!condition.CompareNoCase(_T("cached"))) {
    if (cached == _ttoi(value)) {
      match = true;
    }
  }

  if (match) {
    ATLTRACE(_T("[pagetest] - Condition %s = %s MATCHED (current run = %d, cached = %d)"), (LPCTSTR)condition, (LPCTSTR)value, currentRun, cached);
  } else {
    ATLTRACE(_T("[pagetest] - Condition %s = %s Did NOT Match (current run = %d, cached = %d)"), (LPCTSTR)condition, (LPCTSTR)value, currentRun, cached);
  }

  return match;
}

/*-----------------------------------------------------------------------------
	Handle and script items that are global (at load time)
-----------------------------------------------------------------------------*/
bool CScriptEngine::PreProcessScriptItem(CScriptItem &item) {
  bool keep = false;

  if (!item.command.CompareNoCase(_T("setbrowsersize")) ||
      !item.command.CompareNoCase(_T("setviewportsize"))) {
    DWORD width = _ttol(item.target);
    DWORD height = _ttol(item.value);
    if (!item.command.CompareNoCase(_T("setviewportsize")) && 
        hMainWindow && hBrowserWnd && IsWindow(hMainWindow) && IsWindow(hBrowserWnd)) {
      RECT browser, viewport;
      if( GetWindowRect(hMainWindow, &browser) &&
          GetWindowRect(hBrowserWnd, &viewport)) {
          int margin_x = abs(browser.right - browser.left) - abs(viewport.right - viewport.left);
          int margin_y = abs(browser.bottom - browser.top) - abs(viewport.bottom - viewport.top);
          if (margin_x > 0) {
            width += margin_x;
          }
          if (margin_y > 0) {
            height += margin_y;
          }
      }
    }
    if (width > 50 && height > 50 && width < 2500 && height < 2500 && dlg) {
      ResizeWindow(width, height);
    }
  } else {
    keep = true;
  }

  return keep;
}

/*-----------------------------------------------------------------------------
	Expire any items in the cache that will expire within X seconds.
-----------------------------------------------------------------------------*/
void CScriptEngine::ExpireCache(DWORD seconds) {
  HANDLE hEntry;
  DWORD len, entry_size = 0;
  GROUPID id;
  INTERNET_CACHE_ENTRY_INFO * info = NULL;
  HANDLE hGroup = FindFirstUrlCacheGroup(0, CACHEGROUP_SEARCH_ALL, 0, 0, &id, 0);
  if (hGroup) {
    do {
      len = entry_size;
      hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, id, info, &len, NULL, NULL, NULL);
      if (!hEntry && GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
        entry_size = len;
        info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
        if (info)
          hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, id, info, &len, NULL, NULL, NULL);
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
              if (info && !FindNextUrlCacheEntryEx(hEntry, info, &len, NULL, NULL, NULL))
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
  hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, 0, info, &len, NULL, NULL, NULL);
  if (!hEntry && GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
    entry_size = len;
    info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
    if (info)
      hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, 0, info, &len, NULL, NULL, NULL);
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
          if (info && !FindNextUrlCacheEntryEx(hEntry, info, &len, NULL, NULL, NULL))
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
void CScriptEngine::ExpireCacheEntry(INTERNET_CACHE_ENTRY_INFO * info, DWORD seconds) {
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
        // just set the expiration as the last accessed time - it's guaranteed to be in the past
        info->ExpireTime.dwHighDateTime = info->LastAccessTime.dwHighDateTime;
        info->ExpireTime.dwLowDateTime = info->LastAccessTime.dwLowDateTime;
        SetUrlCacheEntryInfo(info->lpszSourceUrlName, info, CACHE_ENTRY_EXPTIME_FC);
      }
    }
  }
}
