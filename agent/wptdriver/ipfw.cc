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

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CIpfw::CIpfw(void) {
  TCHAR dir[MAX_PATH];
  if (GetModuleFileName(NULL, dir, _countof(dir))) {
    *PathFindFileName(dir) = 0;
    ipfw_dir_ = dir;
    ipfw_dir_ += _T("dummynet\\");
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CIpfw::Init() {
  bool ret = false;
  if (!ipfw_dir_.IsEmpty()) {
    ret = LaunchProcess(_T("cmd /C \"ipfw.cmd\""), NULL, ipfw_dir_);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CIpfw::SetPipe(unsigned int num, unsigned long bandwidth, 
                    unsigned long delay, double plr) {
  bool ret = false;
  CString cmd, buff;
  cmd.Format(_T("pipe %d config"), num);
  if (bandwidth > 0) {
    buff.Format(_T(" bw %dKbit/s"), bandwidth);
    cmd += buff;
  }
  if (delay > 0) {
    buff.Format(_T(" delay %dms"), delay);
    cmd += buff;
  }
  if (plr > 0.0) {
    buff.Format(_T(" plr 0.4f"), plr);
    cmd += buff;
  }
  ret = Execute(cmd);
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
    ret = LaunchProcess(command, NULL, ipfw_dir_);
  }
  return ret;
}
