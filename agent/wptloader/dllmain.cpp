// dllmain.cpp : Defines the entry point for the DLL application.
#include <SDKDDKVer.h>

#define WIN32_LEAN_AND_MEAN             // Exclude rarely-used stuff from Windows headers
// Windows Header Files:
#include <windows.h>
#include <TCHAR.H>

HMODULE module_handle = NULL;

static DWORD WINAPI LoaderThreadProc(void* arg) {
  // Try loading the hook dll.  It will choose to load or not depending on the
  // process.  This lets us update the hook and not worry about not being able
  // to update the appinit dll but still load the appinit dll into all
  // processes.
  TCHAR path[MAX_PATH];
  if (GetModuleFileName(module_handle, path, MAX_PATH)) {
    TCHAR * dll = _tcsstr(path, _T("wptload"));
    if (dll) {
      #ifdef _WIN64
      lstrcpy(dll, _T("wpthook64.dll"));
      #else
      lstrcpy(dll, _T("wpthook.dll"));
      #endif
      LoadLibrary(path);
    }
  }
  return 0;
}

BOOL APIENTRY DllMain( HMODULE hModule,
                       DWORD  ul_reason_for_call,
                       LPVOID lpReserved
					 )
{
	switch (ul_reason_for_call)
	{
	case DLL_PROCESS_ATTACH: {
      #ifdef _WIN64
      /*
      TCHAR path[MAX_PATH];
      OutputDebugStringA("wptload - 64bit attached");
      if (GetModuleFileName(NULL, path, MAX_PATH)) {
        OutputDebugString(path);
      }
      */
      #else
      module_handle = hModule;
      // Spawn a background thread to try loading the hookdll
      HANDLE thread_handle = CreateThread(NULL, 0, ::LoaderThreadProc, 0, 0,
                                          NULL);
      if (thread_handle)
        CloseHandle(thread_handle);
      #endif
    } break;
	case DLL_THREAD_ATTACH:
	case DLL_THREAD_DETACH:
	case DLL_PROCESS_DETACH:
		break;
	}
	return TRUE;
}
