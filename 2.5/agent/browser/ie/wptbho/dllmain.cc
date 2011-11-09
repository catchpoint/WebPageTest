// dllmain.cpp : Implementation of DllMain.

#include "stdafx.h"
#include "resource.h"
#include "wptbho_i.h"
#include "dllmain.h"
#include "xdlldata.h"

CwptbhoModule _AtlModule;
HINSTANCE dll_hinstance = NULL;

// DLL Entry Point
extern "C" BOOL WINAPI DllMain(HINSTANCE hInstance, DWORD dwReason, LPVOID lpReserved)
{
	// Don't attach to Windows Explorer
	if (dwReason == DLL_PROCESS_ATTACH)	{
		TCHAR pszLoader[MAX_PATH];
		GetModuleFileName(NULL, pszLoader, MAX_PATH);
		if (!lstrcmpi(PathFindFileName(pszLoader), _T("explorer.exe")))
			return FALSE;
	}
#ifdef _MERGE_PROXYSTUB
	if (!PrxDllMain(hInstance, dwReason, lpReserved))
		return FALSE;
#endif
	dll_hinstance = hInstance;
	return _AtlModule.DllMain(dwReason, lpReserved); 
}

// Used to determine whether the DLL can be unloaded by OLE.
STDAPI DllCanUnloadNow(void)
{
	#ifdef _MERGE_PROXYSTUB
	HRESULT hr = PrxDllCanUnloadNow();
	if (hr != S_OK)
		return hr;
#endif
			return _AtlModule.DllCanUnloadNow();
	}

// Returns a class factory to create an object of the requested type.
STDAPI DllGetClassObject(REFCLSID rclsid, REFIID riid, LPVOID* ppv)
{
	#ifdef _MERGE_PROXYSTUB
	if (PrxDllGetClassObject(rclsid, riid, ppv) == S_OK)
		return S_OK;
#endif
		return _AtlModule.DllGetClassObject(rclsid, riid, ppv);
}

// DllRegisterServer - Adds entries to the system registry.
STDAPI DllRegisterServer(void)
{
	// registers object, typelib and all interfaces in typelib
	HRESULT hr = _AtlModule.DllRegisterServer();
	#ifdef _MERGE_PROXYSTUB
	if (FAILED(hr))
		return hr;
	hr = PrxDllRegisterServer();
#endif
		return hr;
}

// DllUnregisterServer - Removes entries from the system registry.
STDAPI DllUnregisterServer(void)
{
	HRESULT hr = _AtlModule.DllUnregisterServer();
	#ifdef _MERGE_PROXYSTUB
	if (FAILED(hr))
		return hr;
	hr = PrxDllRegisterServer();
	if (FAILED(hr))
		return hr;
	hr = PrxDllUnregisterServer();
#endif
		return hr;
}

// DllInstall - Adds/Removes entries to the system registry per user per machine.
STDAPI DllInstall(BOOL bInstall, LPCWSTR pszCmdLine)
{
	HRESULT hr = E_FAIL;
	static const wchar_t szUserSwitch[] = L"user";

	if (pszCmdLine != NULL)
	{
		if (_wcsnicmp(pszCmdLine, szUserSwitch, _countof(szUserSwitch)) == 0)
		{
			ATL::AtlSetPerUserRegistration(true);
		}
	}

	if (bInstall)
	{	
		hr = DllRegisterServer();
		if (FAILED(hr))
		{
			DllUnregisterServer();
		}
	}
	else
	{
		hr = DllUnregisterServer();
	}

	return hr;
}


