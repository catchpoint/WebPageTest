<?php
/*
 * Copyright 2010-2011 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

/**
 *
 *
 * Elastic Load Balancing is a cost-effective and easy to use web service to help you improve availability and scalability of your
 * application. It makes it easy for you to distribute application loads between two or more EC2 instances. Elastic Load Balancing enables
 * availability through redundancy and supports traffic growth of your application.
 *
 * @version Thu Sep 01 21:20:23 PDT 2011
 * @license See the included NOTICE.md file for complete information.
 * @copyright See the included NOTICE.md file for complete information.
 * @link http://aws.amazon.com/elasticloadbalancing/Amazon Elastic Load Balancing
 * @link http://aws.amazon.com/documentation/elasticloadbalancing/Amazon Elastic Load Balancing documentation
 */
class AmazonELB extends CFRuntime
{

	/*%******************************************************************************************%*/
	// CLASS CONSTANTS

	/**
	 * Specify the default queue URL.
	 */
	const DEFAULT_URL = 'elasticloadbalancing.us-east-1.amazonaws.com';

	/**
	 * Specify the queue URL for the US-East (Northern Virginia) Region.
	 */
	const REGION_US_E1 = self::DEFAULT_URL;

	/**
	 * Specify the queue URL for the US-West (Northern California) Region.
	 */
	const REGION_US_W1 = 'elasticloadbalancing.us-west-1.amazonaws.com';

	/**
	 * Specify the queue URL for the EU (Ireland) Region.
	 */
	const REGION_EU_W1 = 'elasticloadbalancing.eu-west-1.amazonaws.com';

	/**
	 * Specify the queue URL for the Asia Pacific (Singapore) Region.
	 */
	const REGION_APAC_SE1 = 'elasticloadbalancing.ap-southeast-1.amazonaws.com';

	/**
	 * Specify the queue URL for the Asia Pacific (Japan) Region.
	 */
	const REGION_APAC_NE1 = 'elasticloadbalancing.ap-northeast-1.amazonaws.com';


	/*%******************************************************************************************%*/
	// SETTERS

	/**
	 * This allows you to explicitly sets the region for the service to use.
	 *
	 * @param string $region (Required) The region to explicitly set. Available options are <REGION_US_E1>, <REGION_US_W1>, <REGION_EU_W1>, or <REGION_APAC_SE1>.
	 * @return $this A reference to the current instance.
	 */
	public function set_region($region)
	{
		$this->set_hostname($region);
		return $this;
	}


	/*%******************************************************************************************%*/
	// CONSTRUCTOR

	/**
	 * Constructs a new instance of <AmazonELB>.
	 *
	 * @param string $key (Optional) Your Amazon API Key. If blank, it will look for the <code>AWS_KEY</code> constant.
	 * @param string $secret_key (Optional) Your Amazon API Secret Key. If blank, it will look for the <code>AWS_SECRET_KEY</code> constant.
	 * @return boolean false if no valid values are set, otherwise true.
	 */
	public function __construct($key = null, $secret_key = null)
	{
		$this->api_version = '2011-08-15';
		$this->hostname = self::DEFAULT_URL;

		if (!$key && !defined('AWS_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new ELB_Exception('No account key was passed into the constructor, nor was it set in the AWS_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		if (!$secret_key && !defined('AWS_SECRET_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new ELB_Exception('No account secret was passed into the constructor, nor was it set in the AWS_SECRET_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		return parent::__construct($key, $secret_key);
	}


	/*%******************************************************************************************%*/
	// SERVICE METHODS

	/**
	 *
	 * Enables the client to define an application healthcheck for the instances.
	 *
	 * @param string $load_balancer_name (Required) The mnemonic name associated with the LoadBalancer. This name must be unique within the client AWS account.
	 * @param array $health_check (Required) A structure containing the configuration information for the new healthcheck. <ul>
	 * 	<li><code>Target</code> - <code>string</code> - Required - Specifies the instance being checked. The protocol is either TCP, HTTP, HTTPS, or SSL. The range of valid ports is one (1) through 65535. TCP is the default, specified as a TCP: port pair, for example "TCP:5000". In this case a healthcheck simply attempts to open a TCP connection to the instance on the specified port. Failure to connect within the configured timeout is considered unhealthy. SSL is also specified as SSL: port pair, for example, SSL:5000. For HTTP or HTTPS protocol, the situation is different. You have to include a ping path in the string. HTTP is specified as a HTTP:port;/;PathToPing; grouping, for example "HTTP:80/weather/us/wa/seattle". In this case, a HTTP GET request is issued to the instance on the given port and path. Any answer other than "200 OK" within the timeout period is considered unhealthy. The total length of the HTTP ping target needs to be 1024 16-bit Unicode characters or less. </li>
	 * 	<li><code>Interval</code> - <code>integer</code> - Required - Specifies the approximate interval, in seconds, between health checks of an individual instance. </li>
	 * 	<li><code>Timeout</code> - <code>integer</code> - Required - Specifies the amount of time, in seconds, during which no response means a failed health probe. This value must be less than the <i>Interval</i> value. </li>
	 * 	<li><code>UnhealthyThreshold</code> - <code>integer</code> - Required - Specifies the number of consecutive health probe failures required before moving the instance to the <i>Unhealthy</i> state. </li>
	 * 	<li><code>HealthyThreshold</code> - <code>integer</code> - Required - Specifies the number of consecutive health probe successes required before moving the instance to the <i>Healthy</i> state. </li>
	 * </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function configure_health_check($load_balancer_name, $health_check, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LoadBalancerName'] = $load_balancer_name;

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'HealthCheck' => (is_array($health_check) ? $health_check : array($health_check))
		), 'member'));

		return $this->authenticate('ConfigureHealthCheck', $opt, $this->hostname);
	}

	/**
	 *
	 * Replaces the current set of policies associated with a port on which the back-end server is listening with a new set of policies. After the
	 * policies have been created using CreateLoadBalancerPolicy, they can be applied here as a list. At this time, only the back-end server
	 * authentication policy type can be applied to the back-end ports; this policy type is composed of multiple public key policies.
	 *
	 * @param string $load_balancer_name (Required) The mnemonic name associated with the LoadBalancer. This name must be unique within the client AWS account.
	 * @param integer $instance_port (Required) The port number associated with the back-end server.
	 * @param string|array $policy_names (Required) List of policy names to be set. If the list is empty, then all current polices are removed from the back-end server.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function set_load_balancer_policies_for_backend_server($load_balancer_name, $instance_port, $policy_names, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LoadBalancerName'] = $load_balancer_name;
		$opt['InstancePort'] = $instance_port;

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'PolicyNames' => (is_array($policy_names) ? $policy_names : array($policy_names))
		), 'member'));

		return $this->authenticate('SetLoadBalancerPoliciesForBackendServer', $opt, $this->hostname);
	}

	/**
	 *
	 * Sets the certificate that terminates the specified listener's SSL connections. The specified certificate replaces any prior certificate
	 * that was used on the same LoadBalancer and port.
	 *
	 * @param string $load_balancer_name (Required) The name of the the LoadBalancer.
	 * @param integer $load_balancer_port (Required) The port that uses the specified SSL certificate.
	 * @param string $ssl_certificate_id (Required) The ID of the SSL certificate chain to use. For more information on SSL certificates, see Managing Server Certificates in the AWS Identity and Access Management documentation.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function set_load_balancer_listener_ssl_certificate($load_balancer_name, $load_balancer_port, $ssl_certificate_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LoadBalancerName'] = $load_balancer_name;
		$opt['LoadBalancerPort'] = $load_balancer_port;
		$opt['SSLCertificateId'] = $ssl_certificate_id;

		return $this->authenticate('SetLoadBalancerListenerSSLCertificate', $opt, $this->hostname);
	}

	/**
	 *
	 * Adds new instances to the LoadBalancer.
	 *
	 * Once the instance is registered, it starts receiving traffic and requests from the LoadBalancer. Any instance that is not in any of the
	 * Availability Zones registered for the LoadBalancer will be moved to the <i>OutOfService</i> state. It will move to the <i>InService</i>
	 * state when the Availability Zone is added to the LoadBalancer.
	 *
	 * In order for this call to be successful, the client must have created the LoadBalancer. The client must provide the same account
	 * credentials as those that were used to create the LoadBalancer.
	 *
	 * Completion of this API does not guarantee that operation has completed. Rather, it means that the request has been registered and the
	 * changes will happen shortly.
	 *
	 * @param string $load_balancer_name (Required) The name associated with the LoadBalancer. The name must be unique within the client AWS account.
	 * @param array $instances (Required) A list of instances IDs that should be registered with the LoadBalancer. <ul>
	 * 	<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 		<li><code>InstanceId</code> - <code>string</code> - Optional - Provides an EC2 instance ID. </li>
	 * 	</ul></li>
	 * </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function register_instances_with_load_balancer($load_balancer_name, $instances, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LoadBalancerName'] = $load_balancer_name;

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'Instances' => (is_array($instances) ? $instances : array($instances))
		), 'member'));

		return $this->authenticate('RegisterInstancesWithLoadBalancer', $opt, $this->hostname);
	}

	/**
	 *
	 * Associates, updates, or disables a policy with a listener on the LoadBalancer. You can associate multiple policies with a listener.
	 *
	 * @param string $load_balancer_name (Required) The name associated with the LoadBalancer. The name must be unique within the client AWS account.
	 * @param integer $load_balancer_port (Required) The external port of the LoadBalancer with which this policy applies to.
	 * @param string|array $policy_names (Required) List of policies to be associated with the listener. Currently this list can have at most one policy. If the list is empty, the current policy is removed from the listener.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function set_load_balancer_policies_of_listener($load_balancer_name, $load_balancer_port, $policy_names, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LoadBalancerName'] = $load_balancer_name;
		$opt['LoadBalancerPort'] = $load_balancer_port;

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'PolicyNames' => (is_array($policy_names) ? $policy_names : array($policy_names))
		), 'member'));

		return $this->authenticate('SetLoadBalancerPoliciesOfListener', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes listeners from the LoadBalancer for the specified port.
	 *
	 * @param string $load_balancer_name (Required) The mnemonic name associated with the LoadBalancer.
	 * @param integer LoadBalancerPorts (Required) The client port number(s) of the LoadBalancerListener(s) to be removed.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_load_balancer_listeners($load_balancer_name, $load_balancer_ports, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LoadBalancerName'] = $load_balancer_name;

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'LoadBalancerPorts' => (is_array($load_balancer_ports) ? $load_balancer_ports : array($load_balancer_ports))
		), 'member'));

		return $this->authenticate('DeleteLoadBalancerListeners', $opt, $this->hostname);
	}

	/**
	 *
	 * Generates a stickiness policy with sticky session lifetimes controlled by the lifetime of the browser (user-agent) or a specified
	 * expiration period. This policy can be associated only with HTTP/HTTPS listeners.
	 *
	 * When a LoadBalancer implements this policy, the LoadBalancer uses a special cookie to track the backend server instance for each request.
	 * When the LoadBalancer receives a request, it first checks to see if this cookie is present in the request. If so, the LoadBalancer sends the
	 * request to the application server specified in the cookie. If not, the LoadBalancer sends the request to a server that is chosen based on
	 * the existing load balancing algorithm.
	 *
	 * A cookie is inserted into the response for binding subsequent requests from the same user to that server. The validity of the cookie is
	 * based on the cookie expiration time, which is specified in the policy configuration.
	 *
	 * @param string $load_balancer_name (Required) The name associated with the LoadBalancer. The name must be unique within the client AWS account.
	 * @param string $policy_name (Required) The name of the policy being created. The name must be unique within the set of policies for this LoadBalancer.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>CookieExpirationPeriod</code> - <code>long</code> - Optional - The time period in seconds after which the cookie should be considered stale. Not specifying this parameter indicates that the sticky session will last for the duration of the browser session. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_lb_cookie_stickiness_policy($load_balancer_name, $policy_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LoadBalancerName'] = $load_balancer_name;
		$opt['PolicyName'] = $policy_name;

		return $this->authenticate('CreateLBCookieStickinessPolicy', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns detailed descriptions of the policies. If you specify a LoadBalancer name, the operation returns either the descriptions of the
	 * specified policies, or descriptions of all the policies created for the LoadBalancer. If you don't specify a LoadBalancer name, the
	 * operation returns descriptions of the specified sample policies, or descriptions of all the sample policies. The names of the sample
	 * policies have the <code>ELBSample-</code> prefix.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>LoadBalancerName</code> - <code>string</code> - Optional - The mnemonic name associated with the LoadBalancer. If no name is specified, the operation returns the attributes of either all the sample policies pre-defined by Elastic Load Balancing or the specified sample polices. </li>
	 * 	<li><code>PolicyNames</code> - <code>string|array</code> - Optional - The names of LoadBalancer policies you've created or Elastic Load Balancing sample policy names.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_load_balancer_policies($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['PolicyNames']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'PolicyNames' => (is_array($opt['PolicyNames']) ? $opt['PolicyNames'] : array($opt['PolicyNames']))
			), 'member'));
			unset($opt['PolicyNames']);
		}

		return $this->authenticate('DescribeLoadBalancerPolicies', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns meta-information on the specified LoadBalancer policies defined by the Elastic Load Balancing service. The policy types that are
	 * returned from this action can be used in a CreateLoadBalancerPolicy action to instantiate specific policy configurations that will be
	 * applied to an Elastic LoadBalancer.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>PolicyTypeNames</code> - <code>string|array</code> - Optional - Specifies the name of the policy types. If no names are specified, returns the description of all the policy types defined by Elastic Load Balancing service.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_load_balancer_policy_types($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['PolicyTypeNames']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'PolicyTypeNames' => (is_array($opt['PolicyTypeNames']) ? $opt['PolicyTypeNames'] : array($opt['PolicyTypeNames']))
			), 'member'));
			unset($opt['PolicyTypeNames']);
		}

		return $this->authenticate('DescribeLoadBalancerPolicyTypes', $opt, $this->hostname);
	}

	/**
	 *
	 * Removes the specified EC2 Availability Zones from the set of configured Availability Zones for the LoadBalancer.
	 *
	 * There must be at least one Availability Zone registered with a LoadBalancer at all times. A client cannot remove all the Availability Zones
	 * from a LoadBalancer. Once an Availability Zone is removed, all the instances registered with the LoadBalancer that are in the removed
	 * Availability Zone go into the OutOfService state. Upon Availability Zone removal, the LoadBalancer attempts to equally balance the traffic
	 * among its remaining usable Availability Zones. Trying to remove an Availability Zone that was not associated with the LoadBalancer does
	 * nothing.
	 *
	 * In order for this call to be successful, the client must have created the LoadBalancer. The client must provide the same account
	 * credentials as those that were used to create the LoadBalancer.
	 *
	 * @param string $load_balancer_name (Required) The name associated with the LoadBalancer. The name must be unique within the client AWS account.
	 * @param string|array $availability_zones (Required) A list of Availability Zones to be removed from the LoadBalancer. There must be at least one Availability Zone registered with a LoadBalancer at all times. The client cannot remove all the Availability Zones from a LoadBalancer. Specified Availability Zones must be in the same Region.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function disable_availability_zones_for_load_balancer($load_balancer_name, $availability_zones, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LoadBalancerName'] = $load_balancer_name;

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'AvailabilityZones' => (is_array($availability_zones) ? $availability_zones : array($availability_zones))
		), 'member'));

		return $this->authenticate('DisableAvailabilityZonesForLoadBalancer', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a new LoadBalancer.
	 *
	 * After the call has completed successfully, a new LoadBalancer is created; however, it will not be usable until at least one instance has
	 * been registered. When the LoadBalancer creation is completed, the client can check whether or not it is usable by using the
	 * DescribeInstanceHealth API. The LoadBalancer is usable as soon as any registered instance is <i>InService</i>.
	 *
	 * Currently, the client's quota of LoadBalancers is limited to ten per Region.
	 *
	 * LoadBalancer DNS names vary depending on the Region they're created in. For LoadBalancers created in the United States, the DNS name ends
	 * with:
	 *
	 * <ul> <li> <i>us-east-1.elb.amazonaws.com</i> (for the US Standard Region) </li>
	 *
	 * <li> <i>us-west-1.elb.amazonaws.com</i> (for the Northern California Region) </li>
	 *
	 * </ul>
	 *
	 * For LoadBalancers created in the EU (Ireland) Region, the DNS name ends with:
	 *
	 * <ul> <li> <i>eu-west-1.elb.amazonaws.com</i> </li>
	 *
	 * </ul>
	 *
	 * @param string $load_balancer_name (Required) The name associated with the LoadBalancer. The name must be unique within your set of LoadBalancers.
	 * @param array $listeners (Required) A list of the following tuples: LoadBalancerPort, InstancePort, and Protocol. <ul>
	 * 	<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 		<li><code>Protocol</code> - <code>string</code> - Required - Specifies the LoadBalancer transport protocol to use for routing - TCP or HTTP. This property cannot be modified for the life of the LoadBalancer. </li>
	 * 		<li><code>LoadBalancerPort</code> - <code>integer</code> - Required - Specifies the external LoadBalancer port number. This property cannot be modified for the life of the LoadBalancer. </li>
	 * 		<li><code>InstanceProtocol</code> - <code>string</code> - Optional - Specifies the protocol to use for routing traffic to back-end instances - HTTP, HTTPS, TCP, or SSL. This property cannot be modified for the life of the LoadBalancer. If the front-end protocol is HTTP or HTTPS, <code>InstanceProtocol</code> has to be at the same protocol layer, i.e., HTTP or HTTPS. Likewise, if the front-end protocol is TCP or SSL, InstanceProtocol has to be TCP or SSL. If there is another listener with the same <code>InstancePort</code> whose <code>InstanceProtocol</code> is secure, i.e., HTTPS or SSL, the listener's <code>InstanceProtocol</code> has to be secure, i.e., HTTPS or SSL. If there is another listener with the same <code>InstancePort</code> whose <code>InstanceProtocol</code> is HTTP or TCP, the listener's <code>InstanceProtocol</code> must be either HTTP or TCP. </li>
	 * 		<li><code>InstancePort</code> - <code>integer</code> - Required - Specifies the TCP port on which the instance server is listening. This property cannot be modified for the life of the LoadBalancer. </li>
	 * 		<li><code>SSLCertificateId</code> - <code>string</code> - Optional - The ID of the SSL certificate chain to use. For more information on SSL certificates, see Managing Keys and Certificates in the AWS Identity and Access Management documentation. </li>
	 * 	</ul></li>
	 * </ul>
	 * @param string|array $availability_zones (Required) A list of Availability Zones. At least one Availability Zone must be specified. Specified Availability Zones must be in the same EC2 Region as the LoadBalancer. Traffic will be equally distributed across all zones. This list can be modified after the creation of the LoadBalancer.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_load_balancer($load_balancer_name, $listeners, $availability_zones, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LoadBalancerName'] = $load_balancer_name;

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'Listeners' => (is_array($listeners) ? $listeners : array($listeners))
		), 'member'));

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'AvailabilityZones' => (is_array($availability_zones) ? $availability_zones : array($availability_zones))
		), 'member'));

		return $this->authenticate('CreateLoadBalancer', $opt, $this->hostname);
	}

	/**
	 *
	 * Adds one or more EC2 Availability Zones to the LoadBalancer.
	 *
	 * The LoadBalancer evenly distributes requests across all its registered Availability Zones that contain instances. As a result, the client
	 * must ensure that its LoadBalancer is appropriately scaled for each registered Availability Zone.
	 *
	 * The new EC2 Availability Zones to be added must be in the same EC2 Region as the Availability Zones for which the LoadBalancer was created.
	 *
	 * @param string $load_balancer_name (Required) The name associated with the LoadBalancer. The name must be unique within the client AWS account.
	 * @param string|array $availability_zones (Required) A list of new Availability Zones for the LoadBalancer. Each Availability Zone must be in the same Region as the LoadBalancer.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function enable_availability_zones_for_load_balancer($load_balancer_name, $availability_zones, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LoadBalancerName'] = $load_balancer_name;

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'AvailabilityZones' => (is_array($availability_zones) ? $availability_zones : array($availability_zones))
		), 'member'));

		return $this->authenticate('EnableAvailabilityZonesForLoadBalancer', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a new policy that contains the necessary attributes depending on the policy type. Policies are settings that are saved for your
	 * Elastic LoadBalancer and that can be applied to the front-end listener, or the back-end application server, depending on your policy type.
	 *
	 * @param string $load_balancer_name (Required) The name associated with the LoadBalancer for which the policy is being created. This name must be unique within the client AWS account.
	 * @param string $policy_name (Required) The name of the LoadBalancer policy being created. The name must be unique within the set of policies for this LoadBalancer.
	 * @param string $policy_type_name (Required) The name of the base policy type being used to create this policy. To get the list of policy types, use the DescribeLoadBalancerPolicyTypes action.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>PolicyAttributes</code> - <code>array</code> - Optional - A list of attributes associated with the policy being created. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>AttributeName</code> - <code>string</code> - Optional - The name of the attribute associated with the policy. </li>
	 * 			<li><code>AttributeValue</code> - <code>string</code> - Optional - The value of the attribute associated with the policy. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_load_balancer_policy($load_balancer_name, $policy_name, $policy_type_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LoadBalancerName'] = $load_balancer_name;
		$opt['PolicyName'] = $policy_name;
		$opt['PolicyTypeName'] = $policy_type_name;

		// Optional parameter
		if (isset($opt['PolicyAttributes']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'PolicyAttributes' => $opt['PolicyAttributes']
			), 'member'));
			unset($opt['PolicyAttributes']);
		}

		return $this->authenticate('CreateLoadBalancerPolicy', $opt, $this->hostname);
	}

	/**
	 *
	 * Deregisters instances from the LoadBalancer. Once the instance is deregistered, it will stop receiving traffic from the LoadBalancer.
	 *
	 * In order to successfully call this API, the same account credentials as those used to create the LoadBalancer must be provided.
	 *
	 * @param string $load_balancer_name (Required) The name associated with the LoadBalancer. The name must be unique within the client AWS account.
	 * @param array $instances (Required) A list of EC2 instance IDs consisting of all instances to be deregistered. <ul>
	 * 	<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 		<li><code>InstanceId</code> - <code>string</code> - Optional - Provides an EC2 instance ID. </li>
	 * 	</ul></li>
	 * </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function deregister_instances_from_load_balancer($load_balancer_name, $instances, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LoadBalancerName'] = $load_balancer_name;

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'Instances' => (is_array($instances) ? $instances : array($instances))
		), 'member'));

		return $this->authenticate('DeregisterInstancesFromLoadBalancer', $opt, $this->hostname);
	}

	/**
	 *
	 * Generates a stickiness policy with sticky session lifetimes that follow that of an application-generated cookie. This policy can be
	 * associated only with HTTP/HTTPS listeners.
	 *
	 * This policy is similar to the policy created by CreateLBCookieStickinessPolicy, except that the lifetime of the special Elastic Load
	 * Balancing cookie follows the lifetime of the application-generated cookie specified in the policy configuration. The LoadBalancer only
	 * inserts a new stickiness cookie when the application response includes a new application cookie.
	 *
	 * If the application cookie is explicitly removed or expires, the session stops being sticky until a new application cookie is issued.
	 *
	 * An application client must receive and send two cookies: the application-generated cookie and the special Elastic Load Balancing cookie
	 * named <code>AWSELB</code>. This is the default behavior for many common web browsers.
	 *
	 * @param string $load_balancer_name (Required) The name associated with the LoadBalancer. The name must be unique within the client AWS account.
	 * @param string $policy_name (Required) The name of the policy being created. The name must be unique within the set of policies for this LoadBalancer.
	 * @param string $cookie_name (Required) Name of the application cookie used for stickiness.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_app_cookie_stickiness_policy($load_balancer_name, $policy_name, $cookie_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LoadBalancerName'] = $load_balancer_name;
		$opt['PolicyName'] = $policy_name;
		$opt['CookieName'] = $cookie_name;

		return $this->authenticate('CreateAppCookieStickinessPolicy', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes the specified LoadBalancer.
	 *
	 * If attempting to recreate the LoadBalancer, the client must reconfigure all the settings. The DNS name associated with a deleted
	 * LoadBalancer will no longer be usable. Once deleted, the name and associated DNS record of the LoadBalancer no longer exist and traffic sent
	 * to any of its IP addresses will no longer be delivered to client instances. The client will not receive the same DNS name even if a new
	 * LoadBalancer with same LoadBalancerName is created.
	 *
	 * To successfully call this API, the client must provide the same account credentials as were used to create the LoadBalancer.
	 *
	 * By design, if the LoadBalancer does not exist or has already been deleted, DeleteLoadBalancer still succeeds.
	 *
	 * @param string $load_balancer_name (Required) The name associated with the LoadBalancer. The name must be unique within the client AWS account.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_load_balancer($load_balancer_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LoadBalancerName'] = $load_balancer_name;

		return $this->authenticate('DeleteLoadBalancer', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes a policy from the LoadBalancer. The specified policy must not be enabled for any listeners.
	 *
	 * @param string $load_balancer_name (Required) The mnemonic name associated with the LoadBalancer. The name must be unique within your AWS account.
	 * @param string $policy_name (Required) The mnemonic name for the policy being deleted.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_load_balancer_policy($load_balancer_name, $policy_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LoadBalancerName'] = $load_balancer_name;
		$opt['PolicyName'] = $policy_name;

		return $this->authenticate('DeleteLoadBalancerPolicy', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns the current state of the instances of the specified LoadBalancer. If no instances are specified, the state of all the instances for
	 * the LoadBalancer is returned.
	 *
	 * The client must have created the specified input LoadBalancer in order to retrieve this information; the client must provide the same
	 * account credentials as those that were used to create the LoadBalancer.
	 *
	 * @param string $load_balancer_name (Required) The name associated with the LoadBalancer. The name must be unique within the client AWS account.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Instances</code> - <code>array</code> - Optional - A list of instance IDs whose states are being queried. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>InstanceId</code> - <code>string</code> - Optional - Provides an EC2 instance ID. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_instance_health($load_balancer_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LoadBalancerName'] = $load_balancer_name;

		// Optional parameter
		if (isset($opt['Instances']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Instances' => $opt['Instances']
			), 'member'));
			unset($opt['Instances']);
		}

		return $this->authenticate('DescribeInstanceHealth', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns detailed configuration information for the specified LoadBalancers. If no LoadBalancers are specified, the operation returns
	 * configuration information for all LoadBalancers created by the caller.
	 *
	 * The client must have created the specified input LoadBalancers in order to retrieve this information; the client must provide the same
	 * account credentials as those that were used to create the LoadBalancer.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>LoadBalancerNames</code> - <code>string|array</code> - Optional - A list of names associated with the LoadBalancers at creation time.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_load_balancers($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['LoadBalancerNames']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'LoadBalancerNames' => (is_array($opt['LoadBalancerNames']) ? $opt['LoadBalancerNames'] : array($opt['LoadBalancerNames']))
			), 'member'));
			unset($opt['LoadBalancerNames']);
		}

		return $this->authenticate('DescribeLoadBalancers', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates one or more listeners on a LoadBalancer for the specified port. If a listener with the given port does not already exist, it will
	 * be created; otherwise, the properties of the new listener must match the properties of the existing listener.
	 *
	 * @param string $load_balancer_name (Required) The name of the new LoadBalancer. The name must be unique within your AWS account.
	 * @param array $listeners (Required) A list of <code>LoadBalancerPort</code>, <code>InstancePort</code>, <code>Protocol</code>, and <code>SSLCertificateId</code> items. <ul>
	 * 	<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 		<li><code>Protocol</code> - <code>string</code> - Required - Specifies the LoadBalancer transport protocol to use for routing - TCP or HTTP. This property cannot be modified for the life of the LoadBalancer. </li>
	 * 		<li><code>LoadBalancerPort</code> - <code>integer</code> - Required - Specifies the external LoadBalancer port number. This property cannot be modified for the life of the LoadBalancer. </li>
	 * 		<li><code>InstanceProtocol</code> - <code>string</code> - Optional - Specifies the protocol to use for routing traffic to back-end instances - HTTP, HTTPS, TCP, or SSL. This property cannot be modified for the life of the LoadBalancer. If the front-end protocol is HTTP or HTTPS, <code>InstanceProtocol</code> has to be at the same protocol layer, i.e., HTTP or HTTPS. Likewise, if the front-end protocol is TCP or SSL, InstanceProtocol has to be TCP or SSL. If there is another listener with the same <code>InstancePort</code> whose <code>InstanceProtocol</code> is secure, i.e., HTTPS or SSL, the listener's <code>InstanceProtocol</code> has to be secure, i.e., HTTPS or SSL. If there is another listener with the same <code>InstancePort</code> whose <code>InstanceProtocol</code> is HTTP or TCP, the listener's <code>InstanceProtocol</code> must be either HTTP or TCP. </li>
	 * 		<li><code>InstancePort</code> - <code>integer</code> - Required - Specifies the TCP port on which the instance server is listening. This property cannot be modified for the life of the LoadBalancer. </li>
	 * 		<li><code>SSLCertificateId</code> - <code>string</code> - Optional - The ID of the SSL certificate chain to use. For more information on SSL certificates, see Managing Keys and Certificates in the AWS Identity and Access Management documentation. </li>
	 * 	</ul></li>
	 * </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_load_balancer_listeners($load_balancer_name, $listeners, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LoadBalancerName'] = $load_balancer_name;

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'Listeners' => (is_array($listeners) ? $listeners : array($listeners))
		), 'member'));

		return $this->authenticate('CreateLoadBalancerListeners', $opt, $this->hostname);
	}
}


/*%******************************************************************************************%*/
// EXCEPTIONS

/**
 * Default ELB Exception.
 */
class ELB_Exception extends Exception {}