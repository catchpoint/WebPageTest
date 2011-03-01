#include "stdafx.h"
#include "shared_mem.h"

#pragma once
#pragma data_seg (".shared")
HHOOK	shared_hook_handle = 0;
WCHAR  shared_results_file_base[MAX_PATH] = {NULL};
#pragma data_seg ()

#pragma comment(linker,"/SECTION:.shared,RWS")
