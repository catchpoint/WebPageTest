#pragma once
#include "log.h"

LONG WINAPI CrashFilter(struct _EXCEPTION_POINTERS* ExceptionInfo);

extern CLog * crashLog;
