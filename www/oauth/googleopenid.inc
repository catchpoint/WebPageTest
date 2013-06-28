<?php
  
  /****************************************************************************
  * The GoogleOpenID class
  * 
  * This class implements a gateway to the Google OpenID federated login API
  * 
  * By Andrew Peace (http://www.andrewpeace.com)
  * December 6, 2008
  * Contact me at http://www.andrewpeace.com/contact.html
  *
  *
  * Usage:
  *
  * To redirect users to a Google login page, simply create a GoogleOpenID:
  *
  * $googleGateway = GoogleOpenID::createRequest("http://www.mydomain.com/check.php",
  *                                              "ABCDEFG",
  *                                              true);
  *
  * The first argument is the URL you want Google to redirect to when it sends
  * its response
  *
  * The second argument is the association handle you've obtained from Google.
  * This parameter is OPTIONAL and can be set to null. However, if it is not
  * given or it is set to null, GoogleOpenID will automatically request an
  * association handle when it is constructed. This is wastefull! Association
  * handles last for two weeks. So, it is better to get and save an association
  * handle on your own using GoogleOpenID::getAssociationHandle().
  *
  * The third argument should be set to true if you want the response to include
  * the user's email address. It is optional.
  *
  * Example:
  *
  * $googleGateway = GoogleOpenID::createRequest("http://www.mydomain.com/checkauth.php", "ABCDEFG", true);
  * $googleGateway->redirect();
  * 
  * OR
  *
  * $handle = GoogleOpenID::getAssociationHandle(); // <--save this! valid for two weeks!
  *
  * $googleGateway = GoogleOpenID::createRequest("http://www.mydomain.com/checkauth.php", $handle, true);
  * $googleGateway->redirect();
  *
  *
  * When you want to recieve a Google OpenID response, simply pass the given
  * parameters to GoogleOpenID::create(). In most cases, you should just be able
  * to pass the $_GET variable.
  *
  * To continue the previous example, the following code would go in checkauth.php
  *
  * $googleResponse = GoogleOpenID::create($_GET);
  * $sucess = $googleResponse->success();//true or false
  * $user_identity = $googleResponse->identity();//the user's ID
  * $user_email = $googleResponse->email();//the user's email
  *
  * OR, even easier
  *
  * $googleResponse = GoogleOpenID::getResponse(); // <-- automatically reads $_GET
  *
  * Advanced users can create a slightly more customized request using the create
  * method. It accepts an associative array of openid parameters and sets those
  * that it deems appropriate to set (mostly, the parameters that don't have a
  * definite value when interacting with Google)
  *
  *
  * Full class signature:
  * 
  * public static createRequest(String, [String], [Boolean])
  * public static getResponse()
  * public static create(Array)
  * public static getAssociationHandle([String])
  * public static getEndPoint()
  * public redirect()
  * public getArray()
  * public endPoint()
  * public success()
  * public assoc_handle()
  * public email()
  * public identity()
  * 
  * Features to implement:
  *
  * -In constructor, fix relative->absolute URL conversion (it is messy/buggy)
  * -In getAssociationHandle(), use encryption
  * -Verify Google's response with signed, sig etc
  ****************************************************************************/
  
  class GoogleOpenID{
    //the google discover url
    const google_discover_url = "https://www.google.com/accounts/o8/id";
    
    //some constant parameters
    const openid_ns = "http://specs.openid.net/auth/2.0";
    //required for email attribute exchange
    const openid_ns_ext1 = "http://openid.net/srv/ax/1.0";
    const openid_ext1_mode = "fetch_request";
    const openid_ext1_type_email = "http://schema.openid.net/contact/email";
    const openid_ext1_required = "email";
    
    //parameters set by constructor
    private $mode;//the mode (checkid_setup, id_res, or cancel)
    private $response_nonce;
    private $return_to;//return URL
    private $realm;//the realm that the user is being asked to trust
    private $assoc_handle;//the association handle between this service and Google
    private $claimed_id;//the id claimed by the user
    private $identity;//for google, this is the same as claimed_id
    private $signed;
    private $sig;
    private $email;//the user's email address
    
    //if true, fetch email address
    private $require_email;
    
    //private constructor
    private function GoogleOpenID($mode, $op_endpoint, $response_nonce, $return_to, $realm, $assoc_handle, $claimed_id, $signed, $sig, $email, $require_email){

      //if assoc_handle is null, fetch one
      if(is_null($assoc_handle))
        $assoc_handle = GoogleOpenID::getAssociationHandle();
        
      //if return_to is a relative URL, make it absolute
      if(stripos($return_to, "http://")==false &&
         stripos($return_to, "https://")==false){
        //if the first character is a slash, delete it
        if(substr($return_to, 0, 1)=="/")
          $return_to = substr($return_to, 1);
        //get the position of server_name  
        $server_name_pos = stripos($return_to, $_SERVER['SERVER_NAME']);
        //if server_name is already at position zero
        if($server_name_pos != false && $server_name_pos==0){
          $return_to = "http://".$return_to;
        } else {
          $return_to = "http://".$_SERVER['SERVER_NAME']."/".$return_to;
        }//else (server name not at position zero)
      }//if return_to is relative
        
      //if realm is null, attempt to set it via return_to
      if(is_null($realm)){
        //if return_to is set
        if(!is_null($return_to)){
          $pieces = parse_url($return_to);
          $realm = $pieces['scheme']."://".$pieces['host'];
        }//if return_to set
      }//if realm null
    
      $this->mode = $mode;
      $this->op_endpoint = $op_endpoint;
      $this->response_nonce = $response_nonce;
      $this->return_to = $return_to;
      $this->realm = $realm;
      $this->assoc_handle = $assoc_handle;
      $this->claimed_id = $claimed_id;
      $this->identity = $claimed_id;
      $this->signed = $signed;
      $this->sig = $sig;
      $this->email = $email;
      $this->require_email = ($require_email) ? true : false;
    }//GoogleOpenID
    
    //static creator that accepts only a return_to URL
    //this creator should be used when creating a GoogleOpenID for a redirect
    public static function createRequest($return_to, $assoc_handle=null, $require_email=false){
      return new GoogleOpenID("checkid_setup", null, null, $return_to, null, $assoc_handle, "http://specs.openid.net/auth/2.0/identifier_select", null, null, null, $require_email);
    }//createRequest
    
    //static creator that accepts an associative array of parameters and
    //sets only the setable attributes (does not overwrite constants)
    public static function create($params){
      //loop through each parameter
      foreach($params as $param => $value){
        switch($param){
          case "openid_mode":
            //check validity of mode
            if($value=="checkid_setup" ||
               $value=="id_res" ||
               $value=="cancel")
              $mode = $value;
            else
              $mode = "cancel";
            continue 2;
            
          case "openid_op_endpoint":
            $op_endpoint = $value;
            continue 2;
              
          case "openid_response_nonce":
            $response_nonce = $value;
            continue 2;
            
          case "openid_return_to":
            $return_to = $value;
            continue 2;
            
          case "openid_realm":
            $realm = $value;
            continue 2;
            
          case "openid_assoc_handle":
            $assoc_handle = $value;
            continue 2;
            
          case "openid_claimed_id":
            $claimed_id = $value;
            continue 2;
            
          case "openid_identity":
            $claimed_id = $value;
            continue 2;
            
          case "openid_signed":
            $signed = $value;
            continue 2;
            
          case "openid_sig":
            $sig = $value;
            continue 2;
            
          case "openid_ext1_value_email":
            $email = $value;
            continue 2;
            
          case "require_email":
            $require_email = $value;
            continue 2;
            
          default:
            continue 2;  
        }//switch param
      }//loop through params

      //if require email is not set, set it to false
      if(!is_bool($require_email))
        $require_email = false;
      //if mode is not set, set to default for redirection
      if(is_null($mode))
        $mode = "checkid_setup";
      //if return_to is not set and mode is checkid_setup, throw an error
      if(is_null($return_to) && $mode=="checkid_setup")
        throw new Exception("GoogleOpenID.create() needs parameter openid.return_to");

      //return a new GoogleOpenID with the given parameters
      return new GoogleOpenID($mode, $op_endpoint, $response_nonce, $return_to, $realm, $assoc_handle, $claimed_id, $signed, $sig, $email, $require_email);
    }//create
    
    //creates and returns a GoogleOpenID from the $_GET variable
    public static function getResponse(){
      return GoogleOpenID::create($_GET);
    }//getResponse
    
    //fetches an association handle from google. association handles are valid
    //for two weeks, so coders should do their best to save association handles
    //externally and pass them to createRequest()
    //NOTE: This function does not use encryption, but it SHOULD! At the time
    //I wrote this I wanted it done fast, and I couldn't seem to find a good
    //two-way SHA-1 or SHA-256 library for PHP. Encryption is not my thing, so
    //it remains unimplemented.
    public static function getAssociationHandle($endpoint=null){
      //if no endpoint given
      if(is_null($endpoint))
        //fetch one from Google
        $request_url = GoogleOpenID::getEndPoint();
      //if endpoint given, set it
      else
        $request_url = $endpoint;
      
      //append parameters (these never change)
      $request_url .= "?openid.ns=".urlencode(GoogleOpenID::openid_ns);
      $request_url .= "&openid.mode=associate";
      $request_url .= "&openid.assoc_type=HMAC-SHA1";
      $request_url .= "&openid.session_type=no-encryption";
      
      //create a CURL session with the request URL
      $c = curl_init($request_url);
      
      //set a few options
      curl_setopt($c, CURLOPT_RETURNTRANSFER, true);
      curl_setopt($c, CURLOPT_HEADER, false);
      
      //get the contents of request URL
      $request_contents = curl_exec($c);
      
      //close the CURL session
      curl_close($c);
      
      //a handle to be returned
      $assoc_handle = null;
      
      //split the response into lines
      $lines = explode("\n", $request_contents);
      
      //loop through each line
      foreach($lines as $line){
        //if this line is assoc_handle
        if(substr($line, 0, 13)=="assoc_handle:"){
          //save the assoc handle
          $assoc_handle = substr($line, 13);
          //exit the loop
          break;
        }//if this line is assoc_handle
      }//loop through lines
      
      //return the handle
      return $assoc_handle;
    }//getAssociationHandle
    
    //fetches an endpoint from Google
    public static function getEndPoint(){
      //fetch the request URL
      $request_url = GoogleOpenID::google_discover_url;
      
      //create a CURL session with the request URL
      $c = curl_init($request_url);
      
      //set a few options
      curl_setopt($c, CURLOPT_RETURNTRANSFER, true);
      curl_setopt($c, CURLOPT_HEADER, false);
      
      //fetch the contents of the request URL
      $request_contents = curl_exec($c);
      
      //close the CURL session
      curl_close($c);
      
      //create a DOM document so we can extract the URI element
      $domdoc = new DOMDocument();
      $domdoc->loadXML($request_contents);
      
      //fetch the contents of the URI element
      $uri = $domdoc->getElementsByTagName("URI");
      $uri = $uri->item(0)->nodeValue;
      
      //return the given URI
      return $uri;
    }//getEndPoint
    
    //returns an associative array of all openid parameters for this openid
    //session. the array contains all the GET attributes that would be sent
    //or that have been recieved, meaning:
    //
    //if mode = "cancel" returns only the mode and ns attributes
    //if mode = "id_res" returns all attributes that are not null
    //if mode = "checkid_setup" returns only attributes that need to be sent
    //          in the HTTP request
    public function getArray(){
      //an associative array to return
      $ret = array();
      
      $ret['openid.ns'] = GoogleOpenID::openid_ns;
      
      //if mode is cancel, return only ns and mode
      if($this->mode=="cancel"){
        $ret['openid.mode'] = "cancel";
        return $ret;
      }//if cancel
      
      //set attributes that are returned for all cases
      if(!is_null($this->claimed_id)){
        $ret['openid.claimed_id'] = $this->claimed_id;
        $ret['openid.identity'] = $this->claimed_id;
      }
      if(!is_null($this->return_to))
        $ret['openid.return_to'] = $this->return_to;
      if(!is_null($this->realm))
        $ret['openid.realm'] = $this->realm;
      if(!is_null($this->assoc_handle))
        $ret['openid.assoc_handle'] = $this->assoc_handle;
      if(!is_null($this->mode))
        $ret['openid.mode'] = $this->mode;
        
      //set attributes that are returned only if this is a request
      //and if getting email is required OR if this is a response and the
      //email is given
      if(($this->mode=="checkid_setup" AND $this->require_email) OR
         ($this->mode=="id_res" AND !is_null($this->email))){
        $ret['openid.ns.ext1'] = GoogleOpenID::openid_ns_ext1;
        $ret['openid.ext1.mode'] = GoogleOpenID::openid_ext1_mode;
        $ret['openid.ext1.type.email'] = GoogleOpenID::openid_ext1_type_email;
        $ret['openid.ext1.required'] = GoogleOpenID::openid_ext1_required;
        if(!is_null($this->email))
          $ret['openid.ext1.value.email'] = $this->email;
      }//if redirect and get email
      
      //set attributes that are returned only if this is a response
      if($this->mode=="id_res"){
        $ret['openid.op_endpoint'] = $this->op_endpoint;
        if(!is_null($this->response_nonce))
          $ret['openid.response_nonce'] = $this->response_nonce;
        if(!is_null($this->signed))
          $ret['openid.signed'] = $this->signed;
        if(!is_null($this->sig))
          $ret['openid.sig'] = $this->sig;
      }
      
      //return the array
      return $ret;
    }//getArray
    
    //sends a request to google and fetches the url to which google is asking
    //us to redirect (unless the endpoint is already known, in which case the
    //function simply returns it)
    public function endPoint(){
      //if we know the value of op_endpoint already
      if(!is_null($this->op_endpoint))
        return $this->op_endpoint;
        
      //fetch the endpoint from Google
      $endpoint = GoogleOpenID::getEndPoint();
      
      //save it
      $this->op_endpoint = $endpoint;
      
      //return the endpoint
      return $endpoint;
    }//getedPoint
    
    //returns the URL to which we should send a request (including all GET params)
    private function getRequestURL(){
      //get all parameters
      $params = $this->getArray();
      
      //the base URL
      $url = $this->endPoint();
      
      //flag indicating whether to set a '?' or an '&'
      $first_attribute = true;
      
      //loop through all params
      foreach($params as $param => $value){
        //if first attribute print a ?, else print a &
        if($first_attribute){
          $url .= "?";
          $first_attribute = false;
        } else {
          $url .= "&";
        }//else (not first attribute)
        
        $url .= urlencode($param) . "=" . urlencode($value);
      }//loop through params
      
      //return the URL
      return $url;
    }//getRequestURL
    
    //redirects the browser to the appropriate request URL
    public function redirect(){
      header("Location: ".$this->getRequestURL());
    }//redirect
    
    //returns true if the response was a success
    public function success(){
      return ($this->mode=="id_res");
    }//success
    
    //returns the identity given in the response
    public function identity(){
      if($this->mode!="id_res")
        return null;
      else
        return $this->claimed_id;
    }//identity
    
    //returns the email given in the response
    public function email(){
      if($this->mode!="id_res")
        return null;
      else
        return $this->email;
    }//email
    
    //returns the assoc_handle
    public function assoc_handle(){
      return $this->assoc_handle;
    }//assoc_handle
  }//class GoogleOpenID
?>
