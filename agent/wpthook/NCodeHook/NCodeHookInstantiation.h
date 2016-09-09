#pragma once 
#include "NCodeHook.cpp"

#ifdef _WIN64
template class NCodeHook<ArchitectureX64>;
typedef NCodeHook<ArchitectureX64> CodeHook;
#else
template class NCodeHook<ArchitectureIA32>;
typedef NCodeHook<ArchitectureIA32> CodeHook;
#endif

template class NCodeHook<ArchitectureIA32>;
typedef NCodeHook<ArchitectureIA32> NCodeHookIA32;

template class NCodeHook<ArchitectureX64>;
typedef NCodeHook<ArchitectureX64> NCodeHookX64;