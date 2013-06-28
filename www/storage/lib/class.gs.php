<?PHP
    // LICENSE: Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.
    // 
    // This class is based on php-aws (http://code.google.com/p/php-aws/).

    class GS
    {
        private $key;
        private $privateKey;
        private $host;
        private $date;
        private $curlInfo;

        public function __construct($key, $private_key, $host = 'commondatastorage.googleapis.com')
        {
            $this->key        = $key;
            $this->privateKey = $private_key;
            $this->host       = $host;
            $this->date       = gmdate('D, d M Y H:i:s T');
            return true;
        }

        public function listBuckets()
        {
            $request = array('verb' => 'GET', 'resource' => '/');
            $result = $this->sendRequest($request);
            $xml = simplexml_load_string($result);

            if($xml === false || !isset($xml->Buckets->Bucket))
                return false;

            $buckets = array();
            foreach($xml->Buckets->Bucket as $bucket)
                $buckets[] = (string) $bucket->Name;
            return $buckets;
        }

        public function createBucket($name)
        {
            $request = array('verb' => 'PUT', 'resource' => "/$name/");
            // POST requires a Content-length header.
            $headers = array('Content-Length' => 0);
            $result = $this->sendRequest($request, $headers);
            return $this->curlInfo['http_code'] == '200';
        }

        public function deleteBucket($name)
        {
            $request = array('verb' => 'DELETE', 'resource' => "/$name/");
            $result = $this->sendRequest($request);
            return $this->curlInfo['http_code'] == '204';
        }

        public function getBucketLocation($name)
        {
            $request = array('verb' => 'GET', 'resource' => "/$name/?location");
            $result = $this->sendRequest($request);
            $xml = simplexml_load_string($result);

            if($xml === false)
                return false;

            return (string) $xml->LocationConstraint;
        }

        public function getBucketContents($name, $prefix = null, $marker = null, $delimeter = null, $max_keys = null)
        {
            $contents = array();

            do
            {
                $q = array();
                if(!is_null($prefix)) $q[] = 'prefix=' . $prefix;
                if(!is_null($marker)) $q[] = 'marker=' . $marker;
                if(!is_null($delimeter)) $q[] = 'delimeter=' . $delimeter;
                if(!is_null($max_keys)) $q[] = 'max-keys=' . $max_keys;
                $q = implode('&', $q);
                if(strlen($q) > 0)
                    $q = '?' . $q;

                $request = array('verb' => 'GET', 'resource' => "/$name/$q");
                $result = $this->sendRequest($request);
                $xml = simplexml_load_string($result);

                if($xml === false)
                    return false;

                foreach($xml->Contents as $item)
                    $contents[(string) $item->Key] = array('LastModified' => (string) $item->LastModified, 'ETag' => (string) $item->ETag, 'Size' => (string) $item->Size);

                $marker = (string) $xml->Marker;
            }
            while((string) $xml->IsTruncated == 'true' && is_null($max_keys));

            return $contents;
        }

        public function uploadFile($bucket_name, $gs_path, $fs_path, $web_accessible = false, $headers = null)
        {
            // Some useful headers you can set manually by passing in an associative array...
            // Cache-Control
            // Content-Type
            // Content-Disposition (alternate filename to present during web download)
            // Content-Encoding
            // x-goog-meta-*
            // x-goog-acl (private, public-read, public-read-write, authenticated-read)

            $request = array('verb' => 'PUT',
                             'resource' => "/$bucket_name/$gs_path",
                             'content-md5' => $this->base64(md5_file($fs_path)));

            $fh = fopen($fs_path, 'r');
            $curl_opts = array('CURLOPT_PUT' => true,
                               'CURLOPT_INFILE' => $fh,
                               'CURLOPT_INFILESIZE' => filesize($fs_path),
                               'CURLOPT_CUSTOMREQUEST' => 'PUT');

            if(is_null($headers))
                $headers = array();

            $headers['Content-MD5'] = $request['content-md5'];

            if($web_accessible === true && !isset($headers['x-goog-acl']))
                $headers['x-goog-acl'] = 'public-read';

            if(!isset($headers['Content-Type']))
            {
                $ext = pathinfo($fs_path, PATHINFO_EXTENSION);
                $headers['Content-Type'] = isset($this->mimeTypes[$ext]) ? $this->mimeTypes[$ext] : 'application/octet-stream';
            }
            $request['content-type'] = $headers['Content-Type'];

            $result = $this->sendRequest($request, $headers, $curl_opts);
            fclose($fh);
            return $this->curlInfo['http_code'] == '200';
        }

        public function deleteObject($bucket_name, $gs_path)
        {
            $request = array('verb' => 'DELETE', 'resource' => "/$bucket_name/$gs_path");
            $result = $this->sendRequest($request);
            return $this->curlInfo['http_code'] == '204';
        }

        public function copyObject($bucket_name, $gs_path, $dest_bucket_name, $dest_gs_path)
        {
            $request = array('verb' => 'PUT', 'resource' => "/$dest_bucket_name/$dest_gs_path");
            $headers = array('x-goog-copy-source' => "/$bucket_name/$gs_path");
            $result = $this->sendRequest($request, $headers);

            if($this->curlInfo['http_code'] != '200')
                return false;

            $xml = simplexml_load_string($result);
            if($xml === false)
                return false;

            return isset($xml->LastModified);
        }

        public function getObjectInfo($bucket_name, $gs_path)
        {
            $request = array('verb' => 'HEAD', 'resource' => "/$bucket_name/$gs_path");
            $curl_opts = array('CURLOPT_HEADER' => true, 'CURLOPT_NOBODY' => true);
            $result = $this->sendRequest($request, null, $curl_opts);
            $xml = @simplexml_load_string($result);

            if($xml !== false)
                return false;

            preg_match_all('/^(\S*?): (.*?)$/ms', $result, $matches);
            $info = array();
            for($i = 0; $i < count($matches[1]); $i++)
                $info[$matches[1][$i]] = $matches[2][$i];

            if(!isset($info['Last-Modified']))
                return false;

            return $info;
        }

        public function downloadFile($bucket_name, $gs_path, $fs_path)
        {
            $request = array('verb' => 'GET', 'resource' => "/$bucket_name/$gs_path");

            $fh = fopen($fs_path, 'w');
            $curl_opts = array('CURLOPT_FILE' => $fh);

            if(is_null($headers))
                $headers = array();

            $result = $this->sendRequest($request, $headers, $curl_opts);
            fclose($fh);
            return $this->curlInfo['http_code'] == '200';

        }

	public function getAuthenticatedURLRelative($bucket_name, $gs_path, $seconds_till_expires = 3600)
	{
		return $this->getAuthenticatedURL($bucket_name, $gs_path, gmmktime() + $seconds_till_expires);
	}

	/*
	public function getAuthenticatedURL($bucket_name, $gs_path, $expires_on)
	{
		// $expires_on must be a GMT Unix timestamp

		$request = array('verb' => 'GET', 'resource' => "/$bucket_name/$gs_path", 'date' => $expires_on);
		$signature = urlencode($this->signature($request));
		
		$url = sprintf("http://%s.%s/%s?AWSAccessKeyId=%s&Expires=%s&Signature=%s",
						$bucket_name,
						$this->host,
						$gs_path,
						$this->key,
						$expires_on,
						$signature);
		return $url;
	}
	*/

        private function sendRequest($request, $headers = null, $curl_opts = null)
        {
            if(is_null($headers))
                $headers = array();

            $headers['Date'] = $this->date;
            $headers['Authorization'] = 'GOOG1 ' . $this->key . ':' . $this->signature($request, $headers);
            foreach($headers as $k => $v)
                $headers[$k] = "$k: $v";

            $uri = 'http://' . $this->host . $request['resource'];
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $uri);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $request['verb']);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            // curl_setopt($ch, CURLOPT_VERBOSE, true);

            if(is_array($curl_opts))
            {
                foreach($curl_opts as $k => $v)
                    curl_setopt($ch, constant($k), $v);
            }

            $result = curl_exec($ch);
            $this->curlInfo = curl_getinfo($ch);
            curl_close($ch);
            //var_dump($result);
            return $result;
        }

        private function signature($request, $headers = null)
        {
			if(is_null($headers))
				$headers = array();

            $CanonicalizedAmzHeadersArr = array();
            $CanonicalizedAmzHeadersStr = '';
            foreach($headers as $k => $v)
            {
                $k = strtolower($k);

                if(substr($k, 0, 6) != 'x-goog') continue;

                if(isset($CanonicalizedAmzHeadersArr[$k]))
                    $CanonicalizedAmzHeadersArr[$k] .= ',' . trim($v);
                else
                    $CanonicalizedAmzHeadersArr[$k] = trim($v);
            }
            ksort($CanonicalizedAmzHeadersArr);

            foreach($CanonicalizedAmzHeadersArr as $k => $v)
                $CanonicalizedAmzHeadersStr .= "$k:$v\n";

            $str  = $request['verb'] . "\n";
            $str .= isset($request['content-md5']) ? $request['content-md5'] . "\n" : "\n";
            $str .= isset($request['content-type']) ? $request['content-type'] . "\n" : "\n";
            $str .= isset($request['date']) ? $request['date']  . "\n" : $this->date . "\n";
            $str .= $CanonicalizedAmzHeadersStr . preg_replace('/\?.*/', '', $request['resource']);

            $sha1 = $this->hasher($str);
            return $this->base64($sha1);
        }

        // Algorithm adapted (stolen) from http://pear.php.net/package/Crypt_HMAC/)
        private function hasher($data)
        {
            $key = $this->privateKey;
            if(strlen($key) > 64)
                $key = pack('H40', sha1($key));
            if(strlen($key) < 64)
                $key = str_pad($key, 64, chr(0));
            $ipad = (substr($key, 0, 64) ^ str_repeat(chr(0x36), 64));
            $opad = (substr($key, 0, 64) ^ str_repeat(chr(0x5C), 64));
            return sha1($opad . pack('H40', sha1($ipad . $data)));
        }

        private function base64($str)
        {
            $ret = '';
            for($i = 0; $i < strlen($str); $i += 2)
                $ret .= chr(hexdec(substr($str, $i, 2)));
            return base64_encode($ret);
        }

        private function match($regex, $str, $i = 0)
        {
            if(preg_match($regex, $str, $match) == 1)
                return $match[$i];
            else
                return false;
        }

        private $mimeTypes = array("323" => "text/h323", "acx" => "application/internet-property-stream", "ai" => "application/postscript", "aif" => "audio/x-aiff", "aifc" => "audio/x-aiff", "aiff" => "audio/x-aiff",
        "asf" => "video/x-ms-asf", "asr" => "video/x-ms-asf", "asx" => "video/x-ms-asf", "au" => "audio/basic", "avi" => "video/quicktime", "axs" => "application/olescript", "bas" => "text/plain", "bcpio" => "application/x-bcpio", "bin" => "application/octet-stream", "bmp" => "image/bmp",
        "c" => "text/plain", "cat" => "application/vnd.ms-pkiseccat", "cdf" => "application/x-cdf", "cer" => "application/x-x509-ca-cert", "class" => "application/octet-stream", "clp" => "application/x-msclip", "cmx" => "image/x-cmx", "cod" => "image/cis-cod", "cpio" => "application/x-cpio", "crd" => "application/x-mscardfile",
        "crl" => "application/pkix-crl", "crt" => "application/x-x509-ca-cert", "csh" => "application/x-csh", "css" => "text/css", "dcr" => "application/x-director", "der" => "application/x-x509-ca-cert", "dir" => "application/x-director", "dll" => "application/x-msdownload", "dms" => "application/octet-stream", "doc" => "application/msword",
        "dot" => "application/msword", "dvi" => "application/x-dvi", "dxr" => "application/x-director", "eps" => "application/postscript", "etx" => "text/x-setext", "evy" => "application/envoy", "exe" => "application/octet-stream", "fif" => "application/fractals", "flr" => "x-world/x-vrml", "gif" => "image/gif",
        "gtar" => "application/x-gtar", "gz" => "application/x-gzip", "h" => "text/plain", "hdf" => "application/x-hdf", "hlp" => "application/winhlp", "hqx" => "application/mac-binhex40", "hta" => "application/hta", "htc" => "text/x-component", "htm" => "text/html", "html" => "text/html",
        "htt" => "text/webviewhtml", "ico" => "image/x-icon", "ief" => "image/ief", "iii" => "application/x-iphone", "ins" => "application/x-internet-signup", "isp" => "application/x-internet-signup", "jfif" => "image/pipeg", "jpe" => "image/jpeg", "jpeg" => "image/jpeg", "jpg" => "image/jpeg",
        "js" => "application/x-javascript", "latex" => "application/x-latex", "lha" => "application/octet-stream", "lsf" => "video/x-la-asf", "lsx" => "video/x-la-asf", "lzh" => "application/octet-stream", "m13" => "application/x-msmediaview", "m14" => "application/x-msmediaview", "m3u" => "audio/x-mpegurl", "man" => "application/x-troff-man",
        "mdb" => "application/x-msaccess", "me" => "application/x-troff-me", "mht" => "message/rfc822", "mhtml" => "message/rfc822", "mid" => "audio/mid", "mny" => "application/x-msmoney", "mov" => "video/quicktime", "movie" => "video/x-sgi-movie", "mp2" => "video/mpeg", "mp3" => "audio/mpeg",
        "mpa" => "video/mpeg", "mpe" => "video/mpeg", "mpeg" => "video/mpeg", "mpg" => "video/mpeg", "mpp" => "application/vnd.ms-project", "mpv2" => "video/mpeg", "ms" => "application/x-troff-ms", "mvb" => "application/x-msmediaview", "nws" => "message/rfc822", "oda" => "application/oda",
        "p10" => "application/pkcs10", "p12" => "application/x-pkcs12", "p7b" => "application/x-pkcs7-certificates", "p7c" => "application/x-pkcs7-mime", "p7m" => "application/x-pkcs7-mime", "p7r" => "application/x-pkcs7-certreqresp", "p7s" => "application/x-pkcs7-signature", "pbm" => "image/x-portable-bitmap", "pdf" => "application/pdf", "pfx" => "application/x-pkcs12",
        "pgm" => "image/x-portable-graymap", "pko" => "application/ynd.ms-pkipko", "pma" => "application/x-perfmon", "pmc" => "application/x-perfmon", "pml" => "application/x-perfmon", "pmr" => "application/x-perfmon", "pmw" => "application/x-perfmon", "png" => "image/png", "pnm" => "image/x-portable-anymap", "pot" => "application/vnd.ms-powerpoint", "ppm" => "image/x-portable-pixmap",
        "pps" => "application/vnd.ms-powerpoint", "ppt" => "application/vnd.ms-powerpoint", "prf" => "application/pics-rules", "ps" => "application/postscript", "pub" => "application/x-mspublisher", "qt" => "video/quicktime", "ra" => "audio/x-pn-realaudio", "ram" => "audio/x-pn-realaudio", "ras" => "image/x-cmu-raster", "rgb" => "image/x-rgb",
        "rmi" => "audio/mid", "roff" => "application/x-troff", "rtf" => "application/rtf", "rtx" => "text/richtext", "scd" => "application/x-msschedule", "sct" => "text/scriptlet", "setpay" => "application/set-payment-initiation", "setreg" => "application/set-registration-initiation", "sh" => "application/x-sh", "shar" => "application/x-shar",
        "sit" => "application/x-stuffit", "snd" => "audio/basic", "spc" => "application/x-pkcs7-certificates", "spl" => "application/futuresplash", "src" => "application/x-wais-source", "sst" => "application/vnd.ms-pkicertstore", "stl" => "application/vnd.ms-pkistl", "stm" => "text/html", "svg" => "image/svg+xml", "sv4cpio" => "application/x-sv4cpio",
        "sv4crc" => "application/x-sv4crc", "t" => "application/x-troff", "tar" => "application/x-tar", "tcl" => "application/x-tcl", "tex" => "application/x-tex", "texi" => "application/x-texinfo", "texinfo" => "application/x-texinfo", "tgz" => "application/x-compressed", "tif" => "image/tiff", "tiff" => "image/tiff",
        "tr" => "application/x-troff", "trm" => "application/x-msterminal", "tsv" => "text/tab-separated-values", "txt" => "text/plain", "uls" => "text/iuls", "ustar" => "application/x-ustar", "vcf" => "text/x-vcard", "vrml" => "x-world/x-vrml", "wav" => "audio/x-wav", "wcm" => "application/vnd.ms-works",
        "wdb" => "application/vnd.ms-works", "wks" => "application/vnd.ms-works", "wmf" => "application/x-msmetafile", "wps" => "application/vnd.ms-works", "wri" => "application/x-mswrite", "wrl" => "x-world/x-vrml", "wrz" => "x-world/x-vrml", "xaf" => "x-world/x-vrml", "xbm" => "image/x-xbitmap", "xla" => "application/vnd.ms-excel",
        "xlc" => "application/vnd.ms-excel", "xlm" => "application/vnd.ms-excel", "xls" => "application/vnd.ms-excel", "xlt" => "application/vnd.ms-excel", "xlw" => "application/vnd.ms-excel", "xof" => "x-world/x-vrml", "xpm" => "image/x-xpixmap", "xwd" => "image/x-xwindowdump", "z" => "application/x-compress", "zip" => "application/zip");
    }
