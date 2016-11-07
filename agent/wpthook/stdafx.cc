// stdafx.cpp : source file that includes just the standard includes
// wpthook.pch will be the pre-compiled header
// stdafx.obj will contain the pre-compiled type information

#include "stdafx.h"

FILE _iob[] = { *stdin, *stdout, *stderr }; 
extern "C" FILE * __cdecl __iob_func(void) { return _iob; }

// TODO: reference any additional headers you need in STDAFX.H
// and not in this file
