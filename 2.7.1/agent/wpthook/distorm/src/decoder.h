/*
decoder.h

Copyright (C) 2003-2009 Gil Dabah, http://ragestorm.net/distorm/
This file is licensed under the GPL license. See the file COPYING.
*/


#ifndef DECODER_H
#define DECODER_H

#include "config.h"

typedef unsigned int _iflags;

_DecodeResult decode_internal(_CodeInfo* ci, int supportOldIntr, _DInst result[], unsigned int maxResultCount, unsigned int* usedInstructionsCount);

#endif /* DECODER_H */
