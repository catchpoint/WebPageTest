#pragma once

extern "C" {
__declspec( dllimport ) void WINAPI InstallHook(DWORD thread_id);
__declspec( dllimport ) void WINAPI 
                                SetResultsFileBase(const WCHAR * file_base);
}
