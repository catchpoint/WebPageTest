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
#include "ipfw.h"
#include "ipfw_int.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CIpfw::CIpfw(void):win32_(false),initialized_(false) {
  TCHAR dir[MAX_PATH];
  if (GetModuleFileName(NULL, dir, _countof(dir))) {
    *PathFindFileName(dir) = 0;
    ipfw_dir_ = dir;
    ipfw_dir_ += _T("dummynet\\");
  }
  SYSTEM_INFO info;
  GetNativeSystemInfo(&info);
  if (info.wProcessorArchitecture == PROCESSOR_ARCHITECTURE_INTEL) {
    win32_ = true;
    hDriver = CreateFile(_T("\\\\.\\Ipfw"), GENERIC_READ | GENERIC_WRITE, 0,
                         NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CIpfw::Init() {
  if (!initialized_) {
    if (!ipfw_dir_.IsEmpty()) {
      // load the ipfw console command and run each command directly
      FILE * file = NULL;
      if (!fopen_s(&file, (LPCSTR)CT2A(ipfw_dir_ + _T("ipfw.cmd")), "r")) {
        char buff[1024];
        while (fgets(buff, _countof(buff), file)) {
          CStringA line(buff);
          line.Trim();
          if (!line.Left(4).CompareNoCase("ipfw")) {
            int pos = line.Find(" ");
            if (pos > 0) {
              CStringA cmd = line.Mid(pos + 1).Trim();
              if (cmd.GetLength()) {
                initialized_ = Execute((LPCTSTR)CA2T((LPCSTR)cmd, CP_UTF8));
              }
            }
          }
        }
        fclose(file);
      }
    }
  }
  return initialized_;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CIpfw::SetPipe(unsigned int num, unsigned long bandwidth, 
                    unsigned long delay, double plr) {
  bool ret = Init();

  if (ret) {
    // Always try using the command-line interface if available
    CString cmd_line, buff;

    // Bandwidth and delay get applied to the pipe
    cmd_line.Format(_T("pipe %d config"), num);
    if (bandwidth > 0) {
      buff.Format(_T(" bw %dKbit/s"), bandwidth);
      cmd_line += buff;
    }
    if (delay >= 0) {
      buff.Format(_T(" delay %dms"), delay);
      cmd_line += buff;
    }
    ret = Execute(cmd_line);

    // Packet loss needs to be applied to the queue
    if (ret) {
      cmd_line.Format(_T("queue %d config"), num);
      if (plr > 0.0 && plr <= 1.0) {
        buff.Format(_T(" plr %0.4f"), plr);
        cmd_line += buff;
      } else {
        cmd_line += _T(" plr 0");
      }
      Execute(cmd_line);
    }

    // on 32-bit systems, fall back to talking to the driver directly
    if (win32_ && !ret) {
      if (hDriver != INVALID_HANDLE_VALUE) {
        #pragma pack(push)
        #pragma pack(1)
        struct {
          struct dn_id	header;
          struct dn_sch	sch;
          struct dn_link	link;
          struct dn_fs	fs;
        } cmd;
        #pragma pack(pop)
        memset(&cmd, 0, sizeof(cmd));
        cmd.header.len = sizeof(cmd.header);
        cmd.header.type = DN_CMD_CONFIG;
        cmd.header.id = DN_API_VERSION;
        // scheduler
        cmd.sch.oid.len = sizeof(cmd.sch);
        cmd.sch.oid.type = DN_SCH;
        cmd.sch.sched_nr = num;
        cmd.sch.oid.subtype = 0;	/* defaults to WF2Q+ */
        cmd.sch.flags = DN_PIPE_CMD;
        // link
        cmd.link.oid.len = sizeof(cmd.link);
        cmd.link.oid.type = DN_LINK;
        cmd.link.link_nr = num;
        cmd.link.bandwidth = bandwidth * 1000;
        cmd.link.delay = delay;
        // flowset
        cmd.fs.oid.len = sizeof(cmd.fs);
        cmd.fs.oid.type = DN_FS;
        cmd.fs.fs_nr = num + 2*DN_MAX_ID;
        cmd.fs.sched_nr = num + DN_MAX_ID;
        for(int j = 0; j < _countof(cmd.fs.par); j++)
          cmd.fs.par[j] = -1;
        if( plr > 0 && plr <= 1.0 )
          cmd.fs.plr = (int)(plr*0x7fffffff);
        // send the configuration to the driver
        size_t size = sizeof(struct sockopt) + sizeof(cmd);
        struct sockopt * s = (struct sockopt *)malloc(size);
        if (s) {
          s->sopt_dir = SOPT_SET;
          s->sopt_name = IP_DUMMYNET3;
          s->sopt_valsize = sizeof(cmd);
          s->sopt_val = (void *)(s+1);
          memcpy(s->sopt_val, &cmd, sizeof(cmd));
          DWORD n;
          if (DeviceIoControl(hDriver, IP_FW_SETSOCKOPT,s,size, s, size, &n, 
                              NULL))
            ret = true;
          free(s);
        }
      }
    }
  }
  return ret;
}

/*-----------------------------------------------------------------------------
  Execute the given ipfw command
-----------------------------------------------------------------------------*/
bool CIpfw::Execute(CString cmd) {
  bool ret = false;
  if (!ipfw_dir_.IsEmpty()) {
    CString command;
    command.Format(_T("cmd /C \"ipfw.exe %s\""), (LPCTSTR)cmd);
    ATLTRACE(_T("Configuring dummynet: '%s'"), (LPCTSTR)command);
    ret = LaunchProcess(command, NULL, ipfw_dir_);
  }
  return ret;
}
