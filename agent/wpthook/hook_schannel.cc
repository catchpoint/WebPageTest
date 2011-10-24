#include "StdAfx.h"
#include "request.h"
#include "test_state.h"
#include "track_sockets.h"
#include "hook_schannel.h"

static SchannelHook* g_hook = NULL;

// Stub Functions
SECURITY_STATUS SEC_ENTRY AcquireCredentialsHandleW_Hook(LPWSTR pszPrincipal,
    LPWSTR pszPackage, unsigned long fCredentialUse,
    void * pvLogonId, void * pAuthData, SEC_GET_KEY_FN pGetKeyFn,
    void * pvGetKeyArgument, PCredHandle phCredential, PTimeStamp ptsExpiry) {
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  if (g_hook)
    ret = g_hook->AcquireCredentialsHandleW(pszPrincipal, pszPackage, 
            fCredentialUse, pvLogonId, pAuthData, pGetKeyFn, pvGetKeyArgument,
            phCredential, ptsExpiry);
  return ret;
}

SECURITY_STATUS SEC_ENTRY AcquireCredentialsHandleA_Hook(LPSTR pszPrincipal,
    LPSTR pszPackage, unsigned long fCredentialUse,
    void * pvLogonId, void * pAuthData, SEC_GET_KEY_FN pGetKeyFn,
    void * pvGetKeyArgument, PCredHandle phCredential, PTimeStamp ptsExpiry) {
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  if (g_hook)
    ret = g_hook->AcquireCredentialsHandleA(pszPrincipal, pszPackage, 
            fCredentialUse, pvLogonId, pAuthData, pGetKeyFn, pvGetKeyArgument,
            phCredential, ptsExpiry);
  return ret;
}

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

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SchannelHook::SchannelHook(TrackSockets& sockets, TestState& test_state):
  _hook(NULL)
  ,_sockets(sockets)
  ,_test_state(test_state)
  ,_AcquireCredentialsHandleW(NULL)
  ,_AcquireCredentialsHandleA(NULL)
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
  WptTrace(loglevel::kProcess, _T("[wpthook] SchannelHook::Init()\n"));
  _AcquireCredentialsHandleW = _hook->createHookByName(
      "secur32.dll", "AcquireCredentialsHandleW", 
      AcquireCredentialsHandleW_Hook);
  _AcquireCredentialsHandleA = _hook->createHookByName(
      "secur32.dll", "AcquireCredentialsHandleA", 
      AcquireCredentialsHandleA_Hook);
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
SECURITY_STATUS SchannelHook::AcquireCredentialsHandleW(LPWSTR pszPrincipal,
    LPWSTR pszPackage, unsigned long fCredentialUse,
    void * pvLogonId, void * pAuthData, SEC_GET_KEY_FN pGetKeyFn,
    void * pvGetKeyArgument, PCredHandle phCredential, PTimeStamp ptsExpiry) {
  WptTrace(loglevel::kProcess, _T("[wpthook] SchannelHook::AcquireCredentialsHandleW()\n"));
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  if (_AcquireCredentialsHandleW) {
    ret = _AcquireCredentialsHandleW(pszPrincipal, pszPackage, 
            fCredentialUse, pvLogonId, pAuthData, pGetKeyFn, pvGetKeyArgument,
            phCredential, ptsExpiry);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SECURITY_STATUS SchannelHook::AcquireCredentialsHandleA(LPSTR pszPrincipal,
    LPSTR pszPackage, unsigned long fCredentialUse,
    void * pvLogonId, void * pAuthData, SEC_GET_KEY_FN pGetKeyFn,
    void * pvGetKeyArgument, PCredHandle phCredential, PTimeStamp ptsExpiry) {
  WptTrace(loglevel::kProcess, _T("[wpthook] SchannelHook::AcquireCredentialsHandleA()\n"));
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  if (_AcquireCredentialsHandleA) {
    ret = _AcquireCredentialsHandleA(pszPrincipal, pszPackage, 
            fCredentialUse, pvLogonId, pAuthData, pGetKeyFn, pvGetKeyArgument,
            phCredential, ptsExpiry);
  }
  return ret;
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
  WptTrace(loglevel::kProcess, _T("[wpthook] SchannelHook::InitializeSecurityContextW()\n"));
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  if (_InitializeSecurityContextW) {
    ret = _InitializeSecurityContextW(phCredential, phContext,
            pszTargetName, fContextReq, Reserved1, TargetDataRep, pInput,
            Reserved2, phNewContext, pOutput, pfContextAttr, ptsExpiry);
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
  WptTrace(loglevel::kProcess, _T("[wpthook] SchannelHook::InitializeSecurityContextA()\n"));
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  if (_InitializeSecurityContextA) {
    ret = _InitializeSecurityContextA(phCredential, phContext,
            pszTargetName, fContextReq, Reserved1, TargetDataRep, pInput,
            Reserved2, phNewContext, pOutput, pfContextAttr, ptsExpiry);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SECURITY_STATUS SchannelHook::DeleteSecurityContext(PCtxtHandle phContext) {
  WptTrace(loglevel::kProcess, _T("[wpthook] SchannelHook::DeleteSecurityContext()\n"));
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  if (_DeleteSecurityContext) {
    ret = _DeleteSecurityContext(phContext);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SECURITY_STATUS SchannelHook::EncryptMessage(PCtxtHandle phContext, 
    unsigned long fQOP, PSecBufferDesc pMessage, unsigned long MessageSeqNo) {
  WptTrace(loglevel::kProcess, _T("[wpthook] SchannelHook::EncryptMessage()\n"));
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  if (_EncryptMessage) {
    ret = _EncryptMessage(phContext, fQOP, pMessage, MessageSeqNo);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SECURITY_STATUS SchannelHook::DecryptMessage(PCtxtHandle phContext, 
    PSecBufferDesc pMessage,unsigned long MessageSeqNo,unsigned long * pfQOP) {
  WptTrace(loglevel::kProcess, _T("[wpthook] SchannelHook::DecryptMessage()\n"));
  SECURITY_STATUS ret = SEC_E_INTERNAL_ERROR;
  if (_DecryptMessage) {
    ret = _DecryptMessage(phContext, pMessage, MessageSeqNo, pfQOP);
  }
  return ret;
}
