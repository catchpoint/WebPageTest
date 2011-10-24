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

  SECURITY_STATUS AcquireCredentialsHandleW(LPWSTR pszPrincipal,
      LPWSTR pszPackage, unsigned long fCredentialUse,
      void * pvLogonId, void * pAuthData, SEC_GET_KEY_FN pGetKeyFn,
      void * pvGetKeyArgument, PCredHandle phCredential, PTimeStamp ptsExpiry);
  SECURITY_STATUS AcquireCredentialsHandleA(LPSTR pszPrincipal,
      LPSTR pszPackage, unsigned long fCredentialUse,
      void * pvLogonId, void * pAuthData, SEC_GET_KEY_FN pGetKeyFn,
      void * pvGetKeyArgument, PCredHandle phCredential, PTimeStamp ptsExpiry);
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
  ACQUIRE_CREDENTIALS_HANDLE_FN_W _AcquireCredentialsHandleW;
  ACQUIRE_CREDENTIALS_HANDLE_FN_A _AcquireCredentialsHandleA;
  INITIALIZE_SECURITY_CONTEXT_FN_W  _InitializeSecurityContextW;
  INITIALIZE_SECURITY_CONTEXT_FN_A  _InitializeSecurityContextA;
  DELETE_SECURITY_CONTEXT_FN  _DeleteSecurityContext;
  DECRYPT_MESSAGE_FN  _DecryptMessage;
  ENCRYPT_MESSAGE_FN  _EncryptMessage;
};

