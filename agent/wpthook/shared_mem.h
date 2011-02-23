/*-----------------------------------------------------------------------------
  Shared memory by the DLL loaded into both processes
-----------------------------------------------------------------------------*/

#pragma once
#pragma data_seg (".shared")
HHOOK	shared_hook_handle = 0;
#pragma data_seg ()

#pragma comment(linker,"/SECTION:.shared,RWS")
