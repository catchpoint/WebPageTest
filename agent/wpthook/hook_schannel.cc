#include "StdAfx.h"
#include "request.h"
#include "test_state.h"
#include "track_sockets.h"
#include "wpt_test_hook.h"
#include "hook_schannel.h"
#include "MinHook.h"

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

BOOL __stdcall CertVerifyCertificateChainPolicy_Hook(
    LPCSTR pszPolicyOID, PCCERT_CHAIN_CONTEXT pChainContext,
    PCERT_CHAIN_POLICY_PARA pPolicyPara,
    PCERT_CHAIN_POLICY_STATUS pPolicyStatus) {
  BOOL ret = FALSE;
  if (g_hook)
    ret = g_hook->CertVerifyCertificateChainPolicy(pszPolicyOID, pChainContext,
                                                   pPolicyPara, pPolicyStatus);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SchannelHook::SchannelHook(TrackSockets& sockets, TestState& test_state,
                           WptTestHook& test):
  _sockets(sockets)
  ,_test_state(test_state)
  ,_test(test)
  ,InitializeSecurityContextW_(NULL)
  ,InitializeSecurityContextA_(NULL)
  ,DecryptMessage_(NULL)
  ,EncryptMessage_(NULL)
  ,CertVerifyCertificateChainPolicy_(NULL) {
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SchannelHook::~SchannelHook(void){
  if (g_hook == this)
    g_hook = NULL;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SchannelHook::Init() {
  if (g_hook)
    return;
  g_hook = this;

  ATLTRACE("[wpthook] SchannelHook::Init()");

  LoadLibrary(_T("secur32.dll"));
  MH_CreateHookApi(L"secur32.dll", "InitializeSecurityContextW", InitializeSecurityContextW_Hook, (LPVOID *)&InitializeSecurityContextW_);
  MH_CreateHookApi(L"secur32.dll", "InitializeSecurityContextA", InitializeSecurityContextA_Hook, (LPVOID *)&InitializeSecurityContextA_);
  MH_CreateHookApi(L"secur32.dll", "DeleteSecurityContext", DeleteSecurityContext_Hook, (LPVOID *)&DeleteSecurityContext_);
  MH_CreateHookApi(L"secur32.dll", "DecryptMessage", DecryptMessage_Hook, (LPVOID *)&DecryptMessage_);
  MH_CreateHookApi(L"secur32.dll", "EncryptMessage", EncryptMessage_Hook, (LPVOID *)&EncryptMessage_);

  bool is_safari = false;
  TCHAR file_name[MAX_PATH];
  if (GetModuleFileName(NULL, file_name, _countof(file_name))) {
    CString exe(file_name);
    exe.MakeLower();
    if (exe.Find(_T("webkit2webprocess.exe")) >= 0)
      is_safari = true;
  }
  if (_test._ignore_ssl || is_safari) {
    LoadLibrary(_T("crypt32.dll"));
    MH_CreateHookApi(L"crypt32.dll", "CertVerifyCertificateChainPolicy", CertVerifyCertificateChainPolicy_Hook, (LPVOID *)&CertVerifyCertificateChainPolicy_);
  }

  MH_EnableHook(MH_ALL_HOOKS);
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
  if (InitializeSecurityContextW_) {
    ret = InitializeSecurityContextW_(phCredential, phContext,
            pszTargetName, fContextReq, Reserved1, TargetDataRep, pInput,
            Reserved2, phNewContext, pOutput, pfContextAttr, ptsExpiry);
    if (!phContext && phNewContext) {
      _sockets.SetSslFd(phNewContext);
    }
  }
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
  if (InitializeSecurityContextA_) {
    ret = InitializeSecurityContextA_(phCredential, phContext,
            pszTargetName, fContextReq, Reserved1, TargetDataRep, pInput,
            Reserved2, phNewContext, pOutput, pfContextAttr, ptsExpiry);
    if (!phContext && phNewContext) {
      _sockets.SetSslFd(phNewContext);
    }
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SECURITY_STATUS SchannelHook::DeleteSecurityContext(PCtxtHandle phContext) {
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  if (phContext) {
    _sockets.ClearSslFd(phContext);
  }
  if (DeleteSecurityContext_)
    ret = DeleteSecurityContext_(phContext);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SECURITY_STATUS SchannelHook::EncryptMessage(PCtxtHandle phContext, 
    unsigned long fQOP, PSecBufferDesc pMessage, unsigned long MessageSeqNo) {
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  if (EncryptMessage_) {
    SOCKET s = INVALID_SOCKET;
    _sockets.SslSocketLookup(phContext, s);
    if (pMessage && !_test_state._exit) {
      for (ULONG i = 0; i < pMessage->cBuffers; i++) {
        unsigned long len = pMessage->pBuffers[i].cbBuffer;
        if (pMessage->pBuffers[i].pvBuffer && len &&
            pMessage->pBuffers[i].BufferType == SECBUFFER_DATA) {
          DataChunk chunk((LPCSTR)pMessage->pBuffers[i].pvBuffer, len);
          // TODO, allow for actual modification of the buffer
          //if (_sockets.ModifyDataOut(s, chunk, true)) {
          //}
          _sockets.DataOut(s, chunk, true);
        }
      }
    }
    ret = EncryptMessage_(phContext, fQOP, pMessage, MessageSeqNo);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SECURITY_STATUS SchannelHook::DecryptMessage(PCtxtHandle phContext, 
    PSecBufferDesc pMessage,unsigned long MessageSeqNo,unsigned long * pfQOP) {
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  if (DecryptMessage_) {
    SOCKET s = INVALID_SOCKET;
    ret = DecryptMessage_(phContext, pMessage, MessageSeqNo, pfQOP);
    if (ret == SEC_E_OK && pMessage && !_test_state._exit) {
      if (_sockets.SslSocketLookup(phContext, s) && 
            s != INVALID_SOCKET) {
        for (ULONG i = 0; i < pMessage->cBuffers; i++) {
          unsigned long len = pMessage->pBuffers[i].cbBuffer;
          if (pMessage->pBuffers[i].pvBuffer && len &&
              pMessage->pBuffers[i].BufferType == SECBUFFER_DATA) {
            _sockets.DataIn(s, 
                      DataChunk((LPCSTR)pMessage->pBuffers[i].pvBuffer, len), 
                      true);
          }
        }
      }
    }
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL SchannelHook::CertVerifyCertificateChainPolicy(
  LPCSTR pszPolicyOID, PCCERT_CHAIN_CONTEXT pChainContext,
  PCERT_CHAIN_POLICY_PARA pPolicyPara,
  PCERT_CHAIN_POLICY_STATUS pPolicyStatus) {
  BOOL ret = TRUE;
  if (pPolicyStatus)
    pPolicyStatus->dwError = 0;
  return ret;
}
