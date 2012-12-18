#pragma once 

#include <iostream>
#include <set>
#include <map>
#include "NCodeHookItem.h"
#include "distorm.h"

class ArchitectureCommon
{
public:
	ArchitectureCommon() {};
	~ArchitectureCommon() {};

	template <typename ArchT>
	int getMinOffset(const unsigned char* codePtr, unsigned int jumpPatchSize)
	{
		const unsigned int MaxInstructions = 20;
		_DecodeResult result;
		_DecodedInst instructions[MaxInstructions];
		unsigned int instructionCount = 0;

		result = distorm_decode(0, codePtr, 20, ArchT::DisasmType, instructions, MaxInstructions, &instructionCount);
		if (result != DECRES_SUCCESS) return -1;

		int offset = 0;
		for (unsigned int i = 0; offset < jumpPatchSize && i < instructionCount; ++i)
			offset += instructions[i].size;
		// if we were unable to disassemble enough instructions we fail
		if (offset < ArchT::NearJumpPatchSize) return -1;

		return offset;
	}

	virtual bool requiresAbsJump(uintptr_t from, uintptr_t to) 
	{
		uintptr_t jmpDistance = from > to ? from - to : to - from;
		return jmpDistance <= 0x7FFF0000 ? false : true;
	};

	virtual void writeJump(uintptr_t from, uintptr_t to)
	{
		if (requiresAbsJump(from, to)) writeAbsJump(from, to);
		else writeNearJump(from, to);
	}

	virtual void writeNearJump(uintptr_t from, uintptr_t to) =0;
	virtual void writeAbsJump(uintptr_t from, uintptr_t to) =0;
};

class ArchitectureIA32 : public ArchitectureCommon
{
public:
	ArchitectureIA32() {};
	~ArchitectureIA32() {};

	static const _DecodeType DisasmType = Decode32Bits;
	static const unsigned int NearJumpPatchSize = sizeof(int) + 1;
	static const unsigned int AbsJumpPatchSize = sizeof(uintptr_t) * 2 + 2;
	// max trampoline size = longest instruction (6) starting 1 byte before jump patch boundary
	static const unsigned int MaxTrampolineSize = AbsJumpPatchSize - 1 + 6;

	void writeNearJump(uintptr_t from, uintptr_t to)
	{
		unsigned char opcodes[NearJumpPatchSize];
		int offset = (int)(to - from - NearJumpPatchSize);
		opcodes[0] = 0xE9;
		*((int*)&opcodes[1]) = offset;
		memcpy((void*)from, opcodes, NearJumpPatchSize);
	}

	void writeAbsJump(uintptr_t from, uintptr_t to)
	{
		unsigned char opcodes[AbsJumpPatchSize];
		opcodes[0] = 0xFF;
		opcodes[1] = 0x25;
		*((uintptr_t*)&opcodes[2]) = from + 6;
		*((uintptr_t*)&opcodes[6]) = to;
		memcpy((void*)from, opcodes, AbsJumpPatchSize);
	}
};

class ArchitectureX64 : public ArchitectureIA32
{
public:
	ArchitectureX64() {};
	~ArchitectureX64() {};

	static const _DecodeType DisasmType = Decode64Bits;
	static const unsigned int NearJumpPatchSize = sizeof(int) + 1;
	static const unsigned int AbsJumpPatchSize = 2 * sizeof(uintptr_t) + 2;
	static const unsigned int MaxTrampolineSize = AbsJumpPatchSize - 1 + 6;

	void writeAbsJump(uintptr_t from, uintptr_t to)
	{
		unsigned char opcodes[AbsJumpPatchSize];
		opcodes[0] = 0xFF;
		opcodes[1] = 0x25;
		*((int*)&opcodes[2]) = 0;
		*((uintptr_t*)&opcodes[6]) = to;
		memcpy((void*)from, opcodes, AbsJumpPatchSize);
	};
};

template <typename ArchT>
class NCodeHook
{
public:

	NCodeHook(bool cleanOnDestruct=true);
	~NCodeHook();

	template <typename U> U createHook(U originalFunc, U hookFunc);
	template <typename U> U createHookByName(const std::string& dll, const std::string& funcName, U newFunc);
	template <typename U> bool removeHook(U address);

	void forceAbsoluteJumps(bool value) { forceAbsJmp_ = value; }

private:
	// get rid of useless compiler warning C4512 by making operator= private
	NCodeHook& operator=(const NCodeHook&);

	uintptr_t getFreeTrampoline();
	bool removeHook(NCodeHookItem item);
	int getMinOffset(const unsigned char* codePtr, unsigned int jumpPatchSize);
	bool isBranch(const char* instr);
	std::set<uintptr_t> freeTrampolines_;
	std::map<uintptr_t, NCodeHookItem> hookedFunctions_;
	void* trampolineBuffer_;
	const unsigned int MaxTotalTrampolineSize;
	bool cleanOnDestruct_;
	ArchT architecture_;
	bool forceAbsJmp_;
};