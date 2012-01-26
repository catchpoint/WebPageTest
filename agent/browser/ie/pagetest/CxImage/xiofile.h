#if !defined(__xiofile_h)
#define __xiofile_h

#include "xfile.h"
//#include <TCHAR.h>

class DLL_EXP CxIOFile : public CxFile
	{
public:
	CxIOFile(FILE* fp = NULL)
	{
		m_fp = fp;
		m_bCloseFile = (bool)(fp==0);
	}

	~CxIOFile()
	{
		Close();
	}
//////////////////////////////////////////////////////////
	bool Open(const TCHAR * filename, const TCHAR * mode)
	{
		if (m_fp) return false;	// Can't re-open without closing first

		m_fp = _tfopen(filename, mode);
		if (!m_fp) return false;

		m_bCloseFile = true;

		return true;
	}
//////////////////////////////////////////////////////////
	virtual bool Close()
	{
		int32_t iErr = 0;
		if ( (m_fp) && (m_bCloseFile) ){ 
			iErr = fclose(m_fp);
			m_fp = NULL;
		}
		return (bool)(iErr==0);
	}
//////////////////////////////////////////////////////////
	virtual size_t	Read(void *buffer, size_t size, size_t count)
	{
		if (!m_fp) return 0;
		return fread(buffer, size, count, m_fp);
	}
//////////////////////////////////////////////////////////
	virtual size_t	Write(const void *buffer, size_t size, size_t count)
	{
		if (!m_fp) return 0;
		return fwrite(buffer, size, count, m_fp);
	}
//////////////////////////////////////////////////////////
	virtual bool Seek(int32_t offset, int32_t origin)
	{
		if (!m_fp) return false;
		return (bool)(fseek(m_fp, offset, origin) == 0);
	}
//////////////////////////////////////////////////////////
	virtual int32_t Tell()
	{
		if (!m_fp) return 0;
		return ftell(m_fp);
	}
//////////////////////////////////////////////////////////
	virtual int32_t	Size()
	{
		if (!m_fp) return -1;
		int32_t pos,size;
		pos = ftell(m_fp);
		fseek(m_fp, 0, SEEK_END);
		size = ftell(m_fp);
		fseek(m_fp, pos,SEEK_SET);
		return size;
	}
//////////////////////////////////////////////////////////
	virtual bool	Flush()
	{
		if (!m_fp) return false;
		return (bool)(fflush(m_fp) == 0);
	}
//////////////////////////////////////////////////////////
	virtual bool	Eof()
	{
		if (!m_fp) return true;
		return (bool)(feof(m_fp) != 0);
	}
//////////////////////////////////////////////////////////
	virtual int32_t	Error()
	{
		if (!m_fp) return -1;
		return ferror(m_fp);
	}
//////////////////////////////////////////////////////////
	virtual bool PutC(uint8_t c)
	{
		if (!m_fp) return false;
		return (bool)(fputc(c, m_fp) == c);
	}
//////////////////////////////////////////////////////////
	virtual int32_t	GetC()
	{
		if (!m_fp) return EOF;
		return getc(m_fp);
	}
//////////////////////////////////////////////////////////
	virtual char *	GetS(char *string, int32_t n)
	{
		if (!m_fp) return NULL;
		return fgets(string,n,m_fp);
	}
//////////////////////////////////////////////////////////
	virtual int32_t	Scanf(const char *format, void* output)
	{
		if (!m_fp) return EOF;
		return fscanf(m_fp, format, output);
	}
//////////////////////////////////////////////////////////
protected:
	FILE *m_fp;
	bool m_bCloseFile;
	};

#endif
