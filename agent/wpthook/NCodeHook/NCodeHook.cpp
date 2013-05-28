#include "NCodeHook.h"
#include <Windows.h>

using namespace std;

// the disassembler needs at least 15
const unsigned int MaxInstructions = 20;

static const unsigned int TrampolineBufferSize = 4096;

template <typename ArchT>
NCodeHook<ArchT>::NCodeHook(bool cleanOnDestruct) :
	MaxTotalTrampolineSize(ArchT::AbsJumpPatchSize + ArchT::MaxTrampolineSize),
	cleanOnDestruct_(cleanOnDestruct),
	forceAbsJmp_(false)
{
	trampolineBuffer_ = VirtualAlloc(NULL, TrampolineBufferSize, MEM_COMMIT, PAGE_EXECUTE_READWRITE);
	if (trampolineBuffer_ == NULL) throw exception("Unable to allocate trampoline memory!");
	for (uintptr_t i=(uintptr_t)trampolineBuffer_; i<(uintptr_t)trampolineBuffer_+TrampolineBufferSize; i+=MaxTotalTrampolineSize)
		freeTrampolines_.insert(i);
}

template <typename ArchT>
NCodeHook<ArchT>::~NCodeHook()
{
	if (cleanOnDestruct_)
	{
		// restore all hooks and free memory
		for (size_t i = hookedFunctions_.size(); i > 0; --i) removeHook(hookedFunctions_[i - 1]);
		VirtualFree(trampolineBuffer_, 0, MEM_RELEASE);
	}
}

template <typename ArchT>
bool NCodeHook<ArchT>::isBranch(const char* instr)
{
	if (instr[0] == 'J' || strstr(instr, "CALL"))
		return true;
	else return false;
}

template <typename ArchT>
int NCodeHook<ArchT>::getMinOffset(const unsigned char* codePtr, unsigned int jumpPatchSize)
{
	_DecodeResult result;
	_DecodedInst instructions[MaxInstructions];
	unsigned int instructionCount = 0;

	result = distorm_decode(0, codePtr, 20, ArchT::DisasmType, instructions, MaxInstructions, &instructionCount);
	if (result != DECRES_SUCCESS) return -1;

	unsigned int offset = 0;
	for (unsigned int i = 0; offset < jumpPatchSize && i < instructionCount; ++i)
	{
		if (isBranch((const char*)instructions[i].mnemonic.p)) return -1;
		offset += instructions[i].size;
	}
	// if we were unable to disassemble enough instructions we fail
	if (offset < jumpPatchSize) return -1;

	return offset;
}

// create a new hook for "hookFunc" and return the trampoline which can be used to
// call the original function without the hook
template <typename ArchT>
template <typename U> 
U NCodeHook<ArchT>::createHook(U originalFunc, U hookFunc)
{
	// check if this function is already hooked
	map<uintptr_t, NCodeHookItem>::const_iterator cit = hookedFunctions_.begin();
	while(cit != hookedFunctions_.end())
	{
		if ((uintptr_t)cit->second.OriginalFunc == (uintptr_t)originalFunc) return (U)cit->second.Trampoline;
		++cit;
	}

	// choose jump patch method
	bool useAbsJump = forceAbsJmp_;
	int offset = 0;
	if (useAbsJump || architecture_.requiresAbsJump((uintptr_t)originalFunc, (uintptr_t)hookFunc))
	{
		offset = getMinOffset((const unsigned char*)originalFunc, ArchT::AbsJumpPatchSize);
		useAbsJump = true;
	}		
	else offset = getMinOffset((const unsigned char*)originalFunc, ArchT::NearJumpPatchSize);
	
	// error while determining offset?
	if (offset == -1) return false;

	DWORD oldProtect = 0;
	BOOL retVal = VirtualProtect((LPVOID)originalFunc, ArchT::MaxTrampolineSize, PAGE_EXECUTE_READWRITE, &oldProtect);
	if (!retVal) return false;

	// get trampoline memory and copy instructions to trampoline
	uintptr_t trampolineAddr = getFreeTrampoline();
	memcpy((void*)trampolineAddr, (void*)originalFunc, offset);
	if (useAbsJump)
	{
		architecture_.writeAbsJump((uintptr_t)originalFunc, (uintptr_t)hookFunc);
		architecture_.writeAbsJump(trampolineAddr + offset, (uintptr_t)originalFunc + offset);
	}
	else
	{
		architecture_.writeNearJump((uintptr_t)originalFunc, (uintptr_t)hookFunc);
		architecture_.writeNearJump(trampolineAddr + offset, (uintptr_t)originalFunc + offset);
	}

	DWORD dummy;
	VirtualProtect((LPVOID)originalFunc, ArchT::MaxTrampolineSize, oldProtect, &dummy);

	FlushInstructionCache(GetCurrentProcess(), (LPCVOID)trampolineAddr, MaxTotalTrampolineSize);
	FlushInstructionCache(GetCurrentProcess(), (LPCVOID)originalFunc, useAbsJump ? ArchT::AbsJumpPatchSize : ArchT::NearJumpPatchSize);
	
	NCodeHookItem item((uintptr_t)originalFunc, (uintptr_t)hookFunc, trampolineAddr, offset);
	hookedFunctions_.insert(make_pair((uintptr_t)hookFunc, item));

	return (U)trampolineAddr;
}

template <typename ArchT>
template <typename U> 
U NCodeHook<ArchT>::createHookByName(const string& dll, const string& funcName, U newFunc)
{
	U funcPtr = NULL;
	HMODULE hDll = LoadLibraryA(dll.c_str());
	funcPtr = (U)GetProcAddress(hDll, funcName.c_str());
	if (funcPtr != NULL) funcPtr = createHook(funcPtr, newFunc);
	//FreeLibrary(hDll);
	return funcPtr;
}

template <typename ArchT>
template <typename U>
bool NCodeHook<ArchT>::removeHook(U address)
{
	// remove hooked function again, address points to the HOOK function!
	map<uintptr_t, NCodeHookItem>::const_iterator result = hookedFunctions_.find((uintptr_t)address);
	if (result != hookedFunctions_.end())
		return removeHook(result->second);
	return true;
}

template <typename ArchT>
bool NCodeHook<ArchT>::removeHook(NCodeHookItem item)
{
	// copy overwritten instructions back to original function
	DWORD oldProtect;
	BOOL retVal = VirtualProtect((LPVOID)item.OriginalFunc, item.PatchSize, PAGE_EXECUTE_READWRITE, &oldProtect);
	if (!retVal) return false;
	memcpy((void*)item.OriginalFunc, (const void*)item.Trampoline, item.PatchSize);
	DWORD dummy;
	VirtualProtect((LPVOID)item.OriginalFunc, item.PatchSize, oldProtect, &dummy);
	
	hookedFunctions_.erase(item.HookFunc);
	freeTrampolines_.insert(item.Trampoline);
	FlushInstructionCache(GetCurrentProcess(), (LPCVOID)item.OriginalFunc, item.PatchSize);
	
	return true;
}

template <typename ArchT>
uintptr_t NCodeHook<ArchT>::getFreeTrampoline()
{
	if (freeTrampolines_.empty()) throw exception("No trampoline space available!");
	set<uintptr_t>::iterator it = freeTrampolines_.begin();
	uintptr_t result = *it;
	freeTrampolines_.erase(it);
	return result;
}