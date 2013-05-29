#include "StdAfx.h"
#include "hook_dx9.h"

static Dx9Hook *g_hook = NULL;

IDirect3D9 * __stdcall Direct3DCreate9_Hook(UINT SDKVersion) {
  return g_hook ? g_hook->Direct3DCreate9(SDKVersion) : NULL;
}

HRESULT __stdcall Direct3DCreate9Ex_Hook(UINT SDKVersion,
                                         IDirect3D9Ex **ppD3D) {
  return g_hook ? g_hook->Direct3DCreate9Ex(SDKVersion, ppD3D) :
                  D3DERR_NOTAVAILABLE;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Dx9Hook::Dx9Hook(void):
  hook_(NULL)
  , Direct3DCreate9_(NULL)
  , Direct3DCreate9Ex_(NULL) {
  paint_msg_ = RegisterWindowMessage(_T("WPT Browser Paint"));
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Dx9Hook::~Dx9Hook(void) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Dx9Hook::Init() {
  if (hook_ || g_hook)
    return;
  hook_ = new NCodeHookIA32();
  g_hook = this;
  Direct3DCreate9_ = hook_->createHookByName("d3d9.dll", "Direct3DCreate9",
                                             Direct3DCreate9_Hook);
  Direct3DCreate9Ex_ = hook_->createHookByName("d3d9.dll", "Direct3DCreate9Ex",
                                             Direct3DCreate9Ex_Hook);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Dx9Hook::Unload() {
  if (g_hook == this)
    g_hook = NULL;
  if (hook_)
    delete hook_;
  hook_ = NULL;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
IDirect3D9 * Dx9Hook::Direct3DCreate9(UINT SDKVersion) {
  IDirect3D9 * ret = NULL;
  //OutputDebugStringA("Direct3DCreate9");
  if (Direct3DCreate9_)
    ret = Direct3DCreate9_(SDKVersion);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HRESULT Dx9Hook::Direct3DCreate9Ex(UINT SDKVersion, IDirect3D9Ex **ppD3D) {
  HRESULT ret = D3DERR_NOTAVAILABLE;
  //OutputDebugStringA("Direct3DCreate9Ex");
  if (Direct3DCreate9Ex_)
    ret = Direct3DCreate9Ex_(SDKVersion, ppD3D);
  return ret;
}
