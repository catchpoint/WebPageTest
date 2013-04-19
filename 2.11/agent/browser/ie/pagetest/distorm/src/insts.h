/*
insts.h

diStorm3 - Powerful disassembler for X86/AMD64
http://ragestorm.net/distorm/
distorm at gmail dot com
Copyright (C) 2003-2012 Gil Dabah

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>
*/


#ifndef INSTS_H
#define INSTS_H

#include "instructions.h"


/* Flags Table */
extern _iflags FlagsTable[];

/* Root Trie DB */
extern _InstInfo InstInfos[];
extern _InstInfoEx InstInfosEx[];
extern _InstNode InstructionsTree[];

/* 3DNow! Trie DB */
extern _InstNode Table_0F_0F;
/* AVX related: */
extern _InstNode Table_0F, Table_0F_38, Table_0F_3A;

/* Helper tables for pesudo compare mnemonics. */
extern uint16_t CmpMnemonicOffsets[8]; /* SSE */
extern uint16_t VCmpMnemonicOffsets[32]; /* AVX */

#endif /* INSTS_H */
