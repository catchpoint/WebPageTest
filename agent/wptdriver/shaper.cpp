/******************************************************************************
Copyright (c) 2016, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the <ORGANIZATION> nor the names of its contributors 
    may be used to endorse or promote products derived from this software 
    without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE 
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
******************************************************************************/
#include "stdafx.h"
#include "shaper.h"
#include "shaper/interface.h"
#include <VersionHelpers.h>

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Shaper::Shaper():started_(false) {
  if (IsWindows8Point1OrGreater()) {
    Install();
    StartService();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Shaper::~Shaper() {
  if (IsWindows8Point1OrGreater()) {
    StopService();
    Uninstall();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Shaper::IsAvailable() {
  return started_;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Shaper::Enable(unsigned long bwIn,
                    unsigned long bwOut,
                    unsigned long latencyIn,
                    unsigned long latencyOut,
                    double plr) {
  bool enabled = false;
  ATLTRACE(_T("[wptdriver] - Enabling shaping: %0.3f plr, %d bwIn, %d bwOut, %d rtt"), plr, bwIn, bwOut, latencyIn + latencyOut);
  HANDLE shaper = CreateFile(SHAPER_DOS_NAME, GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, 0, OPEN_EXISTING, 0, 0);
  if (shaper != INVALID_HANDLE_VALUE) {
    DWORD bytesReturned = 0;
    SHAPER_PARAMS settings;
    settings.plr = plr > 0.0 ? (unsigned short)(plr * 100) : 0; // provided in 0-100 range, need it in 0-10000
    settings.inBps = (__int64)bwIn * 1000LL;
    settings.outBps = (__int64)bwOut * 1000LL;
    settings.inLatency = latencyIn;
    settings.outLatency = latencyOut;
    settings.inBufferBytes = 150000;
    settings.outBufferBytes = 150000;
    if (DeviceIoControl(shaper, SHAPER_IOCTL_ENABLE, &settings, sizeof(settings), NULL, 0, &bytesReturned, NULL))
      enabled = true;
    CloseHandle(shaper);
  }
  return enabled;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Shaper::Disable() {
  bool disabled = false;
  ATLTRACE(_T("[wptdriver] - Shaper::Disable"));
  HANDLE shaper = CreateFile(SHAPER_DOS_NAME, GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, 0, OPEN_EXISTING, 0, 0);
  if (shaper != INVALID_HANDLE_VALUE) {
    DWORD bytesReturned = 0;
    if (DeviceIoControl(shaper, SHAPER_IOCTL_DISABLE, NULL, 0, NULL, 0, &bytesReturned, NULL))
      disabled = true;
    CloseHandle(shaper);
  }
  return disabled;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Shaper::StartService() {
  if (!started_) {
    SC_HANDLE scm = OpenSCManager(NULL, NULL, SC_MANAGER_ALL_ACCESS); 
    if (scm) {
      SC_HANDLE service = OpenService(scm, SHAPER_SERVICE_NAME, SERVICE_ALL_ACCESS); 
      if (service) {
        DWORD dwBytesNeeded;
        SERVICE_STATUS_PROCESS status;
        if (QueryServiceStatusEx(service, SC_STATUS_PROCESS_INFO, (LPBYTE)&status, sizeof(SERVICE_STATUS_PROCESS), &dwBytesNeeded)) {
          if (status.dwCurrentState == SERVICE_STOPPED) {
            if (::StartService(service, 0, NULL)) {
              DWORD count = 0;
              do {
                QueryServiceStatusEx(service, SC_STATUS_PROCESS_INFO, (LPBYTE)&status, sizeof(SERVICE_STATUS_PROCESS), &dwBytesNeeded);
                if (status.dwCurrentState == SERVICE_START_PENDING)
                  Sleep(100);
                count++;
              } while(status.dwCurrentState == SERVICE_START_PENDING && count < 600);
              if (status.dwCurrentState == SERVICE_RUNNING)
                started_ = true;
            }
          } else {
            started_ = true;
          }
        }
        CloseServiceHandle(service);
      }
      CloseServiceHandle(scm);
    }
  }
  return started_;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Shaper::StopService() {
  bool stopped = false;
  SC_HANDLE scm = OpenSCManager(NULL, NULL, SC_MANAGER_ALL_ACCESS); 
  if (scm) {
    SC_HANDLE service = OpenService(scm, SHAPER_SERVICE_NAME, SERVICE_ALL_ACCESS); 
    if (service) {
      DWORD dwBytesNeeded;
      SERVICE_STATUS_PROCESS status;
      if (QueryServiceStatusEx(service, SC_STATUS_PROCESS_INFO, (LPBYTE)&status, sizeof(SERVICE_STATUS_PROCESS), &dwBytesNeeded)) {
        if (status.dwCurrentState == SERVICE_RUNNING) {
          SERVICE_STATUS s;
          if (ControlService(service, SERVICE_CONTROL_STOP, &s)) {
            DWORD count = 0;
            do {
              QueryServiceStatusEx(service, SC_STATUS_PROCESS_INFO, (LPBYTE)&status, sizeof(SERVICE_STATUS_PROCESS), &dwBytesNeeded);
              if (status.dwCurrentState == SERVICE_STOP_PENDING)
                Sleep(100);
              count++;
            } while(status.dwCurrentState == SERVICE_STOP_PENDING && count < 600);
            if (status.dwCurrentState == SERVICE_STOPPED)
              stopped = true;
          }
        }
      }
      CloseServiceHandle(service);
    }
    CloseServiceHandle(scm);
  }
  return stopped;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Shaper::Install() {
  bool installed = false;
  SC_HANDLE scm = OpenSCManager(NULL, NULL, SC_MANAGER_ALL_ACCESS); 
  if (scm) {
    SC_HANDLE service = OpenService(scm, SHAPER_SERVICE_NAME, SERVICE_ALL_ACCESS); 
    if (!service) {
      TCHAR driver_path[MAX_PATH];
      GetModuleFileName(NULL, driver_path, MAX_PATH);
      BOOL is64bit = FALSE;
      if (IsWow64Process(GetCurrentProcess(), &is64bit) && is64bit)
        lstrcpy(PathFindFileName(driver_path), _T("shaper\\x64\\shaper.sys"));
      else
        lstrcpy(PathFindFileName(driver_path), _T("shaper\\x86\\shaper.sys"));
      if (FileExists(driver_path)) {
        service = CreateService(scm,
                                SHAPER_SERVICE_NAME,
                                SHAPER_SERVICE_DISPLAY_NAME,
                                SERVICE_ALL_ACCESS,
                                SERVICE_KERNEL_DRIVER,
                                SERVICE_DEMAND_START,
                                SERVICE_ERROR_NORMAL,
                                driver_path,
                                NULL,
                                NULL,
                                NULL,
                                NULL,
                                NULL);
        if (service) {
          CloseServiceHandle(service);
          installed = true;
        }
      }
    } else {
      CloseServiceHandle(service);
    }
    CloseServiceHandle(scm);
  }
  return installed;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Shaper::Uninstall() {
  bool removed = false;
  SC_HANDLE scm = OpenSCManager(NULL, NULL, SC_MANAGER_ALL_ACCESS); 
  if (scm) {
    SC_HANDLE service = OpenService(scm, SHAPER_SERVICE_NAME, SERVICE_ALL_ACCESS); 
    if (service) {
      if (DeleteService(service))
        removed = true;
      CloseServiceHandle(service);
    }
    CloseServiceHandle(scm);
  }
  return removed;
}
