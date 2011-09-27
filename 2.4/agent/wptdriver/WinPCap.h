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

#pragma once
#include <pcap.h>

typedef const char *(__cdecl * PCAP_LIB_VERSION)(void);
typedef int(__cdecl * PCAP_FINDALLDEVS_EX)(char *source, 
                struct pcap_rmtauth *auth, pcap_if_t **alldevs, char *errbuf);
typedef void(__cdecl * PCAP_FREEALLDEVS)(pcap_if_t *);
typedef pcap_t *(__cdecl * PCAP_OPEN)(const char *source, int snaplen, 
        int flags, int read_timeout, struct pcap_rmtauth *auth, char *errbuf);
typedef void(__cdecl * PCAP_CLOSE)(pcap_t *);
typedef pcap_dumper_t *(__cdecl * PCAP_DUMP_OPEN)(pcap_t *, const char *);
typedef void(__cdecl * PCAP_DUMP_CLOSE)(pcap_dumper_t *);
typedef int(__cdecl * PCAP_LOOP)(pcap_t *, int, pcap_handler, u_char *);
typedef void(__cdecl * PCAP_BREAKLOOP)(pcap_t *);
typedef void(__cdecl * PCAP_DUMP)(u_char *, const struct pcap_pkthdr *, 
            const u_char *);
typedef int(__cdecl * PCAP_DUMP_FLUSH)(pcap_dumper_t *);
typedef int(__cdecl * PCAP_NEXT_EX)(pcap_t *, struct pcap_pkthdr **, 
            const u_char **);

class CWinPCap {
public:
  CWinPCap();
  ~CWinPCap(void);
  void Initialize(void);
  bool StartCapture(CString file);
  bool StopCapture();

  void CaptureThread(void);

protected:
  HANDLE          hCaptureThread;
  HANDLE          hCaptureStarted;
  bool            pcapLoaded;
  bool            mustExit;
  CString         captureFile;

  // winpcap functions
  HMODULE             hWinPCap;
  PCAP_LIB_VERSION    _pcap_lib_version;
  PCAP_FINDALLDEVS_EX _pcap_findalldevs_ex;
  PCAP_FREEALLDEVS    _pcap_freealldevs;
  PCAP_OPEN           _pcap_open;
  PCAP_CLOSE          _pcap_close;
  PCAP_DUMP_OPEN      _pcap_dump_open;
  PCAP_DUMP_CLOSE     _pcap_dump_close;
  PCAP_LOOP           _pcap_loop;
  PCAP_BREAKLOOP      _pcap_breakloop;
  PCAP_DUMP           _pcap_dump;
  PCAP_DUMP_FLUSH     _pcap_dump_flush;
  PCAP_NEXT_EX        _pcap_next_ex;

  bool    LoadWinPCap(void);
  void    CompressCapture(void);
};
