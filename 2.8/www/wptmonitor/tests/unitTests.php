<?php
//include 'lib/monitor.inc';

//  $id = submitRequest("http://wpt.mtvly.com/runtest.php", "http://www.yahoo.com", "Yahoo", "Sydney_Au", "1", "1", "on");
//  echo $id;


$c = new Curl_example(array('report'=>213,'token'=>'some string'), 'http://yahoo.com');

$data = $c->get();

$headers = $c->getHeaders();



class Curl_example {
	private $request;
	private $response;
	private $response_meta_info;
        private $url;

	function __construct($request, $url) {
		//E.g.
		//$request['report_num']=1432;
		//$request['token']='some string'
		$this->request = $request;
                $this->url = $url;
	}

	function get() {
		//initiate curl transfer
		$ch = curl_init();

		//set the URL to connect to
		curl_setopt($ch, CURLOPT_URL, $this->url);

		//do not include headers in the response
		curl_setopt($ch, CURLOPT_HEADER, 0);

		//register a callback function which will process the headers
		//this assumes your code is into a class method, and uses $this->readHeader as the callback //function
		curl_setopt($ch, CURLOPT_HEADERFUNCTION, array(&$this,'readHeader'));

		//Some servers (like Lighttpd) will not process the curl request without this header and will return error code 417 instead.
		//Apache does not need it, but it is safe to use it there as well.
		curl_setopt($ch, CURLOPT_HTTPHEADER, array("Expect:"));

		//Response will be read in chunks of 64000 bytes
		curl_setopt($ch, CURLOPT_BUFFERSIZE, 64000);

		//Tell curl to use POST
		curl_setopt($ch, CURLOPT_REQUEST, 1);

		//Tell curl to write the response to a variable
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);

		//Register the data to be submitted via POST
		curl_setopt($ch, CURLOPT_REQUESTFIELDS, $this->request);

		//Execute request
		$this->response = curl_exec($ch);

		//get the default response headers
		$headers = curl_getinfo($ch);

		//add the headers from the custom headers callback function
		$this->response_meta_info = array_merge($headers, $this->response_meta_info);

		//close connection
		curl_close($ch);

		//catch the case where no response is actually returned
		//but curl_exec returns true (on no data) or false (if cannot connect)
		if (is_bool($this->response)) {
			if ($this->response==false){
				throw new Exception('No connection');
			} else {
				//null the response, because there are actually no data
				$this->response=null;
			}

		}
		return $this->response;
	}

	/**
	 * CURL callback function for reading and processing headers
	 * Override this for your needs
	 *
	 * @param object $ch
	 * @param string $header
	 * @return integer
	 */
	private function readHeader($ch, $header) {
		//extracting example data: filename from header field Content-Disposition
		$filename = $this->extractCustomHeader('Content-Disposition: attachment; filename=', '\n', $header);
		if ($filename) {
			$this->response_meta_info['content_disposition'] = trim($filename);
		}
		return strlen($header);
	}

	private function extractCustomHeader($start,$end,$header) {
		$pattern = '/'. $start .'(.*?)'. $end .'/';
		if (preg_match($pattern, $header, $result)) {
			return $result[1];
		} else {
			return false;
		}
	}

	function getHeaders() {
		return $this->response_meta_info;
	}
}

?>