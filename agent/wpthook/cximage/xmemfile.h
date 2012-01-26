#if !defined(__xmemfile_h)
#define __xmemfile_h

#include "xfile.h"

//////////////////////////////////////////////////////////
class DLL_EXP CxMemFile : public CxFile
{
public:
	CxMemFile(uint8_t* pBuffer = NULL, uint32_t size = 0);
	~CxMemFile();

	bool Open();
	uint8_t* GetBuffer(bool bDetachBuffer = true);

	virtual bool	Close();
	virtual size_t	Read(void *buffer, size_t size, size_t count);
	virtual size_t	Write(const void *buffer, size_t size, size_t count);
	virtual bool	Seek(int32_t offset, int32_t origin);
	virtual int32_t	Tell();
	virtual int32_t	Size();
	virtual bool	Flush();
	virtual bool	Eof();
	virtual int32_t	Error();
	virtual bool	PutC(uint8_t c);
	virtual int32_t	GetC();
	virtual char *	GetS(char *string, int32_t n);
	virtual int32_t	Scanf(const char *format, void* output);

protected:
	bool	Alloc(uint32_t nBytes);
	void	Free();

	uint8_t*	m_pBuffer;
	uint32_t	m_Size;
	bool	m_bFreeOnClose;
	int32_t	m_Position;	//current position
	int32_t	m_Edge;		//buffer size
	bool	m_bEOF;
};

#endif
