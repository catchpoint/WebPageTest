/******************************************************************************
Copyright (c) 2011, Google Inc.
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

#pragma once

/*typedef struct {
  char* pattern;
  TCHAR* name;
} CDN_PROVIDER;*/
typedef struct {
  CStringA pattern;
  CStringA name;
} CDN_PROVIDER;

typedef struct {
  CStringA response_field;
  CStringA pattern;
  CStringA name;
} CDN_PROVIDER_HEADER;

typedef struct {
  CStringA response_field;
  CStringA pattern;
} CDN_PROVIDER_HEADER_PAIR;

typedef struct {
  CStringA name;
  CDN_PROVIDER_HEADER_PAIR headers[3];  // Expand the number of needed headers as needed
} CDN_PROVIDER_MULTI_HEADER;

CDN_PROVIDER cdnList[] = {
  {".akamai.net", "Akamai"},
  {".akamaiedge.net", "Akamai"},
  {".akamaihd.net", "Akamai"},
  {".edgesuite.net", "Akamai"},
  {".edgekey.net", "Akamai"},
  {".srip.ne", "Akamai"},
  {".akamaitechnologies.com", "Akamai"},
  {".akamaitechnologies.fr", "Akamai"},
  {".llnwd.net", "Limelight"},
  {"edgecastcdn.net", "Edgecast"},
  {".systemcdn.net", "Edgecast"},
  {".transactcdn.net", "Edgecast"},
  {".v1cdn.net", "Edgecast"},
  {".v2cdn.net", "Edgecast"},
  {".v3cdn.net", "Edgecast"},
  {".v4cdn.net", "Edgecast"},
  {".v5cdn.net", "Edgecast"},
  {"hwcdn.net", "Highwinds"},
  {".simplecdn.net", "Simple CDN"},
  {".instacontent.net", "Mirror Image"},
  {".footprint.net", "Level 3"},
  {".fpbns.net", "Level 3"},
  {".ay1.b.yahoo.com", "Yahoo"},
  {".yimg.", "Yahoo"},
  {".yahooapis.com", "Yahoo"},
  {".google.", "Google"},
  {"googlesyndication.", "Google"},
  {"youtube.", "Google"},
  {".googleusercontent.com", "Google"},
  {"googlehosted.com", "Google"},
  {".gstatic.com", "Google"},
  {".doubleclick.net", "Google"},
  {".insnw.net", "Instart Logic"},
  {".inscname.net", "Instart Logic"},
  {".internapcdn.net", "Internap"},
  {".cloudfront.net", "Amazon CloudFront"},
  {".netdna-cdn.com", "NetDNA"},
  {".netdna-ssl.com", "NetDNA"},
  {".netdna.com", "NetDNA"},
  {".kxcdn.com", "KeyCDN"},
  {".cotcdn.net", "Cotendo CDN"},
  {".cachefly.net", "Cachefly"},
  {"bo.lt", "BO.LT"},
  {".cloudflare.com", "Cloudflare"},
  {".afxcdn.net", "afxcdn.net"},
  {".lxdns.com", "ChinaNetCenter"},
  {".wscdns.com", "ChinaNetCenter"},
  {".wscloudcdn.com", "ChinaNetCenter"},
  {".ourwebpic.com", "ChinaNetCenter"},
  {".att-dsa.net", "AT&T"},
  {".vo.msecnd.net", "Windows Azure"},
  {".voxcdn.net", "VoxCDN"},
  {".bluehatnetwork.com", "Blue Hat Network"},
  {".swiftcdn1.com", "SwiftCDN"},
  {".cdngc.net", "CDNetworks"},
  {".gccdn.net", "CDNetworks"},
  {".panthercdn.com", "CDNetworks"},
  {".fastly.net", "Fastly"},
  {".fastlylb.net", "Fastly"},
  {".nocookie.net", "Fastly"},
  {".gslb.taobao.com", "Taobao"},
  {".gslb.tbcache.com", "Alimama"},
  {".mirror-image.net", "Mirror Image"},
  {".yottaa.net", "Yottaa"},
  {".cubecdn.net", "cubeCDN"},
  {".cdn77.net", "CDN77"},
  {".cdn77.org", "CDN77"},
  {".incapdns.net", "Incapsula"},
  {".bitgravity.com", "BitGravity"},
  {".r.worldcdn.net", "OnApp"},
  {".r.worldssl.net", "OnApp"},
  {"tbcdn.cn", "Taobao"},
  {".taobaocdn.com", "Taobao"},
  {".ngenix.net", "NGENIX"},
  {".pagerain.net", "PageRain"},
  {".ccgslb.com", "ChinaCache"},
  {"cdn.sfr.net", "SFR"},
  {".azioncdn.net", "Azion"},
  {".azioncdn.com", "Azion"},
  {".azion.net", "Azion"},
  {".cdncloud.net.au", "MediaCloud"},
  {".rncdn1.com", "Reflected Networks"},
  {".cdnsun.net", "CDNsun"},
  {".mncdn.com", "Medianova"},
  {".mncdn.net", "Medianova"},
  {".mncdn.org", "Medianova"},
  {"cdn.jsdelivr.net", "jsDelivr"},
  {".nyiftw.net", "NYI FTW"},
  {".nyiftw.com", "NYI FTW"},
  {".resrc.it", "ReSRC.it"},
  {".zenedge.net", "Zenedge"},
  {".lswcdn.net", "LeaseWeb CDN"},
  {".lswcdn.eu", "LeaseWeb CDN"},
  {".revcn.net", "Rev Software"},
  {".revdn.net", "Rev Software"},
  {".caspowa.com", "Caspowa"},
  {".twimg.com", "Twitter"},
  {".facebook.com", "Facebook"},
  {".facebook.net", "Facebook"},
  {".fbcdn.net", "Facebook"},
  {".cdninstagram.com", "Facebook"},
  {".rlcdn.com", "Reapleaf"},
  {".wp.com", "WordPress"},
  {".aads1.net", "Aryaka"},
  {".aads-cn.net", "Aryaka"},
  {".aads-cng.net", "Aryaka"},
  {".squixa.net", "section.io"},
  {".bisongrid.net", "Bison Grid"},
  {".cdn.gocache.net", "GoCache"},
  {".hiberniacdn.com", "HiberniaCDN"},
  {".cdntel.net", "Telenor"},
  {".raxcdn.com", "Rackspace"},
  {".unicorncdn.net", "UnicornCDN"},
  {"END_MARKER", "END_MARKER"}
};

CDN_PROVIDER_HEADER cdnHeaderList[] = {
  {"server", "cloudflare", "Cloudflare"},
  {"server", "ECS", "Edgecast"},
  {"server", "ECAcc", "Edgecast"},
  {"server", "ECD", "Edgecast"},
  {"server", "NetDNA", "NetDNA"},
  {"server", "Airee", "Airee"},
  {"X-CDN-Geo", "", "OVH CDN"},
  {"X-Px", "", "CDNetworks"},
  {"X-Instart-Request-ID", "instart", "Instart Logic"},
  {"Via", "CloudFront", "Amazon CloudFront"},
  {"X-Edge-IP", "", "CDN"},
  {"X-Edge-Location", "", "CDN"},
  {"X-Powered-By", "NYI FTW", "NYI FTW"},
  {"server", "ReSRC", "ReSRC.it"},
  {"X-Cdn", "Zenedge", "Zenedge"},
  {"server", "leasewebcdn", "LeaseWeb CDN"},
  {"Via", "Rev-Cache", "Rev Software"},
  {"X-Rev-Cache", "", "Rev Software"},
  {"Server", "Caspowa", "Caspowa"},
  {"Server", "SurgeCDN", "Surge"},
  {"server", "sffe", "Google"},
  {"server", "gws", "Google"},
  {"server", "GSE", "Google"},
  {"server", "Golfe2", "Google"},
  {"server", "tsa_b", "Twitter"},
  {"X-Cache", "cache.51cdn.com", "ChinaNetCenter"},
  {"X-CDN", "Incapsula", "Incapsula"},
  {"X-Iinfo", "", "Incapsula"},
  {"X-Ar-Debug", "", "Aryaka"},
  {"server", "gocache", "GoCache"},
  {"server", "hiberniacdn", "HiberniaCDN"}
  {"server", "UnicornCDN","UnicornCDN"}
};

// Specific providers that require multiple headers
CDN_PROVIDER_MULTI_HEADER cdnMultiHeaderList[] = {
  {"Fastly", {{"Via", "varnish"}, {"X-Served-By", "cache-"}, {"X-Cache", ""}}}
};
