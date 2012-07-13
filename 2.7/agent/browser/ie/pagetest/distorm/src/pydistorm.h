/*
pydistorm.h

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


#ifndef PYDISTORM_H
#define PYDISTORM_H

#ifdef SUPPORT_64BIT_OFFSET
/*
 * PyArg_ParseTuple/Py_BuildValue uses a format string in order to parse/build the offset.
 * type: int 64
 */
	#define _PY_OFF_INT_SIZE_ "K"
#else
	#define _PY_OFF_INT_SIZE_ "k"
#endif

#include "decoder.h"

#include <Python.h>

PyObject* distorm_Decompose(PyObject* pSelf, PyObject* pArgs);

char distorm_Decompose_DOCSTR[] =
"Disassemble a given buffer to a list of structures that each describes an instruction.\r\n"
#ifdef SUPPORT_64BIT_OFFSET
	"Decompose(INT64 offset, string code, int type)\r\n"
#else
	"Decompose(unsigned long offset, string code, int type)\r\n"
#endif
"type:\r\n"
"	Decode16Bits - 16 bits decoding.\r\n"
"	Decode32Bits - 32 bits decoding.\r\n"
"	Decode64Bits - AMD64 decoding.\r\n"
"Returns a list of decomposed objects. Refer to diStorm3 documentation for learning how to use it.\r\n";

static PyMethodDef distormModulebMethods[] = {
    {"Decode", distorm_Decompose, METH_VARARGS, distorm_Decompose_DOCSTR},
    {NULL, NULL, 0, NULL}
};

#endif /* PYDISTORM_H */

