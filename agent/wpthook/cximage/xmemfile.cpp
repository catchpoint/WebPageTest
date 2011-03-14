#include "xmemfile.h"

//////////////////////////////////////////////////////////
CxMemFile::CxMemFile(uint8_t* pBuffer, uint32_t size)
{
	m_pBuffer = pBuffer;
	m_Position = 0;
	m_Size = m_Edge = size;
	m_bFreeOnClose = (bool)(pBuffer==0);
	m_bEOF = false;
}
//////////////////////////////////////////////////////////
CxMemFile::~CxMemFile()
{
	Close();
}
//////////////////////////////////////////////////////////
bool CxMemFile::Close()
{
	if ( (m_pBuffer) && (m_bFreeOnClose) ){
		free(m_pBuffer);
		m_pBuffer = NULL;
		m_Size = 0;
	}
	return true;
}
//////////////////////////////////////////////////////////
bool CxMemFile::Open()
{
	if (m_pBuffer) return false;	// Can't re-open without closing first

	m_Position = m_Size = m_Edge = 0;
	m_pBuffer=(uint8_t*)malloc(1);
	m_bFreeOnClose = true;

	return (m_pBuffer!=0);
}
//////////////////////////////////////////////////////////
uint8_t* CxMemFile::GetBuffer(bool bDetachBuffer)
{
	//can only detach, avoid inadvertantly attaching to
	// memory that may not be ours [Jason De Arte]
	if( bDetachBuffer )
		m_bFreeOnClose = false;
	return m_pBuffer;
}
//////////////////////////////////////////////////////////
size_t CxMemFile::Read(void *buffer, size_t size, size_t count)
{
	if (buffer==NULL) return 0;

	if (m_pBuffer==NULL) return 0;
	if (m_Position >= (int32_t)m_Size){
		m_bEOF = true;
		return 0;
	}

	int32_t nCount = (int32_t)(count*size);
	if (nCount == 0) return 0;

	int32_t nRead;
	if (m_Position + nCount > (int32_t)m_Size){
		m_bEOF = true;
		nRead = (m_Size - m_Position);
	} else
		nRead = nCount;

	memcpy(buffer, m_pBuffer + m_Position, nRead);
	m_Position += nRead;

	return (size_t)(nRead/size);
}
//////////////////////////////////////////////////////////
size_t CxMemFile::Write(const void *buffer, size_t size, size_t count)
{
	m_bEOF = false;
	if (m_pBuffer==NULL) return 0;
	if (buffer==NULL) return 0;

	int32_t nCount = (int32_t)(count*size);
	if (nCount == 0) return 0;

	if (m_Position + nCount > m_Edge){
		if (!Alloc(m_Position + nCount)){
			return false;
		}
	}

	memcpy(m_pBuffer + m_Position, buffer, nCount);

	m_Position += nCount;

	if (m_Position > (int32_t)m_Size) m_Size = m_Position;
	
	return count;
}
//////////////////////////////////////////////////////////
bool CxMemFile::Seek(int32_t offset, int32_t origin)
{
	m_bEOF = false;
	if (m_pBuffer==NULL) return false;
	int32_t lNewPos = m_Position;

	if (origin == SEEK_SET)		 lNewPos = offset;
	else if (origin == SEEK_CUR) lNewPos += offset;
	else if (origin == SEEK_END) lNewPos = m_Size + offset;
	else return false;

	if (lNewPos < 0) lNewPos = 0;

	m_Position = lNewPos;
	return true;
}
//////////////////////////////////////////////////////////
int32_t CxMemFile::Tell()
{
	if (m_pBuffer==NULL) return -1;
	return m_Position;
}
//////////////////////////////////////////////////////////
int32_t CxMemFile::Size()
{
	if (m_pBuffer==NULL) return -1;
	return m_Size;
}
//////////////////////////////////////////////////////////
bool CxMemFile::Flush()
{
	if (m_pBuffer==NULL) return false;
	return true;
}
//////////////////////////////////////////////////////////
bool CxMemFile::Eof()
{
	if (m_pBuffer==NULL) return true;
	return m_bEOF;
}
//////////////////////////////////////////////////////////
int32_t CxMemFile::Error()
{
	if (m_pBuffer==NULL) return -1;
	return (m_Position > (int32_t)m_Size);
}
//////////////////////////////////////////////////////////
bool CxMemFile::PutC(uint8_t c)
{
	m_bEOF = false;
	if (m_pBuffer==NULL) return false;

	if (m_Position >= m_Edge){
		if (!Alloc(m_Position + 1)){
			return false;
		}
	}

	m_pBuffer[m_Position++] = c;

	if (m_Position > (int32_t)m_Size) m_Size = m_Position;
	
	return true;
}
//////////////////////////////////////////////////////////
int32_t CxMemFile::GetC()
{
	if (m_pBuffer==NULL || m_Position >= (int32_t)m_Size){
		m_bEOF = true;
		return EOF;
	}
	return *(uint8_t*)((uint8_t*)m_pBuffer + m_Position++);
}
//////////////////////////////////////////////////////////
char * CxMemFile::GetS(char *string, int32_t n)
{
	n--;
	int32_t c,i=0;
	while (i<n){
		c = GetC();
		if (c == EOF) return 0;
		string[i++] = (char)c;
		if (c == '\n') break;
	}
	string[i] = 0;
	return string;
}
//////////////////////////////////////////////////////////
int32_t	CxMemFile::Scanf(const char *format, void* output)
{
	return 0;
}
//////////////////////////////////////////////////////////
bool CxMemFile::Alloc(uint32_t dwNewLen)
{
	if (dwNewLen > (uint32_t)m_Edge)
	{
		// find new buffer size
		uint32_t dwNewBufferSize = (uint32_t)(((dwNewLen>>16)+1)<<16);

		// allocate new buffer
		if (m_pBuffer == NULL) m_pBuffer = (uint8_t*)malloc(dwNewBufferSize);
		else	m_pBuffer = (uint8_t*)realloc(m_pBuffer, dwNewBufferSize);
		// I own this buffer now (caller knows nothing about it)
		m_bFreeOnClose = true;

		m_Edge = dwNewBufferSize;
	}
	return (m_pBuffer!=0);
}
//////////////////////////////////////////////////////////
void CxMemFile::Free()
{
	Close();
}
//////////////////////////////////////////////////////////
