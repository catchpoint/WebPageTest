#pragma once
#include "ncodehook/NCodeHookInstantiation.h"
#define SECURITY_WIN32
#include <Security.h>

class TestState;
class TrackSockets;

class SchannelHook
{
public:
  SchannelHook(TrackSockets& sockets, TestState& test_state);
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
  TestState& _test_state;
  TrackSockets& _sockets;
  NCodeHookIA32* _hook;

  // original functions
  INITIALIZE_SECURITY_CONTEXT_FN_W  InitializeSecurityContextW_;
  INITIALIZE_SECURITY_CONTEXT_FN_A  InitializeSecurityContextA_;
  DELETE_SECURITY_CONTEXT_FN  DeleteSecurityContext_;
  DECRYPT_MESSAGE_FN  DecryptMessage_;
  ENCRYPT_MESSAGE_FN  EncryptMessage_;
};

