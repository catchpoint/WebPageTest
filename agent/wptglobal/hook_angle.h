#pragma once
#include "../wpthook/ncodehook/NCodeHookInstantiation.h"

typedef unsigned int(__stdcall * LPEGLSWAPBUFFERS)(void * dpy, void * surface);

class AngleHook {
public:
  AngleHook(void);
  ~AngleHook(void);

  void Init();
  void Unload();

  unsigned int eglSwapBuffers(void * dpy, void * surface);

private:
  NCodeHookIA32*    hook_;
  UINT              paint_msg_;
  LPEGLSWAPBUFFERS  eglSwapBuffers_;
};

