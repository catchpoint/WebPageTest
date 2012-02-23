

class CIpfw
{
public:
	CIpfw(void);
	~CIpfw(void);

	// pipe operations
	bool CreatePipe(unsigned int num, unsigned long bandwidth, unsigned long delay, double plr = 0.0);
	bool DeletePipe(unsigned int num);
	unsigned int AddPort(unsigned int pipeNum, unsigned short port, bool in);

	bool Flush();
	bool Delete(unsigned int rule);

protected:
	HANDLE hDriver;
	bool Set(int cmd, void * data, size_t len);
	bool Get(int cmd, void * data, size_t &len);
};
