typedef struct {
	char * pattern;
	TCHAR * name;
} CDN_PROVIDER;

CDN_PROVIDER cdnList[] = {
	{".akamai.net", _T("Akamai")},
	{".akamaiedge.net", _T("Akamai")},
	{".llnwd.net", _T("Limelight")},
	{"edgecastcdn.net", _T("Edgecast")},
	{".systemcdn.net", _T("Edgecast")},
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
	{".netdna-cdn.com", _T("NetDNA")},
	{".netdna-ssl.com", _T("NetDNA")},
	{".netdna.com", _T("NetDNA")},
	{".cotcdn.net", _T("Cotendo CDN")},
	{".cachefly.net", _T("Cachefly")},
	{"bo.lt", _T("BO.LT")},
	{".cloudflare.com", _T("Cloudflare")},
	{".afxcdn.net", _T("afxcdn.net")},
	{".lxdns.com", _T("lxdns.com")},
	{".att-dsa.net", _T("AT&T")},
	{".vo.msecnd.net", _T("Windows Azure")},
  {".voxcdn.net", _T("VoxCDN")},
  {".bluehatnetwork.com", _T("Blue Hat Network")},
  {".swiftcdn1.com", _T("SwiftCDN")},
  {".cdngc.net", _T("CDNetworks")},
  {".fastly.net", _T("Fastly")},
  {".nocookie.net", _T("Fastly")},
  {".gslb.taobao.com", _T("Taobao")},
  {".gslb.tbcache.com", _T("Alimama")},
  {".mirror-image.net", _T("Mirror Image")},
  {".cubecdn.net", _T("cubeCDN")},
  {".yottaa.net", _T("Yottaa")},
  {".r.cdn77.net", _T("CDN77")},
  {".incapdns.net", _T("Incapsula")},
  {".bitgravity.com", _T("BitGravity")},
  {".r.worldcdn.net", _T("OnApp")},
  {".r.worldssl.net", _T("OnApp")},
  {"tbcdn.cn", _T("Taobao")},
  {".taobaocdn.com", _T("Taobao")},
  {".ngenix.net", _T("NGENIX")},
  {".pagerain.net", _T("PageRain")},
  {".ccgslb.com", _T("ChinaCache")},
  {"cdn.sfr.net", _T("SFR")},
  {NULL, NULL}
};

typedef struct {
  char * response_field;
  char * pattern;
  TCHAR * name;
} CDN_PROVIDER_HEADER;

CDN_PROVIDER_HEADER cdnHeaderList[] = {
  {"server", "cloudflare", _T("Cloudflare")},
};
