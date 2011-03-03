#pragma once

// Utility routines shared by all of the code

bool LaunchProcess(CString command_line, HANDLE * process_handle = NULL);
void DeleteDirectory( LPCTSTR directory, bool remove = true );
