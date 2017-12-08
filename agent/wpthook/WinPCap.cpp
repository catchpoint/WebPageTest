/******************************************************************************
Copyright (c) 2010, Google Inc.
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

#include "StdAfx.h"
#include "WinPCap.h"
#include <zlib.h>

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CWinPCap::CWinPCap():
  pcapLoaded(false)
  ,mustExit(false)
  ,hWinPCap(NULL)
  ,_pcap_lib_version(NULL)
  ,_pcap_findalldevs_ex(NULL)
  ,_pcap_freealldevs(NULL)
  ,_pcap_open(NULL)
  ,_pcap_close(NULL)
  ,_pcap_dump_open(NULL)
  ,_pcap_dump_close(NULL)
  ,_pcap_loop(NULL)
  ,_pcap_breakloop(NULL)
  ,_pcap_dump(NULL)
  ,_pcap_dump_flush(NULL)
  ,_pcap_next_ex(NULL)
  ,hCaptureThread(NULL) {
  hCaptureStarted = CreateEvent(NULL, TRUE, FALSE, NULL);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CWinPCap::~CWinPCap(void) {
  StopCapture();
  CloseHandle(hCaptureStarted);
  if( hWinPCap )
    FreeLibrary(hWinPCap);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWinPCap::Initialize(void) {
  if (!LoadWinPCap()) {
    TCHAR path[MAX_PATH];
    if (GetModuleFileName(NULL, path, _countof(path))) {
      lstrcpy(PathFindFileName(path), _T("winpcap-nmap-4.12.exe"));
      CString exe(path);
      CString cmd = CString(_T("\"")) + exe + _T("\" /S");

      PROCESS_INFORMATION pi;
      STARTUPINFO si;
      memset( &si, 0, sizeof(si) );
      si.cb = sizeof(si);
      si.dwFlags = STARTF_USESHOWWINDOW;
      si.wShowWindow = SW_HIDE;
      if (CreateProcess((LPCTSTR)exe, (LPTSTR)(LPCTSTR)cmd, 0, 0, FALSE, 
          IDLE_PRIORITY_CLASS , 0, NULL, &si, &pi)) {
        WaitForSingleObject(pi.hProcess, 60 * 60 * 1000);
        CloseHandle(pi.hThread);
        CloseHandle(pi.hProcess);
      }
    }
    LoadWinPCap();
  }
}

/*-----------------------------------------------------------------------------
  Load the WinPCap library and bind to the interfaces we care about
-----------------------------------------------------------------------------*/
bool CWinPCap::LoadWinPCap(void) {
  if (!pcapLoaded) {
    hWinPCap = LoadLibrary(_T("wpcap.dll"));
    if (hWinPCap) {
      // load the functions we care about
      _pcap_lib_version     = (PCAP_LIB_VERSION)GetProcAddress(hWinPCap, 
                                                  "pcap_lib_version");
      _pcap_findalldevs_ex  = (PCAP_FINDALLDEVS_EX)GetProcAddress(hWinPCap, 
                                                  "pcap_findalldevs_ex");
      _pcap_freealldevs     = (PCAP_FREEALLDEVS)GetProcAddress(hWinPCap, 
                                                  "pcap_freealldevs");
      _pcap_open            = (PCAP_OPEN)GetProcAddress(hWinPCap, "pcap_open");
      _pcap_close           = (PCAP_CLOSE)GetProcAddress(hWinPCap, 
                                                  "pcap_close");
      _pcap_dump_open       = (PCAP_DUMP_OPEN)GetProcAddress(hWinPCap, 
                                                  "pcap_dump_open");
      _pcap_dump_close      = (PCAP_DUMP_CLOSE)GetProcAddress(hWinPCap, 
                                                  "pcap_dump_close");
      _pcap_loop            = (PCAP_LOOP)GetProcAddress(hWinPCap, "pcap_loop");
      _pcap_breakloop       = (PCAP_BREAKLOOP)GetProcAddress(hWinPCap, 
                                                  "pcap_breakloop");
      _pcap_dump            = (PCAP_DUMP)GetProcAddress(hWinPCap, "pcap_dump");
      _pcap_dump_flush      = (PCAP_DUMP_FLUSH)GetProcAddress(hWinPCap, 
                                                  "pcap_dump_flush");
      _pcap_next_ex         = (PCAP_NEXT_EX)GetProcAddress(hWinPCap, 
                                                  "pcap_next_ex");

    if( _pcap_lib_version
        && _pcap_findalldevs_ex 
        && _pcap_freealldevs
        && _pcap_open
        && _pcap_close
        && _pcap_dump_open
        && _pcap_dump_close
        && _pcap_loop
        && _pcap_breakloop
        && _pcap_dump
        && _pcap_dump_flush
        && _pcap_next_ex) {
        pcapLoaded = true;
        const char * ver = _pcap_lib_version();
      }
    }
  }

  return pcapLoaded;
}

/*-----------------------------------------------------------------------------
  Stub for the capture background thread
-----------------------------------------------------------------------------*/
static unsigned __stdcall CaptureThread( void* arg ) {
  if( arg )
    ((CWinPCap*)arg)->CaptureThread();
    
  return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CWinPCap::StartCapture(CString file) {
  bool ret = false;
  if (pcapLoaded) {
    captureFile = file;
    mustExit = false;
    ResetEvent(hCaptureStarted);
    hCaptureThread = (HANDLE)_beginthreadex( 0, 0, ::CaptureThread, this, 0, 0);
    if( hCaptureThread ){
      if( WaitForSingleObject(hCaptureStarted, 10000) == WAIT_OBJECT_0 )
        ret = true;
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CWinPCap::StopCapture() {
  bool ret = false;

  if (pcapLoaded && hCaptureThread) {
    // stop the thread (give it a long time since it will also be 
    // compressing the capture file)
    mustExit = true;
    WaitForSingleObject(hCaptureThread, 300000);
    CloseHandle(hCaptureThread);
    hCaptureThread = NULL;
    captureFile.Empty();
    ret = true;
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWinPCap::CaptureThread(void) {
  if (pcapLoaded) {
    pcap_t *        pcapSession;
    pcap_dumper_t * pcapFile;

    // get the list of all of the interfaces
    pcap_if_t *alldevs;
    char errbuf[PCAP_ERRBUF_SIZE+1];
    if (!_pcap_findalldevs_ex("rpcap://", NULL, &alldevs, errbuf)) {
      // iterate through them looking for a suitable interface 
      // (one with an address assigned and not a loopback)
      pcap_if_t *d;
      CStringA capDevice;
      for (d=alldevs;d && capDevice.IsEmpty();d=d->next) {
        if (!(d->flags & PCAP_IF_LOOPBACK) && d->addresses) {
          pcap_addr * addr;
          for(addr=d->addresses; addr && capDevice.IsEmpty(); addr=addr->next)
            if (addr->addr && addr->addr->sa_family == AF_INET) {
              capDevice = d->name;
            }
        }
      }
      _pcap_freealldevs(alldevs);

      // start the actual capture
      if (!capDevice.IsEmpty()) {
        pcapSession = _pcap_open((LPCSTR)capDevice,65536,0,1000,NULL,errbuf);
        if (pcapSession) {
          pcapFile = _pcap_dump_open(pcapSession, (LPCSTR)CT2A(captureFile));
          if (pcapFile) {
            // flag that we have started the capture;
            SetEvent(hCaptureStarted);

            // run a packet capture loop
            struct pcap_pkthdr * pkt_header;
            const u_char * pkt_data;
            while (!mustExit) {
              if (_pcap_next_ex(pcapSession, &pkt_header, &pkt_data) > 0) {
                _pcap_dump((u_char *)pcapFile, pkt_header, pkt_data);
              }
            }
            _pcap_dump_close(pcapFile);
            CompressCapture();
          }
          _pcap_close(pcapSession);
        }
      }
    }
  }

  //In case there was an error,set the flag so we don't hold up the main thread
  SetEvent(hCaptureStarted);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWinPCap::CompressCapture(void) {
  bool ok = false;

  HANDLE hSrc = CreateFile(captureFile, GENERIC_READ, 0, 0, OPEN_EXISTING,0,0);
  if (hSrc != INVALID_HANDLE_VALUE) {
    gzFile dst = gzopen((LPCSTR)CT2A(captureFile + _T(".gz")), "wb6");
    if (dst) {
      char buff[4096];
      DWORD buffLen = sizeof(buff);
      DWORD len = 0;
      while (ReadFile(hSrc, (LPVOID)buff, buffLen, &len, 0) && len)
        if (gzwrite(dst, (voidpc)buff, (unsigned int)len))
          ok = true;

      gzclose(dst);
    }
    CloseHandle(hSrc);
  }

  if( ok )
    DeleteFile(captureFile);
}
