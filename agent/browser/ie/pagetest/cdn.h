typedef struct {
	char * pattern;
	TCHAR * name;
} CDN_PROVIDER;

CDN_PROVIDER cdnList[] = {
	{".akamai.net", _T("Akamai")},
	{".akamaiedge.net", _T("Akamai")},
	{".llnwd.net", _T("Limelight")},
	{"edgecastcdn.net", _T("Edgecast")},
	{"hwcdn.net", _T("Highwinds")},
	{".panthercdn.com", _T("Panther")},
	{".simplecdn.net", _T("Simple CDN")},
	{".instacontent.net", _T("Mirror Image")},
	{".footprint.net", _T("Level 3")},
	{".ay1.b.yahoo.com", _T("Yahoo")},
	{".yimg.", _T("Yahoo")},
	{".google.", _T("Google")},
	{"googlesyndication.", _T("Google")},
	{"youtube.", _T("Google")},
  {".googleusercontent.com", _T("Google")},
	{".internapcdn.net", _T("Internap")},
	{".cloudfront.net", _T("Amazon CloudFront")},
	{".netdna-cdn.com", _T("MaxCDN")},
	{".netdna.com", _T("MaxCDN")},
	{".cotcdn.net", _T("Cotendo CDN")},
	{".cachefly.net", _T("Cachefly")},
	{"bo.lt", _T("BO.LT")},
	{".cloudflare.com", _T("Cloudflare")},
	{".afxcdn.net", _T("afxcdn.net")},
	{".lxdns.com", _T("lxdns.com")},
	{".att-dsa.net", _T("AT&T")},
	{".vo.msecnd.net", _T("Windows Azure")},
  {".voxcdn.net", _T("VoxCDN")},
	{NULL, NULL}
};
