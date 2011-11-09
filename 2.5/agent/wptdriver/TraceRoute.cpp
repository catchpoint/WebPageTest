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

#include "stdafx.h"
#include "traceroute.h"
#include <winsock2.h>
#include <Ws2tcpip.h>
#include <iphlpapi.h>
#include <icmpapi.h>

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CTraceRoute::CTraceRoute(WptTestDriver &test, int maxHops, DWORD timeout):
  _test(test)
  , _maxHops(maxHops)
  , _timeout(timeout) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CTraceRoute::~CTraceRoute(void) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CTraceRoute::Run() {
  __int64 freq, start, end;
  QueryPerformanceFrequency((LARGE_INTEGER *)&freq);
  freq = freq / 1000;

  CStringA result = "Hop,IP,ms,FQDN\r\n-1,";
  CStringA buff;

  HANDLE hIcmpFile = IcmpCreateFile();
  if (hIcmpFile != INVALID_HANDLE_VALUE) {
    unsigned long ipaddr = 0;
    struct addrinfo aiHints;
    memset(&aiHints, 0, sizeof(aiHints));
    aiHints.ai_family = AF_INET;
    aiHints.ai_socktype = SOCK_STREAM;
    aiHints.ai_protocol = IPPROTO_TCP;
    struct addrinfo *aiList = NULL;
    if( !getaddrinfo(LPCSTR(CT2A(_test._url)), "80", &aiHints, &aiList) && 
      aiList[0].ai_family == AF_INET && 
      aiList[0].ai_addrlen >= sizeof(struct sockaddr_in) &&
      aiList[0].ai_addr) {
      ipaddr = ((struct sockaddr_in *)(aiList[0].ai_addr))->sin_addr.s_addr;
    }

    if (ipaddr) {
      in_addr addr;
      addr.s_addr = ipaddr;
      result += CStringA(inet_ntoa(addr)) + CStringA(",0,") + 
                CStringA(CT2A(_test._url)) + "\r\n";

      char SendData[32] = "Slow? Fast? Dunno.  Let's See.";
      DWORD ReplySize = sizeof(ICMP_ECHO_REPLY) + sizeof(SendData);
      ICMP_ECHO_REPLY * reply = (ICMP_ECHO_REPLY *)malloc(ReplySize);
      IP_OPTION_INFORMATION options;
      DWORD count = 0;

      int hop = 1;
      bool done = false;
      int sequentialFailures = 0;
      while (hop < _maxHops && sequentialFailures < 4 && !done) {
        memset(&options, 0, sizeof(options));
        options.Ttl = (UCHAR)hop;

        // time the actual ping
        QueryPerformanceCounter((LARGE_INTEGER *)&start);
        count = IcmpSendEcho(hIcmpFile, ipaddr, SendData, sizeof(SendData), 
                              &options, reply, ReplySize, _timeout);
        QueryPerformanceCounter((LARGE_INTEGER *)&end);

        double elapsed = (double)(end - start) / (double)freq;

        if (count) {
          sequentialFailures = 0;
          if( reply->Status == IP_SUCCESS )
            done = true;

          // figure out the host name
          struct sockaddr_in saGNI;
          char hostname[NI_MAXHOST] = {0};
          saGNI.sin_family = AF_INET;
          saGNI.sin_addr.s_addr = reply->Address;
          saGNI.sin_port = htons(80);

          getnameinfo((struct sockaddr *) &saGNI, sizeof (struct sockaddr),
                       hostname, NI_MAXHOST, NULL,  0, 0);

          addr.s_addr = reply->Address;
          buff.Format("%d,%s,%0.3f,%s\r\n", hop, inet_ntoa(addr), elapsed, hostname);
          result += buff;
        } else {
          sequentialFailures++;
          
          buff.Format("%d,,,\r\n", hop);
          result += buff;
        }
        hop++;
      }
    }

    // save out the result of the traceroute
    if (_test._file_base.GetLength()) {
      HANDLE hFile = CreateFile(_test._file_base + _T("_traceroute.txt"), 
                                GENERIC_WRITE, 0, 0, CREATE_ALWAYS, 0, 0);
      if (hFile != INVALID_HANDLE_VALUE) {
        DWORD written;
        WriteFile(hFile, (LPCSTR)result, result.GetLength(), &written, 0);
        CloseHandle(hFile);
      }
    }

    IcmpCloseHandle(hIcmpFile);
  }
}
