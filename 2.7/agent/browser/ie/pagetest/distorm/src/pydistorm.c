/*
pydistorm.c

diStorm3 Python Module Extension
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


#include "decoder.h"

#include "pydistorm.h"

/* PYTHON MODULE EXPORTS */
_DLLEXPORT_ void initdistorm3()
{
	PyObject* distormModule = Py_InitModule3("distorm3", distormModulebMethods, "diStorm3");
	PyModule_AddIntConstant(distormModule, "Decode16Bits", Decode16Bits);
	PyModule_AddIntConstant(distormModule, "Decode32Bits", Decode32Bits);
	PyModule_AddIntConstant(distormModule, "Decode64Bits", Decode64Bits);

	PyModule_AddIntConstant(distormModule, "O_NONE", O_NONE);
	PyModule_AddIntConstant(distormModule, "O_REG", O_REG);
	PyModule_AddIntConstant(distormModule, "O_IMM", O_IMM);
	PyModule_AddIntConstant(distormModule, "O_IMM1", O_IMM1);
	PyModule_AddIntConstant(distormModule, "O_IMM2", O_IMM2);
	PyModule_AddIntConstant(distormModule, "O_DISP", O_DISP);
	PyModule_AddIntConstant(distormModule, "O_SMEM", O_SMEM);
	PyModule_AddIntConstant(distormModule, "O_MEM", O_MEM);
	PyModule_AddIntConstant(distormModule, "O_PC", O_PC);
	PyModule_AddIntConstant(distormModule, "O_PTR", O_PTR);
	PyModule_AddIntConstant(distormModule, "FLAG_NOT_DECODABLE", FLAG_NOT_DECODABLE);
	PyModule_AddIntConstant(distormModule, "FLAG_LOCK", FLAG_LOCK);
	PyModule_AddIntConstant(distormModule, "FLAG_REPNZ", FLAG_REPNZ);
	PyModule_AddIntConstant(distormModule, "FLAG_REP", FLAG_REP);
	PyModule_AddIntConstant(distormModule, "FLAG_HINT_TAKEN", FLAG_HINT_TAKEN);
	PyModule_AddIntConstant(distormModule, "FLAG_HINT_NOT_TAKEN", FLAG_HINT_NOT_TAKEN);
	PyModule_AddIntConstant(distormModule, "R_NONE", (uint8_t)R_NONE);

	PyModule_AddIntConstant(distormModule, "OffsetTypeSize", sizeof(_OffsetType) * 8);
	PyModule_AddStringConstant(distormModule, "info", "diStorm3 v1.0\r\nCopyright (C) 2010, Gil Dabah\r\n\r\nhttp://ragestorm.net/distorm/\r\n");
}

/* A helper function to raise memory exception and kill decode. */
PyObject* raise_exc(PyObject* o1, PyObject* o2)
{
	Py_XDECREF(o1);
	Py_XDECREF(o2);
	PyErr_SetString(PyExc_MemoryError, "Not enough memory to create an item for describing the instruction.");
	return NULL;
}

#define MAX_INSTRUCTIONS 100
PyObject* distorm_Decompose(PyObject* pSelf, PyObject* pArgs)
{
	_CodeInfo ci;
	_DecodeResult res = DECRES_NONE;

	_DInst decodedInstructions[MAX_INSTRUCTIONS];
	unsigned int decodedInstructionsCount = 0, i = 0, j = 0, next = 0;

	PyObject *ret = NULL, *pyObj = NULL, *dtObj = NULL, *featObj = NULL, *opsObj = NULL, *o = NULL;

	pSelf = pSelf; /* UNREFERENCED_PARAMETER */

	/* Decode(int32/64 offset, string code, int type=Decode32Bits) */
	if (!PyArg_ParseTuple(pArgs, _PY_OFF_INT_SIZE_ "s#|OO", &ci.codeOffset, &ci.code, &ci.codeLen, &dtObj, &featObj)) return NULL;

	if (ci.code == NULL) {
		PyErr_SetString(PyExc_IOError, "Error while reading code buffer.");
		return NULL;
	}

	if (ci.codeLen < 0) {
		PyErr_SetString(PyExc_OverflowError, "Code length is too big.");
		return NULL;
	}

	/* Default parameter. */
	if (dtObj == NULL) ci.dt = Decode32Bits;
	else if (!PyInt_Check(dtObj)) {
		PyErr_SetString(PyExc_IndexError, "Third parameter must be either Decode16Bits, Decode32Bits or Decode64Bits (integer type).");
		return NULL;
	} else ci.dt = (_DecodeType)PyInt_AsUnsignedLongMask(dtObj);

	if ((ci.dt != Decode16Bits) && (ci.dt != Decode32Bits) && (ci.dt != Decode64Bits)) {
		PyErr_SetString(PyExc_IndexError, "Decoding-type must be either Decode16Bits, Decode32Bits or Decode64Bits.");
		return NULL;
	}

	/* Default parameter. */
	if (featObj == NULL) ci.features = 0;
	else if (!PyInt_Check(dtObj)) {
		PyErr_SetString(PyExc_IndexError, "Fourth parameter must be either features flags (integer type).");
		return NULL;
	} else ci.features = (_DecodeType)PyInt_AsUnsignedLongMask(featObj);


	/* Construct an empty list, which later will be filled with tuples of (offset, size, mnemonic, hex). */
	ret = PyList_New(0);
	if (ret == NULL) {
		PyErr_SetString(PyExc_MemoryError, "Not enough memory to initialize a list.");
		return NULL;
	}

	while (res != DECRES_SUCCESS) {
		res = decode_internal(&ci, FALSE, decodedInstructions, MAX_INSTRUCTIONS, &decodedInstructionsCount);

		if ((res == DECRES_MEMORYERR) && (decodedInstructionsCount == 0)) break;

		for (i = 0; i < decodedInstructionsCount; i++) {
			opsObj = NULL;
			for (j = 0; j < OPERANDS_NO && decodedInstructions[i].flags != FLAG_NOT_DECODABLE; j++) {
				if (decodedInstructions[i].ops[j].type != O_NONE) {
					if (opsObj == NULL) {
						opsObj = PyList_New(0);
						if (opsObj == NULL) {
							PyErr_SetString(PyExc_MemoryError, "Not enough memory to allocate operands list.");
							Py_DECREF(ret);
							return NULL;
						}
					}
					pyObj = Py_BuildValue("{s:Bs:Hs:B}",
						"type", decodedInstructions[i].ops[j].type,
						"size", decodedInstructions[i].ops[j].size,
						"index", decodedInstructions[i].ops[j].index);
					if ((pyObj == NULL) || (PyList_Append(opsObj, pyObj) == -1)) {
						PyErr_SetString(PyExc_MemoryError, "Not enough memory to append an operand into the list.");
						Py_DECREF(ret);
						Py_DECREF(opsObj);
						return NULL;
					}
					Py_DECREF(pyObj);
				} else break;
			}
			pyObj = Py_BuildValue("{s:" _PY_OFF_INT_SIZE_ "s:Bs:Hs:Bs:is:Hs:Bs:Bs:Bs:Ks:Hs:B}",
			                      "addr",
			                      decodedInstructions[i].addr,
			                      "size",
			                      decodedInstructions[i].size,
			                      "flags",
			                      decodedInstructions[i].flags,
			                      "segment",
			                      SEGMENT_GET(decodedInstructions[i].segment),
								  "isSegmentDefault",
								  SEGMENT_IS_DEFAULT(decodedInstructions[i].segment),
			                      "opcode",
			                      decodedInstructions[i].opcode,
			                      "base",
			                      decodedInstructions[i].base,
			                      "scale",
			                      decodedInstructions[i].scale,
			                      "dispSize",
			                      decodedInstructions[i].dispSize,
			                      "disp",
			                      decodedInstructions[i].disp,
								  "unusedPrefixesMask",
								  decodedInstructions[i].unusedPrefixesMask,
								  "meta",
								  decodedInstructions[i].meta);
			if (opsObj != NULL) {
				PyDict_SetItemString(pyObj, "ops", opsObj);
				Py_DECREF(opsObj);
			}
			/* Handle the special case where the instruction wasn't decoded. */
			if (decodedInstructions[i].flags == FLAG_NOT_DECODABLE) {
				if ((o = PyLong_FromUnsignedLongLong(decodedInstructions[i].imm.byte)) == NULL) raise_exc(pyObj, ret);
				if (PyDict_SetItemString(pyObj, "imm", o) == -1) raise_exc(pyObj, ret);
				Py_XDECREF(o);
			}
			for (j = 0; j < OPERANDS_NO; j++) {
				/* Put dynamic immediate type. */
				switch (decodedInstructions[i].ops[j].type)
				{
					case O_IMM:
						if ((o = PyLong_FromUnsignedLongLong(decodedInstructions[i].imm.qword)) == NULL) raise_exc(pyObj, ret);
						if (PyDict_SetItemString(pyObj, "imm", o) == -1) raise_exc(pyObj, ret);
						Py_XDECREF(o);
					break;
					case O_IMM1:
						if ((o = PyLong_FromUnsignedLong(decodedInstructions[i].imm.ex.i1)) == NULL) raise_exc(pyObj, ret);
						if (PyDict_SetItemString(pyObj, "imm1", o)  == -1) raise_exc(pyObj, ret);
						Py_XDECREF(o);
					break;
					case O_IMM2:
						if ((o = PyLong_FromUnsignedLong(decodedInstructions[i].imm.ex.i2)) == NULL) raise_exc(pyObj, ret);
						if (PyDict_SetItemString(pyObj, "imm2", o) == -1) raise_exc(pyObj, ret);
						Py_XDECREF(o);
					break;
					case O_PTR:
						if ((o = PyLong_FromUnsignedLong(decodedInstructions[i].imm.ptr.seg)) == NULL) raise_exc(pyObj, ret);
						if (PyDict_SetItemString(pyObj, "seg", o) == -1) raise_exc(pyObj, ret);
						Py_XDECREF(o);
						if ((o = PyLong_FromUnsignedLong(decodedInstructions[i].imm.ptr.off)) == NULL) raise_exc(pyObj, ret);
						if (PyDict_SetItemString(pyObj, "off", o) == -1) raise_exc(pyObj, ret);
						Py_XDECREF(o);
					break;
					case O_PC:
						if ((o = PyLong_FromUnsignedLongLong(decodedInstructions[i].imm.qword)) == NULL) raise_exc(pyObj, ret);
						if (PyDict_SetItemString(pyObj, "imm", o) == -1) raise_exc(pyObj, ret);
						Py_XDECREF(o);
					break;
				}
			}
			if (pyObj == NULL) {
				Py_DECREF(ret);
				PyErr_SetString(PyExc_MemoryError, "Not enough memory to allocate an instruction.");
				return NULL;
			}
			if (PyList_Append(ret, pyObj) == -1) {
				Py_DECREF(pyObj);
				Py_DECREF(ret);
				PyErr_SetString(PyExc_MemoryError, "Not enough memory to append an instruction into the list.");
				return NULL;
			}
			Py_DECREF(pyObj);
		}

		/* Get offset difference. */
		next = (unsigned int)(decodedInstructions[decodedInstructionsCount-1].addr - ci.codeOffset);
		next += decodedInstructions[decodedInstructionsCount-1].size;

		/* Advance ptr and recalc offset. */
		ci.code += next;
		ci.codeLen -= next;
		ci.codeOffset += next;
	}

	return ret;
}
