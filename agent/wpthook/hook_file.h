#pragma once

class TestState;
class TrackSockets;

typedef HANDLE (__stdcall * PFN_CREATEFILEW)(LPCWSTR lpFileName,
    DWORD dwDesiredAccess, DWORD dwShareMode,
    LPSECURITY_ATTRIBUTES lpSecurityAttributes, DWORD dwCreationDisposition,
    DWORD dwFlagsAndAttributes, HANDLE hTemplateFile);

typedef BOOL (__stdcall * PFN_WRITEFILE)(HANDLE hFile, LPCVOID lpBuffer,
      DWORD nNumberOfBytesToWrite, LPDWORD lpNumberOfBytesWritten,
      LPOVERLAPPED lpOverlapped);

class FileHook {
public:
  FileHook(TrackSockets& sockets, TestState& test_state);
  ~FileHook();
  void Init();
  HANDLE CreateFileW(LPCWSTR lpFileName, DWORD dwDesiredAccess,
      DWORD dwShareMode, LPSECURITY_ATTRIBUTES lpSecurityAttributes,
      DWORD dwCreationDisposition, DWORD dwFlagsAndAttributes,
      HANDLE hTemplateFile);
  BOOL WriteFile(HANDLE hFile, LPCVOID lpBuffer, DWORD nNumberOfBytesToWrite,
      LPDWORD lpNumberOfBytesWritten, LPOVERLAPPED lpOverlapped);

private:
  TestState& _test_state;
  TrackSockets& _sockets;
  CStringW download_path_;

  bool IsDownload(LPCWSTR lpFileName);

  // Original Functions
  PFN_CREATEFILEW CreateFileW_;
  PFN_WRITEFILE WriteFile_;
};

