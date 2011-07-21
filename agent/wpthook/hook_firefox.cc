#include "StdAfx.h"

#include "hook_firefox.h"

static FirefoxHook* pHook = NULL;

// Stub Functions

PRInt32 PR_Send_Hook(PRFileDesc *fd, const void *buf, PRInt32 amount, PRIntn flags, PRIntervalTime timeout) {
  PRInt32 ret = -1;
  if (pHook) {
    ret = pHook->PR_Send(fd, buf, amount, flags, timeout);
  }
  return ret;
}

PRInt32 PR_Write_Hook(PRFileDesc *fd, const void *buf, PRInt32 amount) {
  PRInt32 ret = -1;
  if (pHook) {
    ret = pHook->PR_Write(fd, buf, amount);
  }
  return ret;
}

PRInt32 PR_Read_Hook(PRFileDesc *fd, void *buf, PRInt32 amount) {
  PRInt32 ret = -1;
  if (pHook) {
    ret = pHook->PR_Read(fd, buf, amount);
  }
  return ret;
}
PRInt32 PR_Recv_Hook(PRFileDesc *fd, void *buf, PRInt32 amount, PRIntn flags, PRIntervalTime timeout) {
  PRInt32 ret = -1;
  if (pHook) {
    ret = pHook->PR_Recv(fd, buf, amount, flags, timeout);
  }
  return ret;
}

PRFileDesc* SSL_ImportFD_Hook(PRFileDesc *model, PRFileDesc *fd) {
  PRFileDesc* ret = NULL;
  if (pHook) {
    ret = pHook->SSL_ImportFD(model, fd);
  }
  return ret;
}

SECStatus SSL_SetURL_Hook(PRFileDesc *fd, const char *url) {
  SECStatus ret = SECFailure;
  if (pHook) {
    ret = pHook->SSL_SetURL(fd, url);
  }
  return ret;
}

SECStatus SSL_ForceHandshake_Hook(PRFileDesc *fd) {
  SECStatus ret = SECFailure;
  if (pHook) {
    ret = pHook->SSL_ForceHandshake(fd);
  }
  return ret;
}
SECStatus SSL_ForceHandshakeWithTimeout_Hook(PRFileDesc *fd, PRIntervalTime timeout) {
  SECStatus ret = SECFailure;
  if (pHook) {
    ret = pHook->SSL_ForceHandshakeWithTimeout(fd, timeout);
  }
  return ret;
}

PRStatus PR_Connect_Hook(PRFileDesc *fd, const PRNetAddr *addr, PRIntervalTime timeout) {
  PRStatus ret = PR_FAILURE;
  if (pHook) {
    ret = pHook->PR_Connect(fd, addr, timeout);
  }
  return ret;
}

PRStatus PR_GetConnectStatus_Hook(const PRPollDesc *pd) {
  PRStatus ret = PR_FAILURE;
  if (pHook) {
    ret = pHook->PR_GetConnectStatus(pd);
  }
  return ret;
}

PRAddrInfo* PR_GetAddrInfoByName_Hook(const char *hostname, PRUint16 af, PRIntn flags) {
  PRAddrInfo* ret = NULL;
  if (pHook) {
    ret = pHook->PR_GetAddrInfoByName(hostname, af, flags);
  }
  return ret;
}

PRStatus PR_GetHostByName_Hook(const char *hostname, char *buf, PRIntn bufsize, PRHostEnt *hostentry) {
  PRStatus ret = PR_FAILURE;
  if (pHook) {
    ret = pHook->PR_GetHostByName(hostname, buf, bufsize, hostentry);
  }
  return ret;
}


FirefoxHook::FirefoxHook() {
}

FirefoxHook::~FirefoxHook() {
  fclose(_fp);
  if (pHook == this) {
    pHook = NULL;
  }
}

void FirefoxHook::Init() {
  _fp=fopen("h:\\firefox.txt", "w");
  if (!pHook) {
    pHook = this;
  }
  WptTrace(loglevel::kProcess, _T("[wpthook] FirefoxHook::Init()\n"));
  _PR_Send = hook.createHookByName("nspr4.dll", "PR_Send", PR_Send_Hook);
  _PR_Write = hook.createHookByName("nspr4.dll", "PR_Write", PR_Write_Hook);
  _PR_Read = hook.createHookByName("nspr4.dll", "PR_Read", PR_Read_Hook);
  _PR_Recv = hook.createHookByName("nspr4.dll", "PR_Recv", PR_Recv_Hook);

  _SSL_ImportFD = hook.createHookByName("ssl3.dll", "SSL_ImportFD", SSL_ImportFD_Hook);
  _SSL_SetURL = hook.createHookByName("ssl3.dll", "SSL_SetURL", SSL_SetURL_Hook);
  _SSL_ForceHandshake = hook.createHookByName("ssl3.dll", "SSL_ForceHandshake", SSL_ForceHandshake_Hook);
  _SSL_ForceHandshakeWithTimeout = hook.createHookByName("ssl3.dll", "SSL_ForceHandshakeWithTimeout", SSL_ForceHandshakeWithTimeout_Hook);
  _PR_Connect = hook.createHookByName("nspr4.dll", "PR_Connect", PR_Connect_Hook);
  _PR_GetConnectStatus = hook.createHookByName("nspr4.dll", "PR_GetConnectStatus", PR_GetConnectStatus_Hook);
  _PR_GetAddrInfoByName = hook.createHookByName("nspr4.dll", "PR_GetAddrInfoByName", PR_GetAddrInfoByName_Hook);
  _PR_GetHostByName = hook.createHookByName("nspr4.dll", "PR_GetHostByName", PR_GetHostByName_Hook);
}

// NSPR hooks
PRInt32 FirefoxHook::PR_Write(PRFileDesc *fd, const void *buf, PRInt32 amount) {
  PRInt32 ret = -1;
  if (_PR_Write) {
    WptTrace(loglevel::kProcess, _T("[wpthook] Call _PR_Write\n"));
    fprintf(_fp, "PR_Write(%d):\n", amount);
    fwrite(buf, 1, amount, _fp);
    return _PR_Write(fd, buf, amount);
  }
  return ret;
}

PRInt32 FirefoxHook::PR_Send(PRFileDesc *fd, const void *buf, PRInt32 amount, PRIntn flags, PRIntervalTime timeout) {
  PRInt32 ret = -1;
  if (_PR_Send) {
    WptTrace(loglevel::kProcess, _T("[wpthook] Call _PR_Send\n"));
    fprintf(_fp, "PR_Send(%d):\n", amount);
    fwrite(buf, 1, amount, _fp);
    ret = _PR_Send(fd, buf, amount, flags, timeout);
  }
  return ret;
}

PRInt32 FirefoxHook::PR_Read(PRFileDesc *fd, void *buf, PRInt32 amount) {
  PRInt32 ret = -1;
  if (_PR_Read) {
    WptTrace(loglevel::kProcess, _T("[wpthook] Call _PR_Read\n"));
    fprintf(_fp, "PR_Read(%d):\n", amount);
    fwrite(buf, 1, amount, _fp);
    ret = _PR_Read(fd, buf, amount);
  }
  return ret;
}

PRInt32 FirefoxHook::PR_Recv(PRFileDesc *fd, void *buf, PRInt32 amount, PRIntn flags, PRIntervalTime timeout) {
  PRInt32 ret = -1;
  if (_PR_Send) {
    WptTrace(loglevel::kProcess, _T("[wpthook] Call _PR_Recv\n"));
    fprintf(_fp, "PR_Recv(%d):\n", amount);
    fwrite(buf, 1, amount, _fp);
    ret = _PR_Recv(fd, buf, amount, flags, timeout);
  }
  return ret;
}

PRFileDesc* FirefoxHook::SSL_ImportFD(PRFileDesc *model, PRFileDesc *fd) {
  PRFileDesc* ret = NULL;
  if (_SSL_ImportFD) {
    WptTrace(loglevel::kProcess, _T("[wpthook] Call _SSL_ImportFD\n"));
    fprintf(_fp, "_SSL_ImportFD:\n");
    //fwrite(_fp);
    ret = _SSL_ImportFD(model, fd);
  }
  return ret;
}

SECStatus FirefoxHook::SSL_SetURL(PRFileDesc *fd, const char *url) {
  SECStatus ret = SECFailure;
  if (_SSL_SetURL) {
    WptTrace(loglevel::kProcess, _T("[wpthook] Call _SSL_SetURL\n"));
    fprintf(_fp, "_SSL_SetURL(%s)\n", url);
    //fwrite(_fp);
    ret = _SSL_SetURL(fd, url);
  }
  return ret;
}

SECStatus FirefoxHook::SSL_ForceHandshake(PRFileDesc *fd) {
  SECStatus ret = SECFailure;
  if (_SSL_ForceHandshake) {
    WptTrace(loglevel::kProcess, _T("[wpthook] Call _SSL_ForceHandshake\n"));
    fprintf(_fp, "_SSL_ForceHandshake:\n");
    //fwrite(_fp);
    ret = _SSL_ForceHandshake(fd);
  }
  return ret;
}

SECStatus FirefoxHook::SSL_ForceHandshakeWithTimeout(PRFileDesc *fd, PRIntervalTime timeout) {
  SECStatus ret = SECFailure;
  if (_SSL_ForceHandshakeWithTimeout) {
    WptTrace(loglevel::kProcess, _T("[wpthook] Call _SSL_ForceHandshakeWithTimeout\n"));
    fprintf(_fp, "_SSL_ForceHandshakeWithTimeout:\n");
    //fwrite(_fp);
    ret = _SSL_ForceHandshakeWithTimeout(fd, timeout);
  }
  return ret;
}

PRStatus FirefoxHook::PR_Connect(PRFileDesc *fd, const PRNetAddr *addr, PRIntervalTime timeout) {
  PRStatus ret = PR_FAILURE;
  if (_PR_Connect) {
    WptTrace(loglevel::kProcess, _T("[wpthook] Call _PR_Connect\n"));
    fprintf(_fp, "_PR_Connect.\n");
    //fwrite(_fp);
    ret = _PR_Connect(fd, addr, timeout);
  }
  return ret;
}

PRStatus FirefoxHook::PR_GetConnectStatus(const PRPollDesc *pd) {
  PRStatus ret = PR_FAILURE;
  if (_PR_GetConnectStatus) {
    WptTrace(loglevel::kProcess, _T("[wpthook] Call _PR_GetConnectStatus\n"));
    fprintf(_fp, "_PR_GetConnectStatus.\n");
    //fwrite(_fp);
    ret = _PR_GetConnectStatus(pd);
  }
  return ret;
}

PRAddrInfo* FirefoxHook::PR_GetAddrInfoByName(const char *hostname, PRUint16 af, PRIntn flags) {
  PRAddrInfo* ret = NULL;
  if (_PR_GetAddrInfoByName) {
    WptTrace(loglevel::kProcess, _T("[wpthook] Call _PR_GetAddrInfoByName\n"));
    fprintf(_fp, "_PR_GetAddrInfoByName(%s).\n", hostname);
    ret = _PR_GetAddrInfoByName(hostname, af, flags);
  }
  return ret;
}

PRStatus FirefoxHook::PR_GetHostByName(const char *hostname, char *buf, PRIntn bufsize, PRHostEnt *hostentry) {
  PRStatus ret = PR_FAILURE;
  if (_PR_GetHostByName) {
    WptTrace(loglevel::kProcess, _T("[wpthook] Call _PR_GetHostByName\n"));
    fprintf(_fp, "_PR_GetHostByName(%s).\n", hostname);
    ret = _PR_GetHostByName(hostname, buf, bufsize, hostentry);
  }
  return ret;
}
