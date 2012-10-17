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

// Pagetest.cpp : Implementation of DLL Exports.

#include "stdafx.h"
#include "resource.h"

// The module attribute causes DllMain, DllRegisterServer and DllUnregisterServer to be automatically implemented for you
[ module(dll, uuid = "{BCB8D697-44D8-4FFD-B922-7FAB2D14D054}", 
		 name = "Pagetest", 
		 helpstring = "Pagetest 1.0 Type Library",
		 resource_name = "IDR_PAGETEST") ]
class CPagetestModule
{
public:
// Override CAtlDllModuleT members
	BOOL WINAPI DllMain(DWORD dwReason, LPVOID lpReserved);
	HRESULT DllRegisterServer(BOOL bRegTypeLib = TRUE);
	HRESULT DllUnregisterServer(BOOL bUnRegTypeLib = TRUE);
};
		 
int CRTReportHook( int reportType, char *message, int *returnValue )
{
	if( message && *message != '[' )
		DebugBreak();
	return FALSE;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL WINAPI CPagetestModule::DllMain(DWORD dwReason, LPVOID lpReserved)
{
	BOOL ret = TRUE;
	
	if (dwReason == DLL_PROCESS_ATTACH)
	{
		// Don't attach to Windows Explorer or if the shift key is down
		TCHAR pszLoader[MAX_PATH];
		GetModuleFileName(NULL, pszLoader, MAX_PATH);
		if( !lstrcmpi(PathFindFileName(pszLoader), _T("explorer.exe")) || (GetKeyState(VK_SHIFT) & 0x8000) )
			ret = FALSE;
//		else
//		{
//			_CrtSetReportHook( CRTReportHook );
//		}
	}
	else if (dwReason == DLL_PROCESS_DETACH)
	{
		ATLTRACE(_T("[Pagetest] - DLL_PROCESS_DETACH\n"));
	}
	
	if( ret )
		ret = __super::DllMain(dwReason, lpReserved);
		
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HRESULT CPagetestModule::DllRegisterServer(BOOL bRegTypeLib)
{
	HRESULT hr = __super::DllRegisterServer(bRegTypeLib);
	if (SUCCEEDED(hr))
		hr = __super::UpdateRegistryFromResourceS(IDR_PAGETEST, TRUE);
	return hr;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HRESULT CPagetestModule::DllUnregisterServer(BOOL bUnRegTypeLib)
{
	HRESULT hr = __super::DllUnregisterServer(bUnRegTypeLib);
	if (SUCCEEDED(hr))
		hr = __super::UpdateRegistryFromResourceS(IDR_PAGETEST, FALSE);
	return hr;
}
