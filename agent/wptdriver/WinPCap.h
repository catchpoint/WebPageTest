#pragma once
#include <pcap.h>
#include "Log.h"

typedef const char *(__cdecl * PCAP_LIB_VERSION)(void);
typedef int(__cdecl * PCAP_FINDALLDEVS_EX)(char *source, struct pcap_rmtauth *auth, pcap_if_t **alldevs, char *errbuf);
typedef void(__cdecl * PCAP_FREEALLDEVS)(pcap_if_t *);
typedef pcap_t *(__cdecl * PCAP_OPEN)(const char *source, int snaplen, int flags, int read_timeout, struct pcap_rmtauth *auth, char *errbuf);
typedef void(__cdecl * PCAP_CLOSE)(pcap_t *);
typedef pcap_dumper_t *(__cdecl * PCAP_DUMP_OPEN)(pcap_t *, const char *);
typedef void(__cdecl * PCAP_DUMP_CLOSE)(pcap_dumper_t *);
typedef int(__cdecl * PCAP_LOOP)(pcap_t *, int, pcap_handler, u_char *);
typedef void(__cdecl * PCAP_BREAKLOOP)(pcap_t *);
typedef void(__cdecl * PCAP_DUMP)(u_char *, const struct pcap_pkthdr *, const u_char *);
typedef int(__cdecl * PCAP_DUMP_FLUSH)(pcap_dumper_t *);
typedef int(__cdecl * PCAP_NEXT_EX)(pcap_t *, struct pcap_pkthdr **, const u_char **);

class CWinPCap
{
public:
  CWinPCap(CLog &logRef);
  ~CWinPCap(void);
  void Initialize(void);
  bool StartCapture(CString file);
  bool StopCapture();

  void CaptureThread(void);

protected:
  CLog	          &log;
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
