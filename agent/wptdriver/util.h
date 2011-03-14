#pragma once

// Utility routines shared by all of the code

bool LaunchProcess(CString command_line, HANDLE * process_handle = NULL);
void DeleteDirectory(LPCTSTR directory, bool remove = true);
bool FindBrowserWindow(DWORD process_id, HWND& frame_window, 
                          HWND& document_window);
