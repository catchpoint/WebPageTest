#pragma once

class JSMin
{
public:
	JSMin();
	~JSMin();
	bool Minify(const char * inBuff, char * outBuff, unsigned long &outBuffLen);
	
protected:
	bool ret;
	int   theA;
	int   theB;
	int   theLookahead;
	void	Run();
	void	action(int d);
	int		next();
	int		peek();
	int		get();
	void	put(int c);
	int		isAlphanum(int c);
	const char *	in;
	char *			out;
	unsigned long	outLen;
	unsigned long	len;
};
