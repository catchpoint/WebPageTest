#include "StdAfx.h"
#include "SchannelHook.h"
#include "WatchDlg.h"

static SchannelHook* g_hook = NULL;

// Stub Functions

SECURITY_STATUS SEC_ENTRY InitializeSecurityContextW_Hook(
    PCredHandle phCredential,
    PCtxtHandle phContext, SEC_WCHAR * pszTargetName, 
    unsigned long fContextReq, unsigned long Reserved1,
    unsigned long TargetDataRep, PSecBufferDesc pInput,
    unsigned long Reserved2, PCtxtHandle phNewContext,
    PSecBufferDesc pOutput, unsigned long * pfContextAttr,
    PTimeStamp ptsExpiry) {
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  if (g_hook)
    ret = g_hook->InitializeSecurityContextW(phCredential, phContext,
            pszTargetName, fContextReq, Reserved1, TargetDataRep, pInput,
            Reserved2, phNewContext, pOutput, pfContextAttr, ptsExpiry);
  return ret;
}

SECURITY_STATUS SEC_ENTRY InitializeSecurityContextA_Hook(
    PCredHandle phCredential,
    PCtxtHandle phContext, SEC_CHAR * pszTargetName, 
    unsigned long fContextReq, unsigned long Reserved1,
    unsigned long TargetDataRep, PSecBufferDesc pInput,
    unsigned long Reserved2, PCtxtHandle phNewContext,
    PSecBufferDesc pOutput, unsigned long * pfContextAttr,
    PTimeStamp ptsExpiry) {
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  if (g_hook)
    ret = g_hook->InitializeSecurityContextA(phCredential, phContext,
            pszTargetName, fContextReq, Reserved1, TargetDataRep, pInput,
            Reserved2, phNewContext, pOutput, pfContextAttr, ptsExpiry);
  return ret;
}

SECURITY_STATUS SEC_ENTRY DeleteSecurityContext_Hook(PCtxtHandle phContext) {
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  if (g_hook) {
    ret = g_hook->DeleteSecurityContext(phContext);
  }
  return ret;
}

SECURITY_STATUS SEC_ENTRY EncryptMessage_Hook(PCtxtHandle phContext, 
    unsigned long fQOP, PSecBufferDesc pMessage, unsigned long MessageSeqNo) {
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  if (g_hook)
    ret = g_hook->EncryptMessage(phContext, fQOP, pMessage, MessageSeqNo);
  return ret;
}

SECURITY_STATUS SEC_ENTRY DecryptMessage_Hook(PCtxtHandle phContext, 
    PSecBufferDesc pMessage, unsigned long MessageSeqNo,
    unsigned long * pfQOP) {
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  if (g_hook)
    ret = g_hook->DecryptMessage(phContext, pMessage, MessageSeqNo, pfQOP);
  return ret;
}

void SchannelInstallHooks(void)
{
  SchannelHook * schannelHook = new SchannelHook();
  if (schannelHook) {
    schannelHook->Init();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SchannelHook::SchannelHook():
  _hook(NULL)
  ,_InitializeSecurityContextW(NULL)
  ,_InitializeSecurityContextA(NULL)
  ,_DecryptMessage(NULL)
  ,_EncryptMessage(NULL) {
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SchannelHook::~SchannelHook(void){
  if (g_hook == this) {
    g_hook = NULL;
  }
  delete _hook;  // remove all the hooks
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SchannelHook::Init() {
  if (_hook || g_hook) {
    return;
  }
  _hook = new NCodeHookIA32();
  g_hook = this;
  _InitializeSecurityContextW = _hook->createHookByName(
      "secur32.dll", "InitializeSecurityContextW", 
      InitializeSecurityContextW_Hook);
  _InitializeSecurityContextA = _hook->createHookByName(
      "secur32.dll", "InitializeSecurityContextA", 
      InitializeSecurityContextA_Hook);
  _DeleteSecurityContext = _hook->createHookByName(
      "secur32.dll", "DeleteSecurityContext", 
      DeleteSecurityContext_Hook);
  _DecryptMessage = _hook->createHookByName(
      "secur32.dll", "DecryptMessage", DecryptMessage_Hook);
  _EncryptMessage = _hook->createHookByName(
      "secur32.dll", "EncryptMessage", EncryptMessage_Hook);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SECURITY_STATUS SchannelHook::InitializeSecurityContextW(
    PCredHandle phCredential,
    PCtxtHandle phContext, SEC_WCHAR * pszTargetName, 
    unsigned long fContextReq, unsigned long Reserved1,
    unsigned long TargetDataRep, PSecBufferDesc pInput,
    unsigned long Reserved2, PCtxtHandle phNewContext,
    PSecBufferDesc pOutput, unsigned long * pfContextAttr,
    PTimeStamp ptsExpiry) {
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  fContextReq |= ISC_REQ_MANUAL_CRED_VALIDATION;
  if (_InitializeSecurityContextW) {
    ret = _InitializeSecurityContextW(phCredential, phContext,
            pszTargetName, fContextReq, Reserved1, TargetDataRep, pInput,
            Reserved2, phNewContext, pOutput, pfContextAttr, ptsExpiry);
    if (!phContext && phNewContext) {
    }
  }

  if (tlsIndex != TLS_OUT_OF_INDEXES)
    TlsSetValue(tlsIndex, phContext ? phContext : phNewContext);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SECURITY_STATUS SchannelHook::InitializeSecurityContextA(
    PCredHandle phCredential,
    PCtxtHandle phContext, SEC_CHAR * pszTargetName, 
    unsigned long fContextReq, unsigned long Reserved1,
    unsigned long TargetDataRep, PSecBufferDesc pInput,
    unsigned long Reserved2, PCtxtHandle phNewContext,
    PSecBufferDesc pOutput, unsigned long * pfContextAttr,
    PTimeStamp ptsExpiry) {
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  fContextReq |= ISC_REQ_MANUAL_CRED_VALIDATION;
  if (_InitializeSecurityContextA) {
    ret = _InitializeSecurityContextA(phCredential, phContext,
            pszTargetName, fContextReq, Reserved1, TargetDataRep, pInput,
            Reserved2, phNewContext, pOutput, pfContextAttr, ptsExpiry);
    if (!phContext && phNewContext) {
    }
  }
  if (tlsIndex != TLS_OUT_OF_INDEXES)
    TlsSetValue(tlsIndex, phContext ? phContext : phNewContext);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SECURITY_STATUS SchannelHook::DeleteSecurityContext(PCtxtHandle phContext) {
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  if (phContext) {
  }
  if (_DeleteSecurityContext) {
    ret = _DeleteSecurityContext(phContext);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SECURITY_STATUS SchannelHook::EncryptMessage(PCtxtHandle phContext, 
    unsigned long fQOP, PSecBufferDesc pMessage, unsigned long MessageSeqNo) {
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  SOCKET s = INVALID_SOCKET;
  if (dlg && phContext)
	  s = dlg->GetSchannelSocket(phContext);
  if (_EncryptMessage) {
    if (pMessage && dlg) {
      for (ULONG i = 0; i < pMessage->cBuffers; i++) {
        unsigned long len = pMessage->pBuffers[i].cbBuffer;
        if (pMessage->pBuffers[i].pvBuffer && len &&
            pMessage->pBuffers[i].BufferType == SECBUFFER_DATA) {
          dlg->ModifyDataOut((LPBYTE)pMessage->pBuffers[i].pvBuffer, pMessage->pBuffers[i].cbBuffer);
		    if (s != INVALID_SOCKET)
			    dlg->SocketSend(s, pMessage->pBuffers[i].cbBuffer, (LPBYTE)pMessage->pBuffers[i].pvBuffer );
        }
      }
    }
    ret = _EncryptMessage(phContext, fQOP, pMessage, MessageSeqNo);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SECURITY_STATUS SchannelHook::DecryptMessage(PCtxtHandle phContext, 
    PSecBufferDesc pMessage,unsigned long MessageSeqNo,unsigned long * pfQOP) {
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  SOCKET s = INVALID_SOCKET;
  if (dlg && phContext)
	  s = dlg->GetSchannelSocket(phContext);
  if (_DecryptMessage) {
    ret = _DecryptMessage(phContext, pMessage, MessageSeqNo, pfQOP);
    if (ret == SEC_E_OK && pMessage && dlg) {
      for (ULONG i = 0; i < pMessage->cBuffers; i++) {
        unsigned long len = pMessage->pBuffers[i].cbBuffer;
        if (pMessage->pBuffers[i].pvBuffer && len &&
            pMessage->pBuffers[i].BufferType == SECBUFFER_DATA &&
			      s != INVALID_SOCKET) {
			      dlg->SocketRecv(s, len, (LPBYTE)pMessage->pBuffers[i].pvBuffer );
        }
      }
    }
  }
  return ret;
}
