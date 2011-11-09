/*
x86defs.c

diStorm3 - Powerful disassembler for X86/AMD64
http://ragestorm.net/distorm/
distorm at gmail dot com
Copyright (C) 2010  Gil Dabah

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
#include "../mnemonics.h"


_InstInfo II_arpl = {INT_INFO, ISC_INTEGER << 3, OT_REG16, OT_RM16, I_ARPL, INST_MODRM_REQUIRED};
/*
 * MOVSXD is now being decoded properly, definition was incorrect.
 * AMD64: movsxd Gv, Ed
 * Intel: movsxd Gv, Ev
 * Decided on: (OT_REG_FULL, OT_RM_FULL)
 */
_InstInfoEx II_movsxd = {INT_INFO, ISC_INTEGER << 3, OT_RM_FULL, OT_REG_FULL, I_MOVSXD, INST_MODRM_REQUIRED | INST_PRE_REX | INST_64BITS, 0, OT_NONE, OT_NONE, 0, 0};

_InstInfo II_nop = {INT_INFO, ISC_INTEGER << 3, OT_NONE, OT_NONE, I_NOP, INST_FLAGS_NONE};

_InstInfo II_pause = {INT_INFO, ISC_INTEGER << 3, OT_NONE, OT_NONE, I_PAUSE, INST_FLAGS_NONE};
