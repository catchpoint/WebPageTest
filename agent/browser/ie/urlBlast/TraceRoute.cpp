#include "StdAfx.h"
#include "UrlMgrBase.h"
#include "TraceRoute.h"
#include <winsock2.h>
#include <Ws2tcpip.h>
#include <iphlpapi.h>
#include <icmpapi.h>

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CTraceRoute::CTraceRoute(CTestInfo &info, int maxHops, DWORD timeout):
  _info(info)
  , _maxHops(maxHops)
  , _timeout(timeout)
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CTraceRoute::~CTraceRoute(void)
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CTraceRoute::Run()
{
  __int64 freq, start, end;
  QueryPerfFrequency(freq);
  freq = freq / 1000;

  CStringA result = "Hop,IP,ms,FQDN\r\n-1,";
  CStringA buff;

  HANDLE hIcmpFile = IcmpCreateFile();
  if( hIcmpFile != INVALID_HANDLE_VALUE )
  {
    unsigned long ipaddr = 0;
    struct addrinfo aiHints;
    memset(&aiHints, 0, sizeof(aiHints));
    aiHints.ai_family = AF_INET;
    aiHints.ai_socktype = SOCK_STREAM;
    aiHints.ai_protocol = IPPROTO_TCP;
    struct addrinfo *aiList = NULL;
    if( !getaddrinfo(LPCSTR(CT2A(_info.url)), "80", &aiHints, &aiList) && 
      aiList[0].ai_family == AF_INET && 
      aiList[0].ai_addrlen >= sizeof(struct sockaddr_in) &&
      aiList[0].ai_addr)
      ipaddr = ((struct sockaddr_in *)(aiList[0].ai_addr))->sin_addr.s_addr;

    if( ipaddr )
    {
      in_addr addr;
      addr.s_addr = ipaddr;
      result += CStringA(inet_ntoa(addr)) + CStringA(",0,") + CStringA(CT2A(_info.url)) + "\r\n";

      char SendData[32] = "Slow? Fast? Dunno.  Let's See.";
      DWORD ReplySize = sizeof(ICMP_ECHO_REPLY) + sizeof(SendData);
      ICMP_ECHO_REPLY * reply = (ICMP_ECHO_REPLY *)malloc(ReplySize);
      IP_OPTION_INFORMATION options;
      DWORD count = 0;

      int hop = 1;
      bool done = false;
      int sequentialFailures = 0;
      while( hop < _maxHops && sequentialFailures < 4 && !done )
      {
        memset(&options, 0, sizeof(options));
        options.Ttl = (UCHAR)hop;

        // time the actual ping
        QueryPerfCounter(start);
        count = IcmpSendEcho(hIcmpFile, ipaddr, SendData, sizeof(SendData), &options, reply, ReplySize, _timeout);
        QueryPerfCounter(end);

        double elapsed = (double)(end - start) / (double)freq;

        if( count )
        {
          sequentialFailures = 0;
          if( reply->Status == IP_SUCCESS )
            done = true;

          // figure out the host name
          struct sockaddr_in saGNI;
          char hostname[NI_MAXHOST] = {0};
          saGNI.sin_family = AF_INET;
          saGNI.sin_addr.s_addr = reply->Address;
          saGNI.sin_port = htons(80);

          getnameinfo((struct sockaddr *) &saGNI,
                       sizeof (struct sockaddr),
                       hostname,
                       NI_MAXHOST, NULL, 
                       0, 0);

          addr.s_addr = reply->Address;
          buff.Format("%d,%s,%0.3f,%s\r\n", hop, inet_ntoa(addr), elapsed, hostname);
          result += buff;
        }
        else
        {
          sequentialFailures++;
          
          buff.Format("%d,,,\r\n", hop);
          result += buff;
        }
        hop++;
      }
    }

    // save out the result of the traceroute
    if( _info.logFile.GetLength() )
    {
      HANDLE hFile = CreateFile(_info.logFile + _T("_traceroute.txt"), GENERIC_WRITE, 0, 0, CREATE_ALWAYS, 0, 0);
      if( hFile != INVALID_HANDLE_VALUE )
      {
        DWORD written;
        WriteFile(hFile, (LPCSTR)result, result.GetLength(), &written, 0);
        CloseHandle(hFile);
      }
    }

    IcmpCloseHandle(hIcmpFile);
  }
}
