#pragma once 
#include "NCodeHook.cpp"

template class NCodeHook<ArchitectureIA32>;
typedef NCodeHook<ArchitectureIA32> NCodeHookIA32;

template class NCodeHook<ArchitectureX64>;
typedef NCodeHook<ArchitectureX64> NCodeHookX64;