// ipfw_config.cpp : Defines the entry point for the console application.
//

#include "stdafx.h"

bool Exec(CString command_line){
  bool ret = false;

  //OutputDebugString(command_line);
  if (command_line.GetLength()) {
    PROCESS_INFORMATION pi;
    STARTUPINFO si;
    memset( &si, 0, sizeof(si) );
    si.cb = sizeof(si);
    si.dwFlags = STARTF_USESHOWWINDOW;
    si.wShowWindow = SW_HIDE;
    if (CreateProcess(NULL, (LPTSTR)(LPCTSTR)command_line, 0, 0, FALSE, 
                      NORMAL_PRIORITY_CLASS , 0, NULL, &si, &pi)) {
      WaitForSingleObject(pi.hProcess, 60 * 60 * 1000);
      DWORD code;
      if( GetExitCodeProcess(pi.hProcess, &code) && code == 0 )
        ret = true;
      CloseHandle(pi.hThread);
      CloseHandle(pi.hProcess);
    }
  }

  return ret;
}

bool ipfw(CString server, CString user, CString password, int pipe, int bw, int delay, double plr) {
  bool ret = false;
  CString cmd = L"plink";
  if (!password.IsEmpty())
    cmd += L" -pw " + password;
  cmd += L" ";
  if (!user.IsEmpty())
    cmd += user + L"@";
  cmd += server + L" ";

  CString ipfw_command, buff;

  // Bandwidth and delay are applied to the pipe
  ipfw_command.Format(L"ipfw pipe %d config", pipe);
  if (bw > 0) {
    buff.Format(L" bw %dKbit/s", bw/1000);
    ipfw_command += buff;
  }
  if (delay >= 0) {
    buff.Format(L" delay %dms", delay);
    ipfw_command += buff;
  }

  
  ret = Exec(cmd + ipfw_command);
  OutputDebugString(ipfw_command);

  if (ret) {
    // packet loss is applied to the queue
    ipfw_command.Format(L"ipfw queue %d config", pipe);
    if (plr > 0 && plr <= 1.0) {
      buff.Format(L" plr %0.4f", plr);
      ipfw_command += buff;
    } else {
      ipfw_command += L" plr 0";
    }
    Exec(cmd + ipfw_command);
    OutputDebugString(ipfw_command);
  }

  cmd += ipfw_command;

  return ret;
}

int _tmain(int argc, _TCHAR* argv[]) {
  int ret = 1;
  CString command,server,user,password;
  int down_pipe = 0, down_bw = 0, down_delay = 0;
  int up_pipe = 0, up_bw = 0, up_delay = 0;
  double down_plr = 0.0, up_plr = 0.0;

  // parse the command-line options
  for (int i = 0; i < argc; i++) {
    if (!lstrcmpi(argv[i], L"set")) {
      command = argv[i];
    } else if (!lstrcmpi(argv[i], L"clear")) {
      command = argv[i];
    } else if (!lstrcmpi(argv[i], L"--server")) {
      if (i + 1 < argc) {
        i++;
        server = argv[i];
      }
    } else if (!lstrcmpi(argv[i], L"--user")) {
      if (i + 1 < argc) {
        i++;
        user = argv[i];
      }
    } else if (!lstrcmpi(argv[i], L"--pw")) {
      if (i + 1 < argc) {
        i++;
        password = argv[i];
      }
    } else if (!lstrcmpi(argv[i], L"--down_pipe")) {
      if (i + 1 < argc) {
        i++;
        down_pipe = _ttoi(argv[i]);
      }
    } else if (!lstrcmpi(argv[i], L"--down_bw")) {
      if (i + 1 < argc) {
        i++;
        down_bw = _ttoi(argv[i]);
      }
    } else if (!lstrcmpi(argv[i], L"--down_delay")) {
      if (i + 1 < argc) {
        i++;
        down_delay = _ttoi(argv[i]);
      }
    } else if (!lstrcmpi(argv[i], L"--down_plr")) {
      if (i + 1 < argc) {
        i++;
        down_plr = _ttof(argv[i]);
      }
    } else if (!lstrcmpi(argv[i], L"--up_pipe")) {
      if (i + 1 < argc) {
        i++;
        up_pipe = _ttoi(argv[i]);
      }
    } else if (!lstrcmpi(argv[i], L"--up_bw")) {
      if (i + 1 < argc) {
        i++;
        up_bw = _ttoi(argv[i]);
      }
    } else if (!lstrcmpi(argv[i], L"--up_delay")) {
      if (i + 1 < argc) {
        i++;
        up_delay = _ttoi(argv[i]);
      }
    } else if (!lstrcmpi(argv[i], L"--up_plr")) {
      if (i + 1 < argc) {
        i++;
        up_plr = _ttof(argv[i]);
      }
    }
  }

  // validate the parameters
  if (!command.IsEmpty() && !server.IsEmpty() && down_pipe > 0 && up_pipe > 0) {
    if (!command.CompareNoCase(L"clear")) {
      if (ipfw(server, user, password, down_pipe, 0, 0, 0) &&
          ipfw(server, user, password, up_pipe, 0, 0, 0)) {
        ret = 0;
      }
    } else if (!command.CompareNoCase(L"set")) {
      if (ipfw(server, user, password, down_pipe, down_bw, down_delay, down_plr) &&
          ipfw(server, user, password, up_pipe, up_bw, up_delay, up_plr)) {
        ret = 0;
      }
    }
  }

	return ret;
}

