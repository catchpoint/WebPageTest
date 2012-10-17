/*
x86defs.c

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


#include "x86defs.h"
#include "instructions.h"
#include "../include/mnemonics.h"


/*
 * The first field of an _InstInfo is the flagsInex, which goes into FlagsTable in insts.c
 * Since this table is auto generated in disOps, we have to make sure that the first 5 entries
 * are reserved for our use here.
 * The following defined inst-infos have to be synced manually every time you change insts.c.
 */

_InstInfo II_arpl = {0 /* INST_MODRM_REQUIRED */, OT_REG16, OT_RM16, ISC_INTEGER << 3, I_ARPL};
/*
 * MOVSXD:
 * This is the worst defined instruction ever. It has so many variations.
 * I decided after a third review, to make it like MOVSXD RAX, EAX when there IS a REX.W.
 * Otherwise it will be MOVSXD EAX, EAX, which really zero extends to RAX.
 * Completely ignoring DB 0x66, which is possible by the docs, BTW.
 */
_InstInfo II_movsxd = {1 /* INST_MODRM_REQUIRED | INST_PRE_REX | INST_64BITS */, OT_RM32, OT_REG32_64, ISC_INTEGER << 3, I_MOVSXD};

_InstInfo II_nop = {2 /* INST_FLAGS_NONE */, OT_NONE, OT_NONE, ISC_INTEGER << 3, I_NOP};

_InstInfo II_pause = {3 /* INST_FLAGS_NONE */, OT_NONE, OT_NONE, ISC_INTEGER << 3, I_PAUSE};

_InstInfo II_3dnow = {4 /* INST_32BITS | INST_MODRM_REQUIRED | INST_3DNOW_FETCH */, OT_MM64, OT_MM, ISC_3DNOW << 3, I_UNDEFINED};
