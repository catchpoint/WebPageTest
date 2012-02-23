/******************************************************************************
Copyright (c) 2010, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the <ORGANIZATION> nor the names of its contributors 
    may be used to endorse or promote products derived from this software 
    without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE 
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
******************************************************************************/

#include "stdafx.h"
#include "ipfw.h"
#include "ipfw_int.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CIpfw::CIpfw(void):
	hDriver(INVALID_HANDLE_VALUE) {
	hDriver = CreateFile (_T("\\\\.\\Ipfw"), GENERIC_READ | GENERIC_WRITE, 0, 
                             NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
	if (hDriver != INVALID_HANDLE_VALUE)	{
		AtlTrace(_T("Connected to IPFW"));
	} else {
		AtlTrace(_T("Could not connect to IPFW"));
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CIpfw::~CIpfw(void) {
	if (hDriver != INVALID_HANDLE_VALUE)
		CloseHandle(hDriver);
}

void DumpBuff(const unsigned char * buff, unsigned long len) {
	CString out, tmp;
	if (buff && len) {
		int count = 0;
		while (len) {
			unsigned char cval = *buff;
			unsigned int val = cval;
			if( !count )
				out += _T("\n    ");
			tmp.Format(_T("%02X "),val);
			out += tmp;

			count++;
			buff++;
			if( count >= 8 )
				count = 0;
			len--;
		}
	}

	AtlTrace(out);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CIpfw::Set(int cmd, void * data, size_t len) {
	bool ret = false;

	if (hDriver != INVALID_HANDLE_VALUE) {
		size_t size = sizeof(struct sockopt) + len;
		struct sockopt * s = (struct sockopt *)malloc(size);
		if (s) {
			s->sopt_dir = SOPT_SET;
			s->sopt_name = cmd;
			s->sopt_valsize = len;
			s->sopt_val = (void *)(s+1);

			memcpy(s->sopt_val, data, len);

			DWORD n;
			if (DeviceIoControl(hDriver, IP_FW_SETSOCKOPT,s,size, s, size, &n, NULL))
				ret = true;

			free(s);
		}
	}

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CIpfw::Get(int cmd, void * data, size_t &len) {
	bool ret = false;

	if (hDriver != INVALID_HANDLE_VALUE) {
		size_t size = sizeof(struct sockopt) + len;
		struct sockopt * s = (struct sockopt *)malloc(size);
		if (s) {
			s->sopt_dir = SOPT_GET;
			s->sopt_name = cmd;
			s->sopt_valsize = len;
			s->sopt_val = (void *)(s+1);

			memcpy(s->sopt_val, data, len);

			DWORD n;
			if (DeviceIoControl(hDriver,IP_FW_GETSOCKOPT,s,size,s,size, &n, NULL)) {
				if (s->sopt_valsize <= len) {
					len = s->sopt_valsize;
					if( len > 0 )
						memcpy(data, s->sopt_val, len);
					ret = true;
				}
			}

			free(s);
		}
	}

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CIpfw::Flush() {
	bool ret = false;

	if (hDriver != INVALID_HANDLE_VALUE) {
		// Flush both dummynet and IPFW
		ret = Set(IP_FW_FLUSH, NULL, 0);

		if( ret ) {
			AtlTrace(_T("IPFW flushed"));
    }
	}

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CIpfw::CreatePipe(unsigned int num, unsigned long bandwidth, 
                        unsigned long delay, double plr) {
	bool ret = false;

	if (hDriver != INVALID_HANDLE_VALUE) {
		#pragma pack(push)
		#pragma pack(1)
		struct {
			struct dn_id	header;
			struct dn_sch	sch;
			struct dn_link	link;
			struct dn_fs	fs;
		} cmd;
		#pragma pack(pop)

		memset(&cmd, 0, sizeof(cmd));

		cmd.header.len = sizeof(cmd.header);
		cmd.header.type = DN_CMD_CONFIG;
		cmd.header.id = DN_API_VERSION;

		// scheduler
		cmd.sch.oid.len = sizeof(cmd.sch);
		cmd.sch.oid.type = DN_SCH;
		cmd.sch.sched_nr = num;
		cmd.sch.oid.subtype = 0;	/* defaults to WF2Q+ */
		cmd.sch.flags = DN_PIPE_CMD;

		// link
		cmd.link.oid.len = sizeof(cmd.link);
		cmd.link.oid.type = DN_LINK;
		cmd.link.link_nr = num;
		cmd.link.bandwidth = bandwidth;
		cmd.link.delay = delay;

		// flowset
		cmd.fs.oid.len = sizeof(cmd.fs);
		cmd.fs.oid.type = DN_FS;
		cmd.fs.fs_nr = num + 2*DN_MAX_ID;
		cmd.fs.sched_nr = num + DN_MAX_ID;
		for(int j = 0; j < _countof(cmd.fs.par); j++)
			cmd.fs.par[j] = -1;
		if( plr > 0 && plr <= 1.0 )
			cmd.fs.plr = (int)(plr*0x7fffffff);

		ret = Set(IP_DUMMYNET3, &cmd, sizeof(cmd));

		if (ret) {
			AtlTrace(_T("Pipe created"));
    }
	}

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CIpfw::DeletePipe(unsigned int num) {
	bool ret = false;

	if (hDriver != INVALID_HANDLE_VALUE) {
		#pragma pack(push)
		#pragma pack(1)
		struct {
			struct dn_id oid;
			uintptr_t a[1];	/* add more if we want a list */
		} cmd;
		#pragma pack(pop)

		cmd.oid.len = sizeof(cmd);
		cmd.oid.type = DN_CMD_DELETE;
		cmd.oid.subtype = DN_LINK;
		cmd.oid.id = DN_API_VERSION;

		cmd.a[0] = num;

		ret = Set(IP_DUMMYNET3, &cmd, sizeof(cmd));

		if (ret) {
			AtlTrace(_T("Pipe deleted"));
    }
	}

	return ret;
}
