#pragma once
#include "ncodehook/NCodeHookInstantiation.h"
#define SECURITY_WIN32
#include <Security.h>

class TestState;
class TrackSockets;

void SchannelInstallHooks();

class SchannelHook
{
public:
  SchannelHook();
  ~SchannelHook(void);
  void Init();

  SECURITY_STATUS InitializeSecurityContextW(PCredHandle phCredential,
      PCtxtHandle phContext, SEC_WCHAR * pszTargetName, 
      unsigned long fContextReq, unsigned long Reserved1,
      unsigned long TargetDataRep, PSecBufferDesc pInput,
      unsigned long Reserved2, PCtxtHandle phNewContext,
      PSecBufferDesc pOutput, unsigned long * pfContextAttr,
      PTimeStamp ptsExpiry);
  SECURITY_STATUS InitializeSecurityContextA(PCredHandle phCredential,
      PCtxtHandle phContext, SEC_CHAR * pszTargetName, 
      unsigned long fContextReq, unsigned long Reserved1,
      unsigned long TargetDataRep, PSecBufferDesc pInput,
      unsigned long Reserved2, PCtxtHandle phNewContext,
      PSecBufferDesc pOutput, unsigned long * pfContextAttr,
      PTimeStamp ptsExpiry);
  SECURITY_STATUS DeleteSecurityContext(PCtxtHandle phContext);
  SECURITY_STATUS EncryptMessage(PCtxtHandle phContext, unsigned long fQOP,
      PSecBufferDesc pMessage, unsigned long MessageSeqNo);
  SECURITY_STATUS DecryptMessage(PCtxtHandle phContext, 
      PSecBufferDesc pMessage, unsigned long MessageSeqNo,
      unsigned long * pfQOP);

private:
  NCodeHookIA32* _hook;

  // original functions
  INITIALIZE_SECURITY_CONTEXT_FN_W  _InitializeSecurityContextW;
  INITIALIZE_SECURITY_CONTEXT_FN_A  _InitializeSecurityContextA;
  DELETE_SECURITY_CONTEXT_FN  _DeleteSecurityContext;
  DECRYPT_MESSAGE_FN  _DecryptMessage;
  ENCRYPT_MESSAGE_FN  _EncryptMessage;
};

