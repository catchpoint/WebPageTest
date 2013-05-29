#pragma once
#include "../wpthook/ncodehook/NCodeHookInstantiation.h"
#include <D3D9.h>

typedef IDirect3D9 *(__stdcall * LPDIRECT3DCREATE9)(UINT SDKVersion);
typedef HRESULT (__stdcall * LPDIRECT3DCREATE9EX)(UINT SDKVersion,
                                                  IDirect3D9Ex **ppD3D);

class Dx9Hook {
public:
  Dx9Hook(void);
  ~Dx9Hook(void);

  void Init();
  void Unload();

  IDirect3D9 * Direct3DCreate9(UINT SDKVersion);
  HRESULT Direct3DCreate9Ex(UINT SDKVersion, IDirect3D9Ex **ppD3D);

private:
  NCodeHookIA32*    hook_;
  UINT              paint_msg_;
  LPDIRECT3DCREATE9 Direct3DCreate9_;
  LPDIRECT3DCREATE9EX Direct3DCreate9Ex_;
};

