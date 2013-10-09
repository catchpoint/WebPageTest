#pragma once
#include "../wpthook/ncodehook/NCodeHookInstantiation.h"

typedef unsigned int(__stdcall * LPEGLSWAPBUFFERS)(void * dpy, void * surface);
typedef void(__stdcall * LPGLVIEWPORT)(int x, int y, int width, int height);

class AngleHook {
public:
  AngleHook(void);
  ~AngleHook(void);

  void Init();
  void Unload();

  unsigned int eglSwapBuffers(void * dpy, void * surface);
  void glViewport(int x, int y, int width, int height);

private:
  NCodeHookIA32*    hook_;
  UINT              paint_msg_;
  LPEGLSWAPBUFFERS  eglSwapBuffers_;
  LPGLVIEWPORT      glViewport_;
};

