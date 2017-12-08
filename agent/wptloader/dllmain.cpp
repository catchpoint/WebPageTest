// dllmain.cpp : Defines the entry point for the DLL application.
#include <SDKDDKVer.h>

#define WIN32_LEAN_AND_MEAN             // Exclude rarely-used stuff from Windows headers
// Windows Header Files:
#include <windows.h>
#include <TCHAR.H>
#include <Lmcons.h>

HMODULE module_handle = NULL;

static DWORD WINAPI LoaderThreadProc(void* arg) {
  // Try loading the hook dll.  It will choose to load or not depending on the
  // process.  This lets us update the hook and not worry about not being able
  // to update the appinit dll but still load the appinit dll into all
  // processes.
  TCHAR path[MAX_PATH];
  if (GetModuleFileName(module_handle, path, MAX_PATH)) {
    #ifdef _WIN64
    TCHAR * dll = _tcsstr(path, _T("wptldr64"));
    if (dll) {
      lstrcpy(dll, _T("wpthook64.dll"));
      LoadLibrary(path);
    }
    #else
    TCHAR * dll = _tcsstr(path, _T("wptload"));
    if (dll) {
      lstrcpy(dll, _T("wpthook.dll"));
      LoadLibrary(path);
    }
    #endif
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
      const DWORD len = 100;
      TCHAR env[len];
      memset(env, 0, sizeof(env));
      // Only install the hook if the environment for our current process
      // includes the hook flag.
      if (GetEnvironmentVariable(_T("WPT_HOOK"), env, len)) {
        module_handle = hModule;
        // Spawn a background thread to try loading the hookdll
        HANDLE thread_handle = CreateThread(NULL, 0, ::LoaderThreadProc, 0, 0,
                                            NULL);
        if (thread_handle)
          CloseHandle(thread_handle);
      }
    } break;
	case DLL_THREAD_ATTACH:
	case DLL_THREAD_DETACH:
	case DLL_PROCESS_DETACH:
		break;
	}
	return TRUE;
}
