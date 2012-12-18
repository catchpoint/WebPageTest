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
 * Amazon Elastic Compute Cloud (Amazon EC2) is a web service that provides resizable compute capacity in the cloud. It is designed to make
 * web-scale computing easier for developers.
 *
 * Amazon EC2's simple web service interface allows you to obtain and configure capacity with minimal friction. It provides you with complete
 * control of your computing resources and lets you run on Amazon's proven computing environment. Amazon EC2 reduces the time required to
 * obtain and boot new server instances to minutes, allowing you to quickly scale capacity, both up and down, as your computing requirements
 * change. Amazon EC2 changes the economics of computing by allowing you to pay only for capacity that you actually use. Amazon EC2 provides
 * developers the tools to build failure resilient applications and isolate themselves from common failure scenarios.
 *
 * Visit <a href="http://aws.amazon.com/ec2/">http://aws.amazon.com/ec2/</a> for more information.
 *
 * @version Tue Aug 23 12:47:35 PDT 2011
 * @license See the included NOTICE.md file for complete information.
 * @copyright See the included NOTICE.md file for complete information.
 * @link http://aws.amazon.com/ec2/Amazon Elastic Compute Cloud
 * @link http://aws.amazon.com/documentation/ec2/Amazon Elastic Compute Cloud documentation
 */
class AmazonEC2 extends CFRuntime
{

	/*%******************************************************************************************%*/
	// CLASS CONSTANTS

	/**
	 * Specify the default queue URL.
	 */
	const DEFAULT_URL = 'ec2.amazonaws.com';

	/**
	 * Specify the queue URL for the US-East (Northern Virginia) Region.
	 */
	const REGION_US_E1 = 'us-east-1';

	/**
	 * Specify the queue URL for the US-West (Northern California) Region.
	 */
	const REGION_US_W1 = 'us-west-1';

	/**
	 * Specify the queue URL for the EU (Ireland) Region.
	 */
	const REGION_EU_W1 = 'eu-west-1';

	/**
	 * Specify the queue URL for the Asia Pacific (Singapore) Region.
	 */
	const REGION_APAC_SE1 = 'ap-southeast-1';

	/**
	 * Specify the queue URL for the Asia Pacific (Japan) Region.
	 */
	const REGION_APAC_NE1 = 'ap-northeast-1';

	/**
	 * The "pending" state code of an EC2 instance. Useful for conditionals.
	 */
	const STATE_PENDING = 0;

	/**
	 * The "running" state code of an EC2 instance. Useful for conditionals.
	 */
	const STATE_RUNNING = 16;

	/**
	 * The "shutting-down" state code of an EC2 instance. Useful for conditionals.
	 */
	const STATE_SHUTTING_DOWN = 32;

	/**
	 * The "terminated" state code of an EC2 instance. Useful for conditionals.
	 */
	const STATE_TERMINATED = 48;

	/**
	 * The "stopping" state code of an EC2 instance. Useful for conditionals.
	 */
	const STATE_STOPPING = 64;

	/**
	 * The "stopped" state code of an EC2 instance. Useful for conditionals.
	 */
	const STATE_STOPPED = 80;


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
		$this->set_hostname('http://ec2.'. $region .'.amazonaws.com');
		return $this;
	}


	/*%******************************************************************************************%*/
	// CONSTRUCTOR

	/**
	 * Constructs a new instance of <AmazonEC2>. If the <code>AWS_DEFAULT_CACHE_CONFIG</code> configuration
	 * option is set, requests will be authenticated using a session token. Otherwise, requests will use
	 * the older authentication method.
	 *
	 * @param string $key (Optional) Your AWS key, or a session key. If blank, it will look for the <code>AWS_KEY</code> constant.
	 * @param string $secret_key (Optional) Your AWS secret key, or a session secret key. If blank, it will look for the <code>AWS_SECRET_KEY</code> constant.
	 * @param string $token (optional) An AWS session token. If blank, a request will be made to the AWS Secure Token Service to fetch a set of session credentials.
	 * @return boolean A value of <code>false</code> if no valid values are set, otherwise <code>true</code>.
	 */
	public function __construct($key = null, $secret_key = null, $token = null)
	{
		$this->api_version = '2011-07-15';
		$this->hostname = self::DEFAULT_URL;

		if (!$key && !defined('AWS_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new EC2_Exception('No account key was passed into the constructor, nor was it set in the AWS_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		if (!$secret_key && !defined('AWS_SECRET_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new EC2_Exception('No account secret was passed into the constructor, nor was it set in the AWS_SECRET_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		if (defined('AWS_DEFAULT_CACHE_CONFIG') && AWS_DEFAULT_CACHE_CONFIG)
		{
			return parent::session_based_auth($key, $secret_key, $token);
		}

		return parent::__construct($key, $secret_key);
	}


	/*%******************************************************************************************%*/
	// SERVICE METHODS

	/**
	 *
	 * The RebootInstances operation requests a reboot of one or more instances. This operation is asynchronous; it only queues a request to
	 * reboot the specified instance(s). The operation will succeed if the instances are valid and belong to the user. Requests to reboot
	 * terminated instances are ignored.
	 *
	 * @param string|array $instance_id (Required) The list of instances to terminate.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function reboot_instances($instance_id, $opt = null)
	{
		if (!$opt) $opt = array();

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'InstanceId' => (is_array($instance_id) ? $instance_id : array($instance_id))
		)));

		return $this->authenticate('RebootInstances', $opt, $this->hostname);
	}

	/**
	 *
	 * The DescribeReservedInstances operation describes Reserved Instances that were purchased for use with your account.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>ReservedInstancesId</code> - <code>string|array</code> - Optional - The optional list of Reserved Instance IDs to describe.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for ReservedInstances. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_reserved_instances($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['ReservedInstancesId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'ReservedInstancesId' => (is_array($opt['ReservedInstancesId']) ? $opt['ReservedInstancesId'] : array($opt['ReservedInstancesId']))
			)));
			unset($opt['ReservedInstancesId']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeReservedInstances', $opt, $this->hostname);
	}

	/**
	 *
	 * The DescribeAvailabilityZones operation describes availability zones that are currently available to the account and their states.
	 *
	 * Availability zones are not the same across accounts. The availability zone <code>us-east-1a</code> for account A is not necessarily the
	 * same as <code>us-east-1a</code> for account B. Zone assignments are mapped independently for each account.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>ZoneName</code> - <code>string|array</code> - Optional - A list of the availability zone names to describe.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for AvailabilityZones. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_availability_zones($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['ZoneName']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'ZoneName' => (is_array($opt['ZoneName']) ? $opt['ZoneName'] : array($opt['ZoneName']))
			)));
			unset($opt['ZoneName']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeAvailabilityZones', $opt, $this->hostname);
	}

	/**
	 *
	 * Detach a previously attached volume from a running instance.
	 *
	 * @param string $volume_id (Required) The ID of the volume to detach.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>InstanceId</code> - <code>string</code> - Optional - The ID of the instance from which to detach the the specified volume. </li>
	 * 	<li><code>Device</code> - <code>string</code> - Optional - The device name to which the volume is attached on the specified instance. </li>
	 * 	<li><code>Force</code> - <code>boolean</code> - Optional - Forces detachment if the previous detachment attempt did not occur cleanly (logging into an instance, unmounting the volume, and detaching normally). This option can lead to data loss or a corrupted file system. Use this option only as a last resort to detach a volume from a failed instance. The instance will not have an opportunity to flush file system caches nor file system meta data. If you use this option, you must perform file system check and repair procedures. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function detach_volume($volume_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['VolumeId'] = $volume_id;

		return $this->authenticate('DetachVolume', $opt, $this->hostname);
	}

	/**
	 *
	 * The DeleteKeyPair operation deletes a key pair.
	 *
	 * @param string $key_name (Required) The name of the Amazon EC2 key pair to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_key_pair($key_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['KeyName'] = $key_name;

		return $this->authenticate('DeleteKeyPair', $opt, $this->hostname);
	}

	/**
	 *
	 * Disables monitoring for a running instance.
	 *
	 * @param string|array $instance_id (Required) The list of Amazon EC2 instances on which to disable monitoring.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function unmonitor_instances($instance_id, $opt = null)
	{
		if (!$opt) $opt = array();

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'InstanceId' => (is_array($instance_id) ? $instance_id : array($instance_id))
		)));

		return $this->authenticate('UnmonitorInstances', $opt, $this->hostname);
	}

	/**
	 *
	 * Attaches a VPN gateway to a VPC. This is the last step required to get your VPC fully connected to your data center before launching
	 * instances in it. For more information, go to Process for Using Amazon VPC in the Amazon Virtual Private Cloud Developer Guide.
	 *
	 * @param string $vpn_gateway_id (Required) The ID of the VPN gateway to attach to the VPC.
	 * @param string $vpc_id (Required) The ID of the VPC to attach to the VPN gateway.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function attach_vpn_gateway($vpn_gateway_id, $vpc_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['VpnGatewayId'] = $vpn_gateway_id;
		$opt['VpcId'] = $vpc_id;

		return $this->authenticate('AttachVpnGateway', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates an Amazon EBS-backed AMI from a "running" or "stopped" instance. AMIs that use an Amazon EBS root device boot faster than AMIs that
	 * use instance stores. They can be up to 1 TiB in size, use storage that persists on instance failure, and can be stopped and started.
	 *
	 * @param string $instance_id (Required) The ID of the instance from which to create the new image.
	 * @param string $name (Required) The name for the new AMI being created.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Description</code> - <code>string</code> - Optional - The description for the new AMI being created. </li>
	 * 	<li><code>NoReboot</code> - <code>boolean</code> - Optional - By default this property is set to <code>false</code>, which means Amazon EC2 attempts to cleanly shut down the instance before image creation and reboots the instance afterwards. When set to true, Amazon EC2 will not shut down the instance before creating the image. When this option is used, file system integrity on the created image cannot be guaranteed. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_image($instance_id, $name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['InstanceId'] = $instance_id;
		$opt['Name'] = $name;

		return $this->authenticate('CreateImage', $opt, $this->hostname);
	}

	/**
	 *
	 * The DeleteSecurityGroup operation deletes a security group.
	 *
	 * If you attempt to delete a security group that contains instances, a fault is returned.
	 *
	 * If you attempt to delete a security group that is referenced by another security group, a fault is returned. For example, if security group
	 * B has a rule that allows access from security group A, security group A cannot be deleted until the allow rule is removed.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>GroupName</code> - <code>string</code> - Optional - The name of the Amazon EC2 security group to delete. </li>
	 * 	<li><code>GroupId</code> - <code>string</code> - Optional - The ID of the Amazon EC2 security group to delete. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_security_group($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('DeleteSecurityGroup', $opt, $this->hostname);
	}

	/**
	 *
	 * This action applies only to security groups in a VPC; it's not supported for EC2 security groups. For information about Amazon Virtual
	 * Private Cloud and VPC security groups, go to the Amazon Virtual Private Cloud User Guide.
	 *
	 * The action adds one or more egress rules to a VPC security group. Specifically, this permits instances in a security group to send traffic
	 * to either one or more destination CIDR IP address ranges, or to one or more destination security groups in the same VPC.
	 *
	 * Each rule consists of the protocol (e.g., TCP), plus either a CIDR range, or a source group. For the TCP and UDP protocols, you must also
	 * specify the destination port or port range. For the ICMP protocol, you must also specify the ICMP type and code. You can use <code>-1</code>
	 * as a wildcard for the ICMP type or code.
	 *
	 * Rule changes are propagated to instances within the security group as quickly as possible. However, a small delay might occur.
	 *
	 * <b>Important: </b> For VPC security groups: You can have up to 50 rules total per group (covering both ingress and egress).
	 *
	 * @param string $group_id (Required) ID of the VPC security group to modify.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>IpPermissions</code> - <code>array</code> - Optional - List of IP permissions to authorize on the specified security group. Specifying permissions through IP permissions is the preferred way of authorizing permissions since it offers more flexibility and control. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>IpProtocol</code> - <code>string</code> - Optional - The IP protocol of this permission. Valid protocol values: <code>tcp</code>, <code>udp</code>, <code>icmp</code> </li>
	 * 			<li><code>FromPort</code> - <code>integer</code> - Optional - Start of port range for the TCP and UDP protocols, or an ICMP type number. An ICMP type number of <code>-1</code> indicates a wildcard (i.e., any ICMP type number). </li>
	 * 			<li><code>ToPort</code> - <code>integer</code> - Optional - End of port range for the TCP and UDP protocols, or an ICMP code. An ICMP code of <code>-1</code> indicates a wildcard (i.e., any ICMP code). </li>
	 * 			<li><code>Groups</code> - <code>array</code> - Optional - The list of AWS user IDs and groups included in this permission. <ul>
	 * 				<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 					<li><code>UserId</code> - <code>string</code> - Optional - The AWS user ID of an account. </li>
	 * 					<li><code>GroupName</code> - <code>string</code> - Optional - Name of the security group in the specified AWS account. Cannot be used when specifying a CIDR IP address range. </li>
	 * 					<li><code>GroupId</code> - <code>string</code> - Optional - ID of the security group in the specified AWS account. Cannot be used when specifying a CIDR IP address range. </li>
	 * 				</ul></li>
	 * 			</ul></li>
	 * 			<li><code>IpRanges</code> - <code>string|array</code> - Optional - The list of CIDR IP ranges included in this permission.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function authorize_security_group_egress($group_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['GroupId'] = $group_id;

		// Optional parameter
		if (isset($opt['IpPermissions']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'IpPermissions' => $opt['IpPermissions']
			)));
			unset($opt['IpPermissions']);
		}

		return $this->authenticate('AuthorizeSecurityGroupEgress', $opt, $this->hostname);
	}

	/**
	 * Retrieves the encrypted administrator password for the instances running Windows.
	 *
	 * The Windows password is only generated the first time an AMI is launched. It is not generated for
	 * rebundled AMIs or after the password is changed on an instance. The password is encrypted using the
	 * key pair that you provided.
	 *
	 * @param string $instance_id (Required) The ID of the instance for which you want the Windows administrator password.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>DecryptPasswordWithKey</code> - <code>string</code> - Optional - Enables the decryption of the Administrator password for the given Microsoft Windows instance. Specifies the RSA private key that is associated with the keypair ID which was used to launch the Microsoft Windows instance.</li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 *  <li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This is useful for manually-managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function get_password_data($instance_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['InstanceId'] = $instance_id;

		// Unless DecryptPasswordWithKey is set, simply return the response.
		if (!isset($opt['DecryptPasswordWithKey']))
		{
			return $this->authenticate('GetPasswordData', $opt, $this->hostname);
		}

		// Otherwise, decrypt the password.
		else
		{
			// Get a resource representing the private key.
			$private_key = openssl_pkey_get_private($opt['DecryptPasswordWithKey']);
			unset($opt['DecryptPasswordWithKey']);

			// Fetch the encrypted password.
			$response = $this->authenticate('GetPasswordData', $opt, $this->hostname);
			$data = trim((string) $response->body->passwordData);

			// If it's Base64-encoded...
			if ($this->util->is_base64($data))
			{
				// Base64-decode it, and decrypt it with the private key.
				if (openssl_private_decrypt(base64_decode($data), $decrypted, $private_key))
				{
					// Replace the previous password data with the decrypted value.
					$response->body->passwordData = $decrypted;
				}
			}

			return $response;
		}
	}

	/**
	 *
	 * Associates a set of DHCP options (that you've previously created) with the specified VPC. Or, associates the default DHCP options with the
	 * VPC. The default set consists of the standard EC2 host name, no domain name, no DNS server, no NTP server, and no NetBIOS server or node
	 * type. After you associate the options with the VPC, any existing instances and all new instances that you launch in that VPC use the
	 * options. For more information about the supported DHCP options and using them with Amazon VPC, go to Using DHCP Options in the Amazon
	 * Virtual Private Cloud Developer Guide.
	 *
	 * @param string $dhcp_options_id (Required) The ID of the DHCP options to associate with the VPC. Specify "default" to associate the default DHCP options with the VPC.
	 * @param string $vpc_id (Required) The ID of the VPC to associate the DHCP options with.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function associate_dhcp_options($dhcp_options_id, $vpc_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DhcpOptionsId'] = $dhcp_options_id;
		$opt['VpcId'] = $vpc_id;

		return $this->authenticate('AssociateDhcpOptions', $opt, $this->hostname);
	}

	/**
	 *
	 * Stops an instance that uses an Amazon EBS volume as its root device. Instances that use Amazon EBS volumes as their root devices can be
	 * quickly stopped and started. When an instance is stopped, the compute resources are released and you are not billed for hourly instance
	 * usage. However, your root partition Amazon EBS volume remains, continues to persist your data, and you are charged for Amazon EBS volume
	 * usage. You can restart your instance at any time.
	 *
	 * Before stopping an instance, make sure it is in a state from which it can be restarted. Stopping an instance does not preserve data stored
	 * in RAM.
	 *
	 * Performing this operation on an instance that uses an instance store as its root device returns an error.
	 *
	 * @param string|array $instance_id (Required) The list of Amazon EC2 instances to stop.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Force</code> - <code>boolean</code> - Optional - Forces the instance to stop. The instance will not have an opportunity to flush file system caches nor file system meta data. If you use this option, you must perform file system check and repair procedures. This option is not recommended for Windows instances. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function stop_instances($instance_id, $opt = null)
	{
		if (!$opt) $opt = array();

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'InstanceId' => (is_array($instance_id) ? $instance_id : array($instance_id))
		)));

		return $this->authenticate('StopInstances', $opt, $this->hostname);
	}

	/**
	 * Imports the public key from an RSA key pair created with a third-party tool. This operation differs
	 * from CreateKeyPair as the private key is never transferred between the caller and AWS servers.
	 *
	 * RSA key pairs are easily created on Microsoft Windows and Linux OS systems using the <code>ssh-keygen</code>
	 * command line tool provided with the standard OpenSSH installation. Standard library support for RSA
	 * key pair creation is also available for Java, Ruby, Python, and many other programming languages.
	 *
	 * The following formats are supported:
	 *
	 * <ul>
	 * 	<li>OpenSSH public key format.</li>
	 * 	<li>Base64 encoded DER format.</li>
	 * 	<li>SSH public key file format as specified in <a href="http://tools.ietf.org/html/rfc4716">RFC 4716</a>.</li>
	 * </ul>
	 *
	 * @param string $key_name (Required) The unique name for the key pair.
	 * @param string $public_key_material (Required) The public key portion of the key pair being imported.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 *  <li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This is useful for manually-managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function import_key_pair($key_name, $public_key_material, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['KeyName'] = $key_name;
		$opt['PublicKeyMaterial'] = $this->util->is_base64($public_key_material) ? $public_key_material : base64_encode($public_key_material);

		return $this->authenticate('ImportKeyPair', $opt, $this->hostname);
	}

	/**
	 *
	 * The CreateSecurityGroup operation creates a new security group.
	 *
	 * Every instance is launched in a security group. If no security group is specified during launch, the instances are launched in the default
	 * security group. Instances within the same security group have unrestricted network access to each other. Instances will reject network
	 * access attempts from other instances in a different security group. As the owner of instances you can grant or revoke specific permissions
	 * using the AuthorizeSecurityGroupIngress and RevokeSecurityGroupIngress operations.
	 *
	 * @param string $group_name (Required) Name of the security group.
	 * @param string $group_description (Required) Description of the group. This is informational only.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>VpcId</code> - <code>string</code> - Optional - ID of the VPC. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_security_group($group_name, $group_description, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['GroupName'] = $group_name;
		$opt['GroupDescription'] = $group_description;

		return $this->authenticate('CreateSecurityGroup', $opt, $this->hostname);
	}

	/**
	 *
	 * Describes the Spot Price history.
	 *
	 * Spot Instances are instances that Amazon EC2 starts on your behalf when the maximum price that you specify exceeds the current Spot Price.
	 * Amazon EC2 periodically sets the Spot Price based on available Spot Instance capacity and current spot instance requests.
	 *
	 * For conceptual information about Spot Instances, refer to the Amazon Elastic Compute Cloud Developer Guide or Amazon Elastic Compute Cloud
	 * User Guide.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>StartTime</code> - <code>string</code> - Optional - The start date and time of the Spot Instance price history data. May be passed as a number of seconds since UNIX Epoch, or any string compatible with <php:strtotime()>.</li>
	 * 	<li><code>EndTime</code> - <code>string</code> - Optional - The end date and time of the Spot Instance price history data. May be passed as a number of seconds since UNIX Epoch, or any string compatible with <php:strtotime()>.</li>
	 * 	<li><code>InstanceType</code> - <code>string|array</code> - Optional - Specifies the instance type to return.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>ProductDescription</code> - <code>string|array</code> - Optional - The description of the AMI.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for SpotPriceHistory. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>AvailabilityZone</code> - <code>string</code> - Optional - Filters the results by availability zone (ex: 'us-east-1a'). </li>
	 * 	<li><code>MaxResults</code> - <code>integer</code> - Optional - Specifies the number of rows to return. </li>
	 * 	<li><code>NextToken</code> - <code>string</code> - Optional - Specifies the next set of rows to return. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_spot_price_history($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['StartTime']))
		{
			$opt['StartTime'] = $this->util->convert_date_to_iso8601($opt['StartTime']);
		}

		// Optional parameter
		if (isset($opt['EndTime']))
		{
			$opt['EndTime'] = $this->util->convert_date_to_iso8601($opt['EndTime']);
		}

		// Optional parameter
		if (isset($opt['InstanceType']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'InstanceType' => (is_array($opt['InstanceType']) ? $opt['InstanceType'] : array($opt['InstanceType']))
			)));
			unset($opt['InstanceType']);
		}

		// Optional parameter
		if (isset($opt['ProductDescription']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'ProductDescription' => (is_array($opt['ProductDescription']) ? $opt['ProductDescription'] : array($opt['ProductDescription']))
			)));
			unset($opt['ProductDescription']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeSpotPriceHistory', $opt, $this->hostname);
	}

	/**
	 *
	 * The DescribeRegions operation describes regions zones that are currently available to the account.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>RegionName</code> - <code>string|array</code> - Optional - The optional list of regions to describe.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for Regions. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_regions($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['RegionName']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'RegionName' => (is_array($opt['RegionName']) ? $opt['RegionName'] : array($opt['RegionName']))
			)));
			unset($opt['RegionName']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeRegions', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a set of DHCP options that you can then associate with one or more VPCs, causing all existing and new instances that you launch in
	 * those VPCs to use the set of DHCP options. The following table lists the individual DHCP options you can specify. For more information about
	 * the options, go to <a href="http://www.ietf.org/rfc/rfc2132.txt">http://www.ietf.org/rfc/rfc2132.txt</a>
	 *
	 * @param array $dhcp_configuration (Required) A set of one or more DHCP configurations. <ul>
	 * 	<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 		<li><code>Key</code> - <code>string</code> - Optional - Contains the name of a DHCP option. </li>
	 * 		<li><code>Value</code> - <code>string|array</code> - Optional - Contains a set of values for a DHCP option.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	</ul></li>
	 * </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_dhcp_options($dhcp_configuration, $opt = null)
	{
		if (!$opt) $opt = array();

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'DhcpConfiguration' => (is_array($dhcp_configuration) ? $dhcp_configuration : array($dhcp_configuration))
		)));

		return $this->authenticate('CreateDhcpOptions', $opt, $this->hostname);
	}

	/**
	 *
	 * Resets permission settings for the specified snapshot.
	 *
	 * @param string $snapshot_id (Required) The ID of the snapshot whose attribute is being reset.
	 * @param string $attribute (Required) The name of the attribute being reset. Available attribute names: <code>createVolumePermission</code>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function reset_snapshot_attribute($snapshot_id, $attribute, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['SnapshotId'] = $snapshot_id;
		$opt['Attribute'] = $attribute;

		return $this->authenticate('ResetSnapshotAttribute', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes a route from a route table in a VPC. For more information about route tables, go to <a
	 * href="http://docs.amazonwebservices.com/AmazonVPC/latest/UserGuide/VPC_Route_Tables.html">Route Tables</a> in the Amazon Virtual Private
	 * Cloud User Guide.
	 *
	 * @param string $route_table_id (Required) The ID of the route table where the route will be deleted.
	 * @param string $destination_cidr_block (Required) The CIDR range for the route you want to delete. The value you specify must exactly match the CIDR for the route you want to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_route($route_table_id, $destination_cidr_block, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['RouteTableId'] = $route_table_id;
		$opt['DestinationCidrBlock'] = $destination_cidr_block;

		return $this->authenticate('DeleteRoute', $opt, $this->hostname);
	}

	/**
	 *
	 * Gives you information about your Internet gateways. You can filter the results to return information only about Internet gateways that
	 * match criteria you specify. For example, you could get information only about gateways with particular tags. The Internet gateway must match
	 * at least one of the specified values for it to be included in the results.
	 *
	 * You can specify multiple filters (e.g., the Internet gateway is attached to a particular VPC and is tagged with a particular value). The
	 * result includes information for a particular Internet gateway only if the gateway matches all your filters. If there's no match, no special
	 * message is returned; the response is simply empty.
	 *
	 * You can use wildcards with the filter values: an asterisk matches zero or more characters, and <code>?</code> matches exactly one
	 * character. You can escape special characters using a backslash before the character. For example, a value of <code>\*amazon\?\\</code>
	 * searches for the literal string <code>*amazon?\</code>.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>InternetGatewayId</code> - <code>string|array</code> - Optional - One or more Internet gateway IDs.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for Internet Gateways. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_internet_gateways($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['InternetGatewayId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'InternetGatewayId' => (is_array($opt['InternetGatewayId']) ? $opt['InternetGatewayId'] : array($opt['InternetGatewayId']))
			)));
			unset($opt['InternetGatewayId']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeInternetGateways', $opt, $this->hostname);
	}

	/**
	 *
	 * The DescribeSecurityGroups operation returns information about security groups that you own.
	 *
	 * If you specify security group names, information about those security group is returned. Otherwise, information for all security group is
	 * returned. If you specify a group that does not exist, a fault is returned.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>GroupName</code> - <code>string|array</code> - Optional - The optional list of Amazon EC2 security groups to describe.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>GroupId</code> - <code>string|array</code> - Optional -   Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for SecurityGroups. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_security_groups($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['GroupName']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'GroupName' => (is_array($opt['GroupName']) ? $opt['GroupName'] : array($opt['GroupName']))
			)));
			unset($opt['GroupName']);
		}

		// Optional parameter
		if (isset($opt['GroupId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'GroupId' => (is_array($opt['GroupId']) ? $opt['GroupId'] : array($opt['GroupId']))
			)));
			unset($opt['GroupId']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeSecurityGroups', $opt, $this->hostname);
	}

	/**
	 *
	 * Detaches a VPN gateway from a VPC. You do this if you're planning to turn off the VPC and not use it anymore. You can confirm a VPN gateway
	 * has been completely detached from a VPC by describing the VPN gateway (any attachments to the VPN gateway are also described).
	 *
	 * You must wait for the attachment's state to switch to detached before you can delete the VPC or attach a different VPC to the VPN gateway.
	 *
	 * @param string $vpn_gateway_id (Required) The ID of the VPN gateway to detach from the VPC.
	 * @param string $vpc_id (Required) The ID of the VPC to detach the VPN gateway from.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function detach_vpn_gateway($vpn_gateway_id, $vpc_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['VpnGatewayId'] = $vpn_gateway_id;
		$opt['VpcId'] = $vpc_id;

		return $this->authenticate('DetachVpnGateway', $opt, $this->hostname);
	}

	/**
	 *
	 * The DeregisterImage operation deregisters an AMI. Once deregistered, instances of the AMI can no longer be launched.
	 *
	 * @param string $image_id (Required) The ID of the AMI to deregister.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function deregister_image($image_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['ImageId'] = $image_id;

		return $this->authenticate('DeregisterImage', $opt, $this->hostname);
	}

	/**
	 *
	 * Describes the data feed for Spot Instances.
	 *
	 * For conceptual information about Spot Instances, refer to the Amazon Elastic Compute Cloud Developer Guide or Amazon Elastic Compute Cloud
	 * User Guide.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_spot_datafeed_subscription($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('DescribeSpotDatafeedSubscription', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes tags from the specified Amazon EC2 resources.
	 *
	 * @param string|array $resource_id (Required) A list of one or more resource IDs. This could be the ID of an AMI, an instance, an EBS volume, or snapshot, etc.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Tag</code> - <code>array</code> - Optional - The tags to delete from the specified resources. Each tag item consists of a key-value pair. If a tag is specified without a value, the tag and all of its values are deleted. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Key</code> - <code>string</code> - Optional - The tag's key. </li>
	 * 			<li><code>Value</code> - <code>string</code> - Optional - The tag's value. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_tags($resource_id, $opt = null)
	{
		if (!$opt) $opt = array();

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'ResourceId' => (is_array($resource_id) ? $resource_id : array($resource_id))
		)));

		// Optional parameter
		if (isset($opt['Tag']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Tag' => $opt['Tag']
			)));
			unset($opt['Tag']);
		}

		return $this->authenticate('DeleteTags', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes a subnet from a VPC. You must terminate all running instances in the subnet before deleting it, otherwise Amazon VPC returns an
	 * error.
	 *
	 * @param string $subnet_id (Required) The ID of the subnet you want to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_subnet($subnet_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['SubnetId'] = $subnet_id;

		return $this->authenticate('DeleteSubnet', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a new VPN gateway. A VPN gateway is the VPC-side endpoint for your VPN connection. You can create a VPN gateway before creating the
	 * VPC itself.
	 *
	 * @param string $type (Required) The type of VPN connection this VPN gateway supports.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>AvailabilityZone</code> - <code>string</code> - Optional - The Availability Zone in which to create the VPN gateway. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_vpn_gateway($type, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['Type'] = $type;

		return $this->authenticate('CreateVpnGateway', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes a VPN gateway. Use this when you want to delete a VPC and all its associated components because you no longer need them. We
	 * recommend that before you delete a VPN gateway, you detach it from the VPC and delete the VPN connection. Note that you don't need to delete
	 * the VPN gateway if you just want to delete and re-create the VPN connection between your VPC and data center.
	 *
	 * @param string $vpn_gateway_id (Required) The ID of the VPN gateway to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_vpn_gateway($vpn_gateway_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['VpnGatewayId'] = $vpn_gateway_id;

		return $this->authenticate('DeleteVpnGateway', $opt, $this->hostname);
	}

	/**
	 *
	 * Attach a previously created volume to a running instance.
	 *
	 * @param string $volume_id (Required) The ID of the Amazon EBS volume. The volume and instance must be within the same Availability Zone and the instance must be running.
	 * @param string $instance_id (Required) The ID of the instance to which the volume attaches. The volume and instance must be within the same Availability Zone and the instance must be running.
	 * @param string $device (Required) Specifies how the device is exposed to the instance (e.g., <code>/dev/sdh</code>).
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function attach_volume($volume_id, $instance_id, $device, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['VolumeId'] = $volume_id;
		$opt['InstanceId'] = $instance_id;
		$opt['Device'] = $device;

		return $this->authenticate('AttachVolume', $opt, $this->hostname);
	}

	/**
	 *
	 * Provides details of a user's registered licenses. Zero or more IDs may be specified on the call. When one or more license IDs are
	 * specified, only data for the specified IDs are returned.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>LicenseId</code> - <code>string|array</code> - Optional - Specifies the license registration for which details are to be returned.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for Licenses. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_licenses($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['LicenseId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'LicenseId' => (is_array($opt['LicenseId']) ? $opt['LicenseId'] : array($opt['LicenseId']))
			)));
			unset($opt['LicenseId']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeLicenses', $opt, $this->hostname);
	}

	/**
	 *
	 * Activates a specific number of licenses for a 90-day period. Activations can be done against a specific license ID.
	 *
	 * @param string $license_id (Required) Specifies the ID for the specific license to activate against.
	 * @param integer $capacity (Required) Specifies the additional number of licenses to activate.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function activate_license($license_id, $capacity, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LicenseId'] = $license_id;
		$opt['Capacity'] = $capacity;

		return $this->authenticate('ActivateLicense', $opt, $this->hostname);
	}

	/**
	 *
	 * The ResetImageAttribute operation resets an attribute of an AMI to its default value.
	 *
	 * The productCodes attribute cannot be reset.
	 *
	 * @param string $image_id (Required) The ID of the AMI whose attribute is being reset.
	 * @param string $attribute (Required) The name of the attribute being reset. Available attribute names: <code>launchPermission</code>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function reset_image_attribute($image_id, $attribute, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['ImageId'] = $image_id;
		$opt['Attribute'] = $attribute;

		return $this->authenticate('ResetImageAttribute', $opt, $this->hostname);
	}

	/**
	 *
	 * Gives you information about your VPN connections.
	 *
	 * We strongly recommend you use HTTPS when calling this operation because the response contains sensitive cryptographic information for
	 * configuring your customer gateway.
	 *
	 * You can filter the results to return information only about VPN connections that match criteria you specify. For example, you could ask to
	 * get information about a particular VPN connection (or all) only if the VPN's state is pending or available. You can specify multiple filters
	 * (e.g., the VPN connection is associated with a particular VPN gateway, and the gateway's state is pending or available). The result includes
	 * information for a particular VPN connection only if the VPN connection matches all your filters. If there's no match, no special message is
	 * returned; the response is simply empty. The following table shows the available filters.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>VpnConnectionId</code> - <code>string|array</code> - Optional - A VPN connection ID. More than one may be specified per request.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for VPN Connections. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_vpn_connections($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['VpnConnectionId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'VpnConnectionId' => (is_array($opt['VpnConnectionId']) ? $opt['VpnConnectionId'] : array($opt['VpnConnectionId']))
			)));
			unset($opt['VpnConnectionId']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeVpnConnections', $opt, $this->hostname);
	}

	/**
	 *
	 * Create a snapshot of the volume identified by volume ID. A volume does not have to be detached at the time the snapshot is taken.
	 *
	 * Snapshot creation requires that the system is in a consistent state. For instance, this means that if taking a snapshot of a database, the
	 * tables must be read-only locked to ensure that the snapshot will not contain a corrupted version of the database. Therefore, be careful when
	 * using this API to ensure that the system remains in the consistent state until the create snapshot status has returned.
	 *
	 * @param string $volume_id (Required) The ID of the volume from which to create the snapshot.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Description</code> - <code>string</code> - Optional - The description for the new snapshot. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_snapshot($volume_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['VolumeId'] = $volume_id;

		return $this->authenticate('CreateSnapshot', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes a previously created volume. Once successfully deleted, a new volume can be created with the same name.
	 *
	 * @param string $volume_id (Required) The ID of the EBS volume to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_volume($volume_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['VolumeId'] = $volume_id;

		return $this->authenticate('DeleteVolume', $opt, $this->hostname);
	}

	/**
	 *
	 * Gives you information about your VPCs. You can filter the results to return information only about VPCs that match criteria you specify.
	 *
	 * For example, you could ask to get information about a particular VPC or VPCs (or all your VPCs) only if the VPC's state is available. You
	 * can specify multiple filters (e.g., the VPC uses one of several sets of DHCP options, and the VPC's state is available). The result includes
	 * information for a particular VPC only if the VPC matches all your filters.
	 *
	 * If there's no match, no special message is returned; the response is simply empty. The following table shows the available filters.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>VpcId</code> - <code>string|array</code> - Optional - The ID of a VPC you want information about.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for VPCs. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_vpcs($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['VpcId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'VpcId' => (is_array($opt['VpcId']) ? $opt['VpcId'] : array($opt['VpcId']))
			)));
			unset($opt['VpcId']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeVpcs', $opt, $this->hostname);
	}

	/**
	 *
	 * Deactivates a specific number of licenses. Deactivations can be done against a specific license ID after they have persisted for at least a
	 * 90-day period.
	 *
	 * @param string $license_id (Required) Specifies the ID for the specific license to deactivate against.
	 * @param integer $capacity (Required) Specifies the amount of capacity to deactivate against the license.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function deactivate_license($license_id, $capacity, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LicenseId'] = $license_id;
		$opt['Capacity'] = $capacity;

		return $this->authenticate('DeactivateLicense', $opt, $this->hostname);
	}

	/**
	 *
	 * The AssociateAddress operation associates an elastic IP address with an instance.
	 *
	 * If the IP address is currently assigned to another instance, the IP address is assigned to the new instance. This is an idempotent
	 * operation. If you enter it more than once, Amazon EC2 does not return an error.
	 *
	 * @param string $instance_id (Required) The instance to associate with the IP address.
	 * @param string $public_ip (Required) IP address that you are assigning to the instance.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>AllocationId</code> - <code>string</code> - Optional - The allocation ID that AWS returned when you allocated the elastic IP address for use with Amazon VPC. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function associate_address($instance_id, $public_ip, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['InstanceId'] = $instance_id;
		$opt['PublicIp'] = $public_ip;

		return $this->authenticate('AssociateAddress', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes a customer gateway. You must delete the VPN connection before deleting the customer gateway.
	 *
	 * You can have a single active customer gateway per AWS account (active means that you've created a VPN connection with that customer
	 * gateway). AWS might delete any customer gateway you leave inactive for an extended period of time.
	 *
	 * @param string $customer_gateway_id (Required) The ID of the customer gateway to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_customer_gateway($customer_gateway_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['CustomerGatewayId'] = $customer_gateway_id;

		return $this->authenticate('DeleteCustomerGateway', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates an entry (i.e., rule) in a network ACL with a rule number you specify. Each network ACL has a set of numbered ingress rules and a
	 * separate set of numbered egress rules. When determining whether a packet should be allowed in or out of a subnet associated with the ACL,
	 * Amazon VPC processes the entries in the ACL according to the rule numbers, in ascending order.
	 *
	 * <b>Important: </b> We recommend that you leave room between the rules (e.g., 100, 110, 120, etc.), and not number them sequentially (101,
	 * 102, 103, etc.). This allows you to easily add a new rule between existing ones without having to renumber the rules.
	 *
	 * After you add an entry, you can't modify it; you must either replace it, or create a new entry and delete the old one.
	 *
	 * For more information about network ACLs, go to Network ACLs in the Amazon Virtual Private Cloud User Guide.
	 *
	 * @param string $network_acl_id (Required) ID of the ACL where the entry will be created.
	 * @param integer $rule_number (Required) Rule number to assign to the entry (e.g., 100). ACL entries are processed in ascending order by rule number.
	 * @param string $protocol (Required) IP protocol the rule applies to. Valid Values: <code>tcp</code>, <code>udp</code>, <code>icmp</code> or an IP protocol number.
	 * @param string $rule_action (Required) Whether to allow or deny traffic that matches the rule. [Allowed values: <code>allow</code>, <code>deny</code>]
	 * @param boolean $egress (Required) Whether this rule applies to egress traffic from the subnet (<code>true</code>) or ingress traffic to the subnet (<code>false</code>).
	 * @param string $cidr_block (Required) The CIDR range to allow or deny, in CIDR notation (e.g., <code>172.16.0.0/24</code>).
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Icmp</code> - <code>array</code> - Optional -  ICMP values. <ul>
	 * 		<li><code>Type</code> - <code>integer</code> - Optional - For the ICMP protocol, the ICMP type. A value of <code>-1</code> is a wildcard meaning all types. Required if specifying <code>icmp</code> for the protocol. </li>
	 * 		<li><code>Code</code> - <code>integer</code> - Optional - For the ICMP protocol, the ICMP code. A value of <code>-1</code> is a wildcard meaning all codes. Required if specifying <code>icmp</code> for the protocol. </li></ul></li>
	 * 	<li><code>PortRange</code> - <code>array</code> - Optional -  Port ranges. <ul>
	 * 		<li><code>From</code> - <code>integer</code> - Optional - The first port in the range. Required if specifying <code>tcp</code> or <code>udp</code> for the protocol. </li>
	 * 		<li><code>To</code> - <code>integer</code> - Optional - The last port in the range. Required if specifying <code>tcp</code> or <code>udp</code> for the protocol. </li></ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_network_acl_entry($network_acl_id, $rule_number, $protocol, $rule_action, $egress, $cidr_block, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['NetworkAclId'] = $network_acl_id;
		$opt['RuleNumber'] = $rule_number;
		$opt['Protocol'] = $protocol;
		$opt['RuleAction'] = $rule_action;
		$opt['Egress'] = $egress;
		$opt['CidrBlock'] = $cidr_block;

		// Optional parameter
		if (isset($opt['Icmp']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Icmp' => $opt['Icmp']
			)));
			unset($opt['Icmp']);
		}

		// Optional parameter
		if (isset($opt['PortRange']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'PortRange' => $opt['PortRange']
			)));
			unset($opt['PortRange']);
		}

		return $this->authenticate('CreateNetworkAclEntry', $opt, $this->hostname);
	}

	/**
	 *
	 * Detaches an Internet gateway from a VPC, disabling connectivity between the Internet and the VPC. The VPC must not contain any running
	 * instances with elastic IP addresses. For more information about your VPC and Internet gateway, go to Amazon Virtual Private Cloud User
	 * Guide.
	 *
	 * For more information about Amazon Virtual Private Cloud and Internet gateways, go to the Amazon Virtual Private Cloud User Guide.
	 *
	 * @param string $internet_gateway_id (Required) The ID of the Internet gateway to detach.
	 * @param string $vpc_id (Required) The ID of the VPC.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function detach_internet_gateway($internet_gateway_id, $vpc_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['InternetGatewayId'] = $internet_gateway_id;
		$opt['VpcId'] = $vpc_id;

		return $this->authenticate('DetachInternetGateway', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a new route table within a VPC. After you create a new route table, you can add routes and associate the table with a subnet. For
	 * more information about route tables, go to <a
	 * href="http://docs.amazonwebservices.com/AmazonVPC/latest/UserGuide/VPC_Route_Tables.html">Route Tables</a> in the Amazon Virtual Private
	 * Cloud User Guide.
	 *
	 * @param string $vpc_id (Required) The ID of the VPC where the route table will be created.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_route_table($vpc_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['VpcId'] = $vpc_id;

		return $this->authenticate('CreateRouteTable', $opt, $this->hostname);
	}

	/**
	 *
	 * Describes the status of the indicated volume or, in lieu of any specified, all volumes belonging to the caller. Volumes that have been
	 * deleted are not described.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>VolumeId</code> - <code>string|array</code> - Optional - The optional list of EBS volumes to describe.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for Volumes. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_volumes($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['VolumeId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'VolumeId' => (is_array($opt['VolumeId']) ? $opt['VolumeId'] : array($opt['VolumeId']))
			)));
			unset($opt['VolumeId']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeVolumes', $opt, $this->hostname);
	}

	/**
	 *
	 * Gives you information about your route tables. You can filter the results to return information only about tables that match criteria you
	 * specify. For example, you could get information only about a table associated with a particular subnet. You can specify multiple values for
	 * the filter. The table must match at least one of the specified values for it to be included in the results.
	 *
	 * You can specify multiple filters (e.g., the table has a particular route, and is associated with a particular subnet). The result includes
	 * information for a particular table only if it matches all your filters. If there's no match, no special message is returned; the response is
	 * simply empty.
	 *
	 * You can use wildcards with the filter values: an asterisk matches zero or more characters, and <code>?</code> matches exactly one
	 * character. You can escape special characters using a backslash before the character. For example, a value of <code>\*amazon\?\\</code>
	 * searches for the literal string <code>*amazon?\</code>.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>RouteTableId</code> - <code>string|array</code> - Optional - One or more route table IDs.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for Route Tables. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_route_tables($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['RouteTableId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'RouteTableId' => (is_array($opt['RouteTableId']) ? $opt['RouteTableId'] : array($opt['RouteTableId']))
			)));
			unset($opt['RouteTableId']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeRouteTables', $opt, $this->hostname);
	}

	/**
	 *
	 * Enables monitoring for a running instance.
	 *
	 * @param string|array $instance_id (Required) The list of Amazon EC2 instances on which to enable monitoring.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function monitor_instances($instance_id, $opt = null)
	{
		if (!$opt) $opt = array();

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'InstanceId' => (is_array($instance_id) ? $instance_id : array($instance_id))
		)));

		return $this->authenticate('MonitorInstances', $opt, $this->hostname);
	}

	/**
	 *
	 * Gives you information about one or more sets of DHCP options. You can specify one or more DHCP options set IDs, or no IDs (to describe all
	 * your sets of DHCP options). The returned information consists of:
	 *
	 * <ul> <li> The DHCP options set ID </li>
	 *
	 * <li> The options </li>
	 *
	 * </ul>
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>DhcpOptionsId</code> - <code>string|array</code> - Optional -   Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for DhcpOptions. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_dhcp_options($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['DhcpOptionsId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'DhcpOptionsId' => (is_array($opt['DhcpOptionsId']) ? $opt['DhcpOptionsId'] : array($opt['DhcpOptionsId']))
			)));
			unset($opt['DhcpOptionsId']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeDhcpOptions', $opt, $this->hostname);
	}

	/**
	 *
	 * Gives you information about the network ACLs in your VPC. You can filter the results to return information only about ACLs that match
	 * criteria you specify. For example, you could get information only the ACL associated with a particular subnet. The ACL must match at least
	 * one of the specified values for it to be included in the results.
	 *
	 * You can specify multiple filters (e.g., the ACL is associated with a particular subnet and has an egress entry that denies traffic to a
	 * particular port). The result includes information for a particular ACL only if it matches all your filters. If there's no match, no special
	 * message is returned; the response is simply empty.
	 *
	 * You can use wildcards with the filter values: an asterisk matches zero or more characters, and <code>?</code> matches exactly one
	 * character. You can escape special characters using a backslash before the character. For example, a value of <code>\*amazon\?\\</code>
	 * searches for the literal string <code>*amazon?\</code>.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>NetworkAclId</code> - <code>string|array</code> - Optional - One or more network ACL IDs.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for Network ACLs. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_network_acls($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['NetworkAclId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'NetworkAclId' => (is_array($opt['NetworkAclId']) ? $opt['NetworkAclId'] : array($opt['NetworkAclId']))
			)));
			unset($opt['NetworkAclId']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeNetworkAcls', $opt, $this->hostname);
	}

	/**
	 *
	 * The DescribeBundleTasks operation describes in-progress and recent bundle tasks. Complete and failed tasks are removed from the list a
	 * short time after completion. If no bundle ids are given, all bundle tasks are returned.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>BundleId</code> - <code>string|array</code> - Optional - The list of bundle task IDs to describe.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for BundleTasks. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_bundle_tasks($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['BundleId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'BundleId' => (is_array($opt['BundleId']) ? $opt['BundleId'] : array($opt['BundleId']))
			)));
			unset($opt['BundleId']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeBundleTasks', $opt, $this->hostname);
	}

	/**
	 *
	 * The RevokeSecurityGroupIngress operation revokes permissions from a security group. The permissions used to revoke must be specified using
	 * the same values used to grant the permissions.
	 *
	 * Permissions are specified by IP protocol (TCP, UDP, or ICMP), the source of the request (by IP range or an Amazon EC2 user-group pair), the
	 * source and destination port ranges (for TCP and UDP), and the ICMP codes and types (for ICMP).
	 *
	 * Permission changes are quickly propagated to instances within the security group. However, depending on the number of instances in the
	 * group, a small delay might occur.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>GroupName</code> - <code>string</code> - Optional - Name of the standard (EC2) security group to modify. The group must belong to your account. Can be used instead of GroupID for standard (EC2) security groups. </li>
	 * 	<li><code>GroupId</code> - <code>string</code> - Optional - ID of the standard (EC2) or VPC security group to modify. The group must belong to your account. Required for VPC security groups; can be used instead of GroupName for standard (EC2) security groups. </li>
	 * 	<li><code>IpPermissions</code> - <code>array</code> - Optional - List of IP permissions to revoke on the specified security group. For an IP permission to be removed, it must exactly match one of the IP permissions you specify in this list. Specifying permissions through IP permissions is the preferred way of revoking permissions since it offers more flexibility and control. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>IpProtocol</code> - <code>string</code> - Optional - The IP protocol of this permission. Valid protocol values: <code>tcp</code>, <code>udp</code>, <code>icmp</code> </li>
	 * 			<li><code>FromPort</code> - <code>integer</code> - Optional - Start of port range for the TCP and UDP protocols, or an ICMP type number. An ICMP type number of <code>-1</code> indicates a wildcard (i.e., any ICMP type number). </li>
	 * 			<li><code>ToPort</code> - <code>integer</code> - Optional - End of port range for the TCP and UDP protocols, or an ICMP code. An ICMP code of <code>-1</code> indicates a wildcard (i.e., any ICMP code). </li>
	 * 			<li><code>Groups</code> - <code>array</code> - Optional - The list of AWS user IDs and groups included in this permission. <ul>
	 * 				<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 					<li><code>UserId</code> - <code>string</code> - Optional - The AWS user ID of an account. </li>
	 * 					<li><code>GroupName</code> - <code>string</code> - Optional - Name of the security group in the specified AWS account. Cannot be used when specifying a CIDR IP address range. </li>
	 * 					<li><code>GroupId</code> - <code>string</code> - Optional - ID of the security group in the specified AWS account. Cannot be used when specifying a CIDR IP address range. </li>
	 * 				</ul></li>
	 * 			</ul></li>
	 * 			<li><code>IpRanges</code> - <code>string|array</code> - Optional - The list of CIDR IP ranges included in this permission.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function revoke_security_group_ingress($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['IpPermissions']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'IpPermissions' => $opt['IpPermissions']
			)));
			unset($opt['IpPermissions']);
		}

		return $this->authenticate('RevokeSecurityGroupIngress', $opt, $this->hostname);
	}

	/**
	 * The GetConsoleOutput operation retrieves console output for the specified instance.
	 *
	 * Instance console output is buffered and posted shortly after instance boot, reboot, and
	 * termination. Amazon EC2 preserves the most recent 64 KB output which will be available for at least
	 * one hour after the most recent post.
	 *
	 * @param string $instance_id (Required) The ID of the instance for which you want console output.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 *  <li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This is useful for manually-managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response. The value of <code>output</code> is automatically Base64-decoded.
	 */
	public function get_console_output($instance_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['InstanceId'] = $instance_id;

		$response = $this->authenticate('GetConsoleOutput', $opt, $this->hostname);

		// Automatically Base64-decode the <output> value.
		if ($this->util->is_base64((string) $response->body->output))
		{
			$response->body->output = base64_decode($response->body->output);
		}

		return $response;
	}

	/**
	 *
	 * Creates a new Internet gateway in your AWS account. After creating the Internet gateway, you then attach it to a VPC using
	 * <code>AttachInternetGateway</code>. For more information about your VPC and Internet gateway, go to Amazon Virtual Private Cloud User Guide.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_internet_gateway($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('CreateInternetGateway', $opt, $this->hostname);
	}

	/**
	 *
	 * The ModifyImageAttribute operation modifies an attribute of an AMI.
	 *
	 * @param string $image_id (Required) The ID of the AMI whose attribute you want to modify.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Attribute</code> - <code>string</code> - Optional - The name of the AMI attribute you want to modify. Available attributes: <code>launchPermission</code>, <code>productCodes</code> </li>
	 * 	<li><code>OperationType</code> - <code>string</code> - Optional - The type of operation being requested. Available operation types: <code>add</code>, <code>remove</code> </li>
	 * 	<li><code>UserId</code> - <code>string|array</code> - Optional - The AWS user ID being added to or removed from the list of users with launch permissions for this AMI. Only valid when the launchPermission attribute is being modified.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>UserGroup</code> - <code>string|array</code> - Optional - The user group being added to or removed from the list of user groups with launch permissions for this AMI. Only valid when the launchPermission attribute is being modified. Available user groups: <code>all</code>  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>ProductCode</code> - <code>string|array</code> - Optional - The list of product codes being added to or removed from the specified AMI. Only valid when the productCodes attribute is being modified.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Value</code> - <code>string</code> - Optional - The value of the attribute being modified. Only valid when the description attribute is being modified. </li>
	 * 	<li><code>LaunchPermission</code> - <code>array</code> - Optional -   <ul>
	 * 		<li><code>Add</code> - <code>array</code> - Optional -  <ul>
	 * 			<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 				<li><code>UserId</code> - <code>string</code> - Optional - The AWS user ID of the user involved in this launch permission. </li>
	 * 				<li><code>Group</code> - <code>string</code> - Optional - The AWS group of the user involved in this launch permission. Available groups: <code>all</code> </li>
	 * 			</ul></li>
	 * 		</ul></li>
	 * 		<li><code>Remove</code> - <code>array</code> - Optional -  <ul>
	 * 			<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 				<li><code>UserId</code> - <code>string</code> - Optional - The AWS user ID of the user involved in this launch permission. </li>
	 * 				<li><code>Group</code> - <code>string</code> - Optional - The AWS group of the user involved in this launch permission. Available groups: <code>all</code> </li>
	 * 			</ul></li>
	 * 		</ul></li></ul></li>
	 * 	<li><code>Description</code> - <code>string</code> - Optional - String value </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function modify_image_attribute($image_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['ImageId'] = $image_id;

		// Optional parameter
		if (isset($opt['UserId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'UserId' => (is_array($opt['UserId']) ? $opt['UserId'] : array($opt['UserId']))
			)));
			unset($opt['UserId']);
		}

		// Optional parameter
		if (isset($opt['UserGroup']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'UserGroup' => (is_array($opt['UserGroup']) ? $opt['UserGroup'] : array($opt['UserGroup']))
			)));
			unset($opt['UserGroup']);
		}

		// Optional parameter
		if (isset($opt['ProductCode']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'ProductCode' => (is_array($opt['ProductCode']) ? $opt['ProductCode'] : array($opt['ProductCode']))
			)));
			unset($opt['ProductCode']);
		}

		// Optional parameter
		if (isset($opt['LaunchPermission']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'LaunchPermission' => $opt['LaunchPermission']
			)));
			unset($opt['LaunchPermission']);
		}

		return $this->authenticate('ModifyImageAttribute', $opt, $this->hostname);
	}

	/**
	 *
	 * Provides information to AWS about your customer gateway device. The customer gateway is the appliance at your end of the VPN connection
	 * (compared to the VPN gateway, which is the device at the AWS side of the VPN connection). You can have a single active customer gateway per
	 * AWS account (active means that you've created a VPN connection to use with the customer gateway). AWS might delete any customer gateway that
	 * you create with this operation if you leave it inactive for an extended period of time.
	 *
	 * You must provide the Internet-routable IP address of the customer gateway's external interface. The IP address must be static.
	 *
	 * You must also provide the device's Border Gateway Protocol (BGP) Autonomous System Number (ASN). You can use an existing ASN assigned to
	 * your network. If you don't have an ASN already, you can use a private ASN (in the 64512 - 65534 range). For more information about ASNs, go
	 * to <a
	 * href="http://en.wikipedia.org/wiki/Autonomous_system_%28Internet%29">http://en.wikipedia.org/wiki/Autonomous_system_%28Internet%29</a>.
	 *
	 * @param string $type (Required) The type of VPN connection this customer gateway supports.
	 * @param string $ip_address (Required) The Internet-routable IP address for the customer gateway's outside interface. The address must be static
	 * @param integer $bgp_asn (Required) The customer gateway's Border Gateway Protocol (BGP) Autonomous System Number (ASN).
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_customer_gateway($type, $ip_address, $bgp_asn, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['Type'] = $type;
		$opt['IpAddress'] = $ip_address;
		$opt['BgpAsn'] = $bgp_asn;

		return $this->authenticate('CreateCustomerGateway', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates the data feed for Spot Instances, enabling you to view Spot Instance usage logs. You can create one data feed per account.
	 *
	 * For conceptual information about Spot Instances, refer to the Amazon Elastic Compute Cloud Developer Guide or Amazon Elastic Compute Cloud
	 * User Guide.
	 *
	 * @param string $bucket (Required) The Amazon S3 bucket in which to store the Spot Instance datafeed.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Prefix</code> - <code>string</code> - Optional - The prefix that is prepended to datafeed files. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_spot_datafeed_subscription($bucket, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['Bucket'] = $bucket;

		return $this->authenticate('CreateSpotDatafeedSubscription', $opt, $this->hostname);
	}

	/**
	 *
	 * Attaches an Internet gateway to a VPC, enabling connectivity between the Internet and the VPC. For more information about your VPC and
	 * Internet gateway, go to the Amazon Virtual Private Cloud User Guide.
	 *
	 * @param string $internet_gateway_id (Required) The ID of the Internet gateway to attach.
	 * @param string $vpc_id (Required) The ID of the VPC.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function attach_internet_gateway($internet_gateway_id, $vpc_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['InternetGatewayId'] = $internet_gateway_id;
		$opt['VpcId'] = $vpc_id;

		return $this->authenticate('AttachInternetGateway', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes a VPN connection. Use this if you want to delete a VPC and all its associated components. Another reason to use this operation is
	 * if you believe the tunnel credentials for your VPN connection have been compromised. In that situation, you can delete the VPN connection
	 * and create a new one that has new keys, without needing to delete the VPC or VPN gateway. If you create a new VPN connection, you must
	 * reconfigure the customer gateway using the new configuration information returned with the new VPN connection ID.
	 *
	 * If you're deleting the VPC and all its associated parts, we recommend you detach the VPN gateway from the VPC and delete the VPC before
	 * deleting the VPN connection.
	 *
	 * @param string $vpn_connection_id (Required) The ID of the VPN connection to delete
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_vpn_connection($vpn_connection_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['VpnConnectionId'] = $vpn_connection_id;

		return $this->authenticate('DeleteVpnConnection', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a new VPN connection between an existing VPN gateway and customer gateway. The only supported connection type is ipsec.1.
	 *
	 * The response includes information that you need to configure your customer gateway, in XML format. We recommend you use the command line
	 * version of this operation (<code>ec2-create-vpn-connection</code>), which takes an <code>-f</code> option (for format) and returns
	 * configuration information formatted as expected by the vendor you specified, or in a generic, human readable format. For information about
	 * the command, go to <code>ec2-create-vpn-connection</code> in the Amazon Virtual Private Cloud Command Line Reference.
	 *
	 * We strongly recommend you use HTTPS when calling this operation because the response contains sensitive cryptographic information for
	 * configuring your customer gateway.
	 *
	 * If you decide to shut down your VPN connection for any reason and then create a new one, you must re-configure your customer gateway with
	 * the new information returned from this call.
	 *
	 * @param string $type (Required) The type of VPN connection.
	 * @param string $customer_gateway_id (Required) The ID of the customer gateway.
	 * @param string $vpn_gateway_id (Required) The ID of the VPN gateway.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_vpn_connection($type, $customer_gateway_id, $vpn_gateway_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['Type'] = $type;
		$opt['CustomerGatewayId'] = $customer_gateway_id;
		$opt['VpnGatewayId'] = $vpn_gateway_id;

		return $this->authenticate('CreateVpnConnection', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns information about an attribute of an instance. Only one attribute can be specified per call.
	 *
	 * @param string $instance_id (Required) The ID of the instance whose instance attribute is being described.
	 * @param string $attribute (Required) The name of the attribute to describe. Available attribute names: <code>instanceType</code>, <code>kernel</code>, <code>ramdisk</code>, <code>userData</code>, <code>disableApiTermination</code>, <code>instanceInitiatedShutdownBehavior</code>, <code>rootDeviceName</code>, <code>blockDeviceMapping</code>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_instance_attribute($instance_id, $attribute, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['InstanceId'] = $instance_id;
		$opt['Attribute'] = $attribute;

		return $this->authenticate('DescribeInstanceAttribute', $opt, $this->hostname);
	}

	/**
	 *
	 * Gives you information about your subnets. You can filter the results to return information only about subnets that match criteria you
	 * specify.
	 *
	 * For example, you could ask to get information about a particular subnet (or all) only if the subnet's state is available. You can specify
	 * multiple filters (e.g., the subnet is in a particular VPC, and the subnet's state is available).
	 *
	 * The result includes information for a particular subnet only if the subnet matches all your filters. If there's no match, no special
	 * message is returned; the response is simply empty. The following table shows the available filters.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>SubnetId</code> - <code>string|array</code> - Optional - A set of one or more subnet IDs.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for Subnets. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_subnets($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['SubnetId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'SubnetId' => (is_array($opt['SubnetId']) ? $opt['SubnetId'] : array($opt['SubnetId']))
			)));
			unset($opt['SubnetId']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeSubnets', $opt, $this->hostname);
	}

	/**
	 *
	 * The RunInstances operation launches a specified number of instances.
	 *
	 * If Amazon EC2 cannot launch the minimum number AMIs you request, no instances launch. If there is insufficient capacity to launch the
	 * maximum number of AMIs you request, Amazon EC2 launches as many as possible to satisfy the requested maximum values.
	 *
	 * Every instance is launched in a security group. If you do not specify a security group at launch, the instances start in your default
	 * security group. For more information on creating security groups, see CreateSecurityGroup.
	 *
	 * An optional instance type can be specified. For information about instance types, see Instance Types.
	 *
	 * You can provide an optional key pair ID for each image in the launch request (for more information, see CreateKeyPair). All instances that
	 * are created from images that use this key pair will have access to the associated public key at boot. You can use this key to provide secure
	 * access to an instance of an image on a per-instance basis. Amazon EC2 public images use this feature to provide secure access without
	 * passwords.
	 *
	 * Launching public images without a key pair ID will leave them inaccessible.
	 *
	 * The public key material is made available to the instance at boot time by placing it in the <code>openssh_id.pub</code> file on a logical
	 * device that is exposed to the instance as <code>/dev/sda2</code> (the ephemeral store). The format of this file is suitable for use as an
	 * entry within <code>~/.ssh/authorized_keys</code> (the OpenSSH format). This can be done at boot (e.g., as part of <code>rc.local</code>)
	 * allowing for secure access without passwords.
	 *
	 * Optional user data can be provided in the launch request. All instances that collectively comprise the launch request have access to this
	 * data For more information, see Instance Metadata.
	 *
	 *
	 * If any of the AMIs have a product code attached for which the user has not subscribed, the RunInstances call will fail.
	 *
	 * We strongly recommend using the 2.6.18 Xen stock kernel with the <code>c1.medium</code> and <code>c1.xlarge</code> instances. Although the
	 * default Amazon EC2 kernels will work, the new kernels provide greater stability and performance for these instance types. For more
	 * information about kernels, see Kernels, RAM Disks, and Block Device Mappings.
	 *
	 * @param string $image_id (Required) Unique ID of a machine image, returned by a call to DescribeImages.
	 * @param integer $min_count (Required) Minimum number of instances to launch. If the value is more than Amazon EC2 can launch, no instances are launched at all.
	 * @param integer $max_count (Required) Maximum number of instances to launch. If the value is more than Amazon EC2 can launch, the largest possible number above minCount will be launched instead. Between 1 and the maximum number allowed for your account (default: 20).
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>KeyName</code> - <code>string</code> - Optional - The name of the key pair. </li>
	 * 	<li><code>SecurityGroup</code> - <code>string|array</code> - Optional - The names of the security groups into which the instances will be launched.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>SecurityGroupId</code> - <code>string|array</code> - Optional -   Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>UserData</code> - <code>string</code> - Optional - Specifies additional information to make available to the instance(s). </li>
	 * 	<li><code>InstanceType</code> - <code>string</code> - Optional - Specifies the instance type for the launched instances. [Allowed values: <code>t1.micro</code>, <code>m1.small</code>, <code>m1.large</code>, <code>m1.xlarge</code>, <code>m2.xlarge</code>, <code>m2.2xlarge</code>, <code>m2.4xlarge</code>, <code>c1.medium</code>, <code>c1.xlarge</code>, <code>cc1.4xlarge</code>, <code>cg1.4xlarge</code>]</li>
	 * 	<li><code>Placement</code> - <code>array</code> - Optional -  Specifies the placement constraints (Availability Zones) for launching the instances. <ul>
	 * 		<li><code>AvailabilityZone</code> - <code>string</code> - Optional - The availability zone in which an Amazon EC2 instance runs. </li>
	 * 		<li><code>GroupName</code> - <code>string</code> - Optional - The name of the PlacementGroup in which an Amazon EC2 instance runs. Placement groups are primarily used for launching High Performance Computing instances in the same group to ensure fast connection speeds. </li>
	 * 		<li><code>Tenancy</code> - <code>string</code> - Optional - The allowed tenancy of instances launched into the VPC. A value of default means instances can be launched with any tenancy; a value of dedicated means instances must be launched with tenancy as dedicated. </li></ul></li>
	 * 	<li><code>KernelId</code> - <code>string</code> - Optional - The ID of the kernel with which to launch the instance. </li>
	 * 	<li><code>RamdiskId</code> - <code>string</code> - Optional - The ID of the RAM disk with which to launch the instance. Some kernels require additional drivers at launch. Check the kernel requirements for information on whether you need to specify a RAM disk. To find kernel requirements, go to the Resource Center and search for the kernel ID. </li>
	 * 	<li><code>BlockDeviceMapping</code> - <code>array</code> - Optional - Specifies how block devices are exposed to the instance. Each mapping is made up of a virtualName and a deviceName. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>VirtualName</code> - <code>string</code> - Optional - Specifies the virtual device name. </li>
	 * 			<li><code>DeviceName</code> - <code>string</code> - Optional - Specifies the device name (e.g., <code>/dev/sdh</code>). </li>
	 * 			<li><code>Ebs</code> - <code>array</code> - Optional - Specifies parameters used to automatically setup Amazon EBS volumes when the instance is launched. Takes an associative array of parameters that can have the following keys: <ul>
	 * 				<li><code>SnapshotId</code> - <code>string</code> - Optional - The ID of the snapshot from which the volume will be created. </li>
	 * 				<li><code>VolumeSize</code> - <code>integer</code> - Optional - The size of the volume, in gigabytes. </li>
	 * 				<li><code>DeleteOnTermination</code> - <code>boolean</code> - Optional - Specifies whether the Amazon EBS volume is deleted on instance termination. </li>
	 * 			</ul></li>
	 * 			<li><code>NoDevice</code> - <code>string</code> - Optional - Specifies the device name to suppress during instance launch. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>Monitoring.Enabled</code> - <code>boolean</code> - Optional - Enables monitoring for the instance. </li>
	 * 	<li><code>SubnetId</code> - <code>string</code> - Optional - Specifies the subnet ID within which to launch the instance(s) for Amazon Virtual Private Cloud. </li>
	 * 	<li><code>DisableApiTermination</code> - <code>boolean</code> - Optional - Specifies whether the instance can be terminated using the APIs. You must modify this attribute before you can terminate any "locked" instances from the APIs. </li>
	 * 	<li><code>InstanceInitiatedShutdownBehavior</code> - <code>string</code> - Optional - Specifies whether the instance's Amazon EBS volumes are stopped or terminated when the instance is shut down. </li>
	 * 	<li><code>License</code> - <code>array</code> - Optional -  Specifies active licenses in use and attached to an Amazon EC2 instance. <ul>
	 * 		<li><code>Pool</code> - <code>string</code> - Optional - The license pool from which to take a license when starting Amazon EC2 instances in the associated <code>RunInstances</code> request. </li></ul></li>
	 * 	<li><code>PrivateIpAddress</code> - <code>string</code> - Optional - If you're using Amazon Virtual Private Cloud, you can optionally use this parameter to assign the instance a specific available IP address from the subnet. </li>
	 * 	<li><code>ClientToken</code> - <code>string</code> - Optional - Unique, case-sensitive identifier you provide to ensure idempotency of the request. For more information, go to How to Ensure Idempotency in the Amazon Elastic Compute Cloud User Guide. </li>
	 * 	<li><code>AdditionalInfo</code> - <code>string</code> - Optional -  </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function run_instances($image_id, $min_count, $max_count, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['ImageId'] = $image_id;
		$opt['MinCount'] = $min_count;
		$opt['MaxCount'] = $max_count;

		// Optional parameter
		if (isset($opt['SecurityGroup']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'SecurityGroup' => (is_array($opt['SecurityGroup']) ? $opt['SecurityGroup'] : array($opt['SecurityGroup']))
			)));
			unset($opt['SecurityGroup']);
		}

		// Optional parameter
		if (isset($opt['SecurityGroupId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'SecurityGroupId' => (is_array($opt['SecurityGroupId']) ? $opt['SecurityGroupId'] : array($opt['SecurityGroupId']))
			)));
			unset($opt['SecurityGroupId']);
		}

		// Optional parameter
		if (isset($opt['Placement']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Placement' => $opt['Placement']
			)));
			unset($opt['Placement']);
		}

		// Optional parameter
		if (isset($opt['BlockDeviceMapping']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'BlockDeviceMapping' => $opt['BlockDeviceMapping']
			)));
			unset($opt['BlockDeviceMapping']);
		}

		// Optional parameter
		if (isset($opt['License']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'License' => $opt['License']
			)));
			unset($opt['License']);
		}

		return $this->authenticate('RunInstances', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns information about one or more PlacementGroup instances in a user's account.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>GroupName</code> - <code>string|array</code> - Optional - The name of the <code>PlacementGroup</code>.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for Placement Groups. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_placement_groups($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['GroupName']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'GroupName' => (is_array($opt['GroupName']) ? $opt['GroupName'] : array($opt['GroupName']))
			)));
			unset($opt['GroupName']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribePlacementGroups', $opt, $this->hostname);
	}

	/**
	 *
	 * Associates a subnet with a route table. The subnet and route table must be in the same VPC. This association causes traffic originating
	 * from the subnet to be routed according to the routes in the route table. The action returns an association ID, which you need if you want to
	 * disassociate the route table from the subnet later. A route table can be associated with multiple subnets.
	 *
	 * For more information about route tables, go to <a
	 * href="http://docs.amazonwebservices.com/AmazonVPC/latest/UserGuide/VPC_Route_Tables.html">Route Tables</a> in the Amazon Virtual Private
	 * Cloud User Guide.
	 *
	 * @param string $subnet_id (Required) The ID of the subnet.
	 * @param string $route_table_id (Required) The ID of the route table.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function associate_route_table($subnet_id, $route_table_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['SubnetId'] = $subnet_id;
		$opt['RouteTableId'] = $route_table_id;

		return $this->authenticate('AssociateRouteTable', $opt, $this->hostname);
	}

	/**
	 *
	 * The DescribeInstances operation returns information about instances that you own.
	 *
	 * If you specify one or more instance IDs, Amazon EC2 returns information for those instances. If you do not specify instance IDs, Amazon EC2
	 * returns information for all relevant instances. If you specify an invalid instance ID, a fault is returned. If you specify an instance that
	 * you do not own, it will not be included in the returned results.
	 *
	 * Recently terminated instances might appear in the returned results. This interval is usually less than one hour.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>InstanceId</code> - <code>string|array</code> - Optional - An optional list of the instances to describe.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for Instances. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_instances($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['InstanceId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'InstanceId' => (is_array($opt['InstanceId']) ? $opt['InstanceId'] : array($opt['InstanceId']))
			)));
			unset($opt['InstanceId']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeInstances', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes a network ACL from a VPC. The ACL must not have any subnets associated with it. You can't delete the default network ACL. For more
	 * information about network ACLs, go to Network ACLs in the Amazon Virtual Private Cloud User Guide.
	 *
	 * @param string $network_acl_id (Required) The ID of the network ACL to be deleted.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_network_acl($network_acl_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['NetworkAclId'] = $network_acl_id;

		return $this->authenticate('DeleteNetworkAcl', $opt, $this->hostname);
	}

	/**
	 *
	 * The DescribeImages operation returns information about AMIs, AKIs, and ARIs available to the user. Information returned includes image
	 * type, product codes, architecture, and kernel and RAM disk IDs. Images available to the user include public images available for any user to
	 * launch, private images owned by the user making the request, and private images owned by other users for which the user has explicit launch
	 * permissions.
	 *
	 * Launch permissions fall into three categories:
	 *
	 * <ul> <li> <b>Public:</b> The owner of the AMI granted launch permissions for the AMI to the all group. All users have launch permissions
	 * for these AMIs. </li>
	 *
	 * <li> <b>Explicit:</b> The owner of the AMI granted launch permissions to a specific user. </li>
	 *
	 * <li> <b>Implicit:</b> A user has implicit launch permissions for all AMIs he or she owns. </li>
	 *
	 * </ul>
	 *
	 * The list of AMIs returned can be modified by specifying AMI IDs, AMI owners, or users with launch permissions. If no options are specified,
	 * Amazon EC2 returns all AMIs for which the user has launch permissions.
	 *
	 * If you specify one or more AMI IDs, only AMIs that have the specified IDs are returned. If you specify an invalid AMI ID, a fault is
	 * returned. If you specify an AMI ID for which you do not have access, it will not be included in the returned results.
	 *
	 * If you specify one or more AMI owners, only AMIs from the specified owners and for which you have access are returned. The results can
	 * include the account IDs of the specified owners, amazon for AMIs owned by Amazon or self for AMIs that you own.
	 *
	 * If you specify a list of executable users, only users that have launch permissions for the AMIs are returned. You can specify account IDs
	 * (if you own the AMI(s)), self for AMIs for which you own or have explicit permissions, or all for public AMIs.
	 *
	 * Deregistered images are included in the returned results for an unspecified interval after deregistration.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>ImageId</code> - <code>string|array</code> - Optional - An optional list of the AMI IDs to describe. If not specified, all AMIs will be described.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Owner</code> - <code>string|array</code> - Optional - The optional list of owners for the described AMIs. The IDs amazon, self, and explicit can be used to include AMIs owned by Amazon, AMIs owned by the user, and AMIs for which the user has explicit launch permissions, respectively.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>ExecutableBy</code> - <code>string|array</code> - Optional - The optional list of users with explicit launch permissions for the described AMIs. The user ID can be a user's account ID, 'self' to return AMIs for which the sender of the request has explicit launch permissions, or 'all' to return AMIs with public launch permissions.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for Images. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_images($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['ImageId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'ImageId' => (is_array($opt['ImageId']) ? $opt['ImageId'] : array($opt['ImageId']))
			)));
			unset($opt['ImageId']);
		}

		// Optional parameter
		if (isset($opt['Owner']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Owner' => (is_array($opt['Owner']) ? $opt['Owner'] : array($opt['Owner']))
			)));
			unset($opt['Owner']);
		}

		// Optional parameter
		if (isset($opt['ExecutableBy']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'ExecutableBy' => (is_array($opt['ExecutableBy']) ? $opt['ExecutableBy'] : array($opt['ExecutableBy']))
			)));
			unset($opt['ExecutableBy']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeImages', $opt, $this->hostname);
	}

	/**
	 *
	 * Starts an instance that uses an Amazon EBS volume as its root device. Instances that use Amazon EBS volumes as their root devices can be
	 * quickly stopped and started. When an instance is stopped, the compute resources are released and you are not billed for hourly instance
	 * usage. However, your root partition Amazon EBS volume remains, continues to persist your data, and you are charged for Amazon EBS volume
	 * usage. You can restart your instance at any time.
	 *
	 * Performing this operation on an instance that uses an instance store as its root device returns an error.
	 *
	 * @param string|array $instance_id (Required) The list of Amazon EC2 instances to start.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function start_instances($instance_id, $opt = null)
	{
		if (!$opt) $opt = array();

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'InstanceId' => (is_array($instance_id) ? $instance_id : array($instance_id))
		)));

		return $this->authenticate('StartInstances', $opt, $this->hostname);
	}

	/**
	 *
	 * Modifies an attribute of an instance.
	 *
	 * @param string $instance_id (Required) The ID of the instance whose attribute is being modified.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Attribute</code> - <code>string</code> - Optional - The name of the attribute being modified. Available attribute names: <code>instanceType</code>, <code>kernel</code>, <code>ramdisk</code>, <code>userData</code>, <code>disableApiTermination</code>, <code>instanceInitiatedShutdownBehavior</code>, <code>rootDevice</code>, <code>blockDeviceMapping</code> </li>
	 * 	<li><code>Value</code> - <code>string</code> - Optional - The new value of the instance attribute being modified. Only valid when <code>kernel</code>, <code>ramdisk</code>, <code>userData</code>, <code>disableApiTermination</code> or <code>instanceInitiateShutdownBehavior</code> is specified as the attribute being modified. </li>
	 * 	<li><code>BlockDeviceMapping</code> - <code>array</code> - Optional - The new block device mappings for the instance whose attributes are being modified. Only valid when blockDeviceMapping is specified as the attribute being modified. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>DeviceName</code> - <code>string</code> - Optional - The device name (e.g., <code>/dev/sdh</code>) at which the block device is exposed on the instance. </li>
	 * 			<li><code>Ebs</code> - <code>array</code> - Optional - The EBS instance block device specification describing the EBS block device to map to the specified device name on a running instance. Takes an associative array of parameters that can have the following keys: <ul>
	 * 				<li><code>VolumeId</code> - <code>string</code> - Optional - The ID of the EBS volume that should be mounted as a block device on an Amazon EC2 instance. </li>
	 * 				<li><code>DeleteOnTermination</code> - <code>boolean</code> - Optional - Specifies whether the Amazon EBS volume is deleted on instance termination. </li>
	 * 			</ul></li>
	 * 			<li><code>VirtualName</code> - <code>string</code> - Optional - The virtual device name. </li>
	 * 			<li><code>NoDevice</code> - <code>string</code> - Optional - When set to the empty string, specifies that the device name in this object should not be mapped to any real device. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>SourceDestCheck</code> - <code>boolean</code> - Optional - Boolean value </li>
	 * 	<li><code>DisableApiTermination</code> - <code>boolean</code> - Optional - Boolean value </li>
	 * 	<li><code>InstanceType</code> - <code>string</code> - Optional - String value </li>
	 * 	<li><code>Kernel</code> - <code>string</code> - Optional - String value </li>
	 * 	<li><code>Ramdisk</code> - <code>string</code> - Optional - String value </li>
	 * 	<li><code>UserData</code> - <code>string</code> - Optional - String value </li>
	 * 	<li><code>InstanceInitiatedShutdownBehavior</code> - <code>string</code> - Optional - String value </li>
	 * 	<li><code>GroupId</code> - <code>string|array</code> - Optional -   Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function modify_instance_attribute($instance_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['InstanceId'] = $instance_id;

		// Optional parameter
		if (isset($opt['BlockDeviceMapping']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'BlockDeviceMapping' => $opt['BlockDeviceMapping']
			)));
			unset($opt['BlockDeviceMapping']);
		}

		// Optional parameter
		if (isset($opt['GroupId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'GroupId' => (is_array($opt['GroupId']) ? $opt['GroupId'] : array($opt['GroupId']))
			)));
			unset($opt['GroupId']);
		}

		return $this->authenticate('ModifyInstanceAttribute', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes a set of DHCP options that you specify. Amazon VPC returns an error if the set of options you specify is currently associated with
	 * a VPC. You can disassociate the set of options by associating either a new set of options or the default options with the VPC.
	 *
	 * @param string $dhcp_options_id (Required) The ID of the DHCP options set to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_dhcp_options($dhcp_options_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DhcpOptionsId'] = $dhcp_options_id;

		return $this->authenticate('DeleteDhcpOptions', $opt, $this->hostname);
	}

	/**
	 *
	 * The AuthorizeSecurityGroupIngress operation adds permissions to a security group.
	 *
	 * Permissions are specified by the IP protocol (TCP, UDP or ICMP), the source of the request (by IP range or an Amazon EC2 user-group pair),
	 * the source and destination port ranges (for TCP and UDP), and the ICMP codes and types (for ICMP). When authorizing ICMP, <code>-1</code>
	 * can be used as a wildcard in the type and code fields.
	 *
	 * Permission changes are propagated to instances within the security group as quickly as possible. However, depending on the number of
	 * instances, a small delay might occur.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>GroupName</code> - <code>string</code> - Optional - Name of the standard (EC2) security group to modify. The group must belong to your account. Can be used instead of GroupID for standard (EC2) security groups. </li>
	 * 	<li><code>GroupId</code> - <code>string</code> - Optional - ID of the standard (EC2) or VPC security group to modify. The group must belong to your account. Required for VPC security groups; can be used instead of GroupName for standard (EC2) security groups. </li>
	 * 	<li><code>IpPermissions</code> - <code>array</code> - Optional - List of IP permissions to authorize on the specified security group. Specifying permissions through IP permissions is the preferred way of authorizing permissions since it offers more flexibility and control. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>IpProtocol</code> - <code>string</code> - Optional - The IP protocol of this permission. Valid protocol values: <code>tcp</code>, <code>udp</code>, <code>icmp</code> </li>
	 * 			<li><code>FromPort</code> - <code>integer</code> - Optional - Start of port range for the TCP and UDP protocols, or an ICMP type number. An ICMP type number of <code>-1</code> indicates a wildcard (i.e., any ICMP type number). </li>
	 * 			<li><code>ToPort</code> - <code>integer</code> - Optional - End of port range for the TCP and UDP protocols, or an ICMP code. An ICMP code of <code>-1</code> indicates a wildcard (i.e., any ICMP code). </li>
	 * 			<li><code>Groups</code> - <code>array</code> - Optional - The list of AWS user IDs and groups included in this permission. <ul>
	 * 				<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 					<li><code>UserId</code> - <code>string</code> - Optional - The AWS user ID of an account. </li>
	 * 					<li><code>GroupName</code> - <code>string</code> - Optional - Name of the security group in the specified AWS account. Cannot be used when specifying a CIDR IP address range. </li>
	 * 					<li><code>GroupId</code> - <code>string</code> - Optional - ID of the security group in the specified AWS account. Cannot be used when specifying a CIDR IP address range. </li>
	 * 				</ul></li>
	 * 			</ul></li>
	 * 			<li><code>IpRanges</code> - <code>string|array</code> - Optional - The list of CIDR IP ranges included in this permission.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function authorize_security_group_ingress($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['IpPermissions']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'IpPermissions' => $opt['IpPermissions']
			)));
			unset($opt['IpPermissions']);
		}

		return $this->authenticate('AuthorizeSecurityGroupIngress', $opt, $this->hostname);
	}

	/**
	 *
	 * Describes Spot Instance requests. Spot Instances are instances that Amazon EC2 starts on your behalf when the maximum price that you
	 * specify exceeds the current Spot Price. Amazon EC2 periodically sets the Spot Price based on available Spot Instance capacity and current
	 * spot instance requests. For conceptual information about Spot Instances, refer to the <a
	 * href="http://docs.amazonwebservices.com/AWSEC2/2010-08-31/DeveloperGuide/">Amazon Elastic Compute Cloud Developer Guide</a> or <a
	 * href="http://docs.amazonwebservices.com/AWSEC2/2010-08-31/UserGuide/">Amazon Elastic Compute Cloud User Guide</a>.
	 *
	 * You can filter the results to return information only about Spot Instance requests that match criteria you specify. For example, you could
	 * get information about requests where the Spot Price you specified is a certain value (you can't use greater than or less than comparison,
	 * but you can use <code>*</code> and <code>?</code> wildcards). You can specify multiple values for a filter. A Spot Instance request must
	 * match at least one of the specified values for it to be included in the results.
	 *
	 * You can specify multiple filters (e.g., the Spot Price is equal to a particular value, and the instance type is <code>m1.small</code>). The
	 * result includes information for a particular request only if it matches all your filters. If there's no match, no special message is
	 * returned; the response is simply empty.
	 *
	 * You can use wildcards with the filter values: an asterisk matches zero or more characters, and <code>?</code> matches exactly one
	 * character. You can escape special characters using a backslash before the character. For example, a value of <code>\*amazon\?\\</code>
	 * searches for the literal string <code>*amazon?\</code>.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>SpotInstanceRequestId</code> - <code>string|array</code> - Optional - The ID of the request.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for SpotInstances. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_spot_instance_requests($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['SpotInstanceRequestId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'SpotInstanceRequestId' => (is_array($opt['SpotInstanceRequestId']) ? $opt['SpotInstanceRequestId'] : array($opt['SpotInstanceRequestId']))
			)));
			unset($opt['SpotInstanceRequestId']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeSpotInstanceRequests', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a VPC with the CIDR block you specify. The smallest VPC you can create uses a <code>/28</code> netmask (16 IP addresses), and the
	 * largest uses a <code>/18</code> netmask (16,384 IP addresses). To help you decide how big to make your VPC, go to the topic about creating
	 * VPCs in the Amazon Virtual Private Cloud Developer Guide.
	 *
	 * By default, each instance you launch in the VPC has the default DHCP options (the standard EC2 host name, no domain name, no DNS server, no
	 * NTP server, and no NetBIOS server or node type).
	 *
	 * @param string $cidr_block (Required) A valid CIDR block.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>InstanceTenancy</code> - <code>string</code> - Optional - The allowed tenancy of instances launched into the VPC. A value of default means instances can be launched with any tenancy; a value of dedicated means instances must be launched with tenancy as dedicated. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_vpc($cidr_block, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['CidrBlock'] = $cidr_block;

		return $this->authenticate('CreateVpc', $opt, $this->hostname);
	}

	/**
	 *
	 * Gives you information about your customer gateways. You can filter the results to return information only about customer gateways that
	 * match criteria you specify. For example, you could ask to get information about a particular customer gateway (or all) only if the gateway's
	 * state is pending or available. You can specify multiple filters (e.g., the customer gateway has a particular IP address for the
	 * Internet-routable external interface, and the gateway's state is pending or available). The result includes information for a particular
	 * customer gateway only if the gateway matches all your filters. If there's no match, no special message is returned; the response is simply
	 * empty. The following table shows the available filters.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>CustomerGatewayId</code> - <code>string|array</code> - Optional - A set of one or more customer gateway IDs.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for Customer Gateways. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_customer_gateways($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['CustomerGatewayId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'CustomerGatewayId' => (is_array($opt['CustomerGatewayId']) ? $opt['CustomerGatewayId'] : array($opt['CustomerGatewayId']))
			)));
			unset($opt['CustomerGatewayId']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeCustomerGateways', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a new route in a route table within a VPC. The route's target can be either a gateway attached to the VPC or a NAT instance in the
	 * VPC.
	 *
	 * When determining how to route traffic, we use the route with the most specific match. For example, let's say the traffic is destined for
	 * <code>192.0.2.3</code>, and the route table includes the following two routes:
	 *
	 * <ul> <li> <code>192.0.2.0/24</code> (goes to some target A) </li>
	 *
	 * <li> <code>192.0.2.0/28</code> (goes to some target B) </li>
	 *
	 * </ul>
	 *
	 * Both routes apply to the traffic destined for <code>192.0.2.3</code>. However, the second route in the list is more specific, so we use
	 * that route to determine where to target the traffic.
	 *
	 * For more information about route tables, go to <a
	 * href="http://docs.amazonwebservices.com/AmazonVPC/latest/UserGuide/VPC_Route_Tables.html">Route Tables</a> in the Amazon Virtual Private
	 * Cloud User Guide.
	 *
	 * @param string $route_table_id (Required) The ID of the route table where the route will be added.
	 * @param string $destination_cidr_block (Required) The CIDR address block used for the destination match. For example: <code>0.0.0.0/0</code>. Routing decisions are based on the most specific match.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>GatewayId</code> - <code>string</code> - Optional - The ID of a VPN or Internet gateway attached to your VPC. You must provide either <code>GatewayId</code> or <code>InstanceId</code>, but not both. </li>
	 * 	<li><code>InstanceId</code> - <code>string</code> - Optional - The ID of a NAT instance in your VPC. You must provide either <code>GatewayId</code> or <code>InstanceId</code>, but not both. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_route($route_table_id, $destination_cidr_block, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['RouteTableId'] = $route_table_id;
		$opt['DestinationCidrBlock'] = $destination_cidr_block;

		return $this->authenticate('CreateRoute', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes a route table from a VPC. The route table must not be associated with a subnet. You can't delete the main route table. For more
	 * information about route tables, go to <a href="http://docs.amazonwebservices.com/AmazonVPC/latest/UserGuide/VPC_Route_Tables.html">Route
	 * Tables</a> in the Amazon Virtual Private Cloud User Guide.
	 *
	 * @param string $route_table_id (Required) The ID of the route table to be deleted.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_route_table($route_table_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['RouteTableId'] = $route_table_id;

		return $this->authenticate('DeleteRouteTable', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a Spot Instance request.
	 *
	 * Spot Instances are instances that Amazon EC2 starts on your behalf when the maximum price that you specify exceeds the current Spot Price.
	 * Amazon EC2 periodically sets the Spot Price based on available Spot Instance capacity and current spot instance requests.
	 *
	 * For conceptual information about Spot Instances, refer to the Amazon Elastic Compute Cloud Developer Guide or Amazon Elastic Compute Cloud
	 * User Guide.
	 *
	 * @param string $spot_price (Required) Specifies the maximum hourly price for any Spot Instance launched to fulfill the request.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>InstanceCount</code> - <code>integer</code> - Optional - Specifies the maximum number of Spot Instances to launch. </li>
	 * 	<li><code>Type</code> - <code>string</code> - Optional - Specifies the Spot Instance type. [Allowed values: <code>one-time</code>, <code>persistent</code>]</li>
	 * 	<li><code>ValidFrom</code> - <code>string</code> - Optional - Defines the start date of the request. If this is a one-time request, the request becomes active at this date and time and remains active until all instances launch, the request expires, or the request is canceled. If the request is persistent, the request becomes active at this date and time and remains active until it expires or is canceled. May be passed as a number of seconds since UNIX Epoch, or any string compatible with <php:strtotime()>.</li>
	 * 	<li><code>ValidUntil</code> - <code>string</code> - Optional - End date of the request. If this is a one-time request, the request remains active until all instances launch, the request is canceled, or this date is reached. If the request is persistent, it remains active until it is canceled or this date and time is reached. May be passed as a number of seconds since UNIX Epoch, or any string compatible with <php:strtotime()>.</li>
	 * 	<li><code>LaunchGroup</code> - <code>string</code> - Optional - Specifies the instance launch group. Launch groups are Spot Instances that launch and terminate together. </li>
	 * 	<li><code>AvailabilityZoneGroup</code> - <code>string</code> - Optional - Specifies the Availability Zone group. When specifying the same Availability Zone group for all Spot Instance requests, all Spot Instances are launched in the same Availability Zone. </li>
	 * 	<li><code>LaunchSpecification</code> - <code>array</code> - Optional -  Specifies additional launch instance information. <ul>
	 * 		<li><code>ImageId</code> - <code>string</code> - Optional - The AMI ID. </li>
	 * 		<li><code>KeyName</code> - <code>string</code> - Optional - The name of the key pair. </li>
	 * 		<li><code>GroupSet</code> - <code>array</code> - Optional - Name of the security group. <ul>
	 * 			<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 				<li><code>GroupName</code> - <code>string</code> - Optional -  </li>
	 * 				<li><code>GroupId</code> - <code>string</code> - Optional -  </li>
	 * 			</ul></li>
	 * 		</ul></li>
	 * 		<li><code>SecurityGroup</code> - <code>string|array</code> - Optional - Name of the security group.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		<li><code>UserData</code> - <code>string</code> - Optional - Optional data, specific to a user's application, to provide in the launch request. All instances that collectively comprise the launch request have access to this data. User data is never returned through API responses. </li>
	 * 		<li><code>InstanceType</code> - <code>string</code> - Optional - Specifies the instance type. [Allowed values: <code>t1.micro</code>, <code>m1.small</code>, <code>m1.large</code>, <code>m1.xlarge</code>, <code>m2.xlarge</code>, <code>m2.2xlarge</code>, <code>m2.4xlarge</code>, <code>c1.medium</code>, <code>c1.xlarge</code>, <code>cc1.4xlarge</code>, <code>cg1.4xlarge</code>]</li>
	 * 		<li><code>Placement</code> - <code>array</code> - Optional - Defines a placement item. Takes an associative array of parameters that can have the following keys: <ul>
	 * 			<li><code>AvailabilityZone</code> - <code>string</code> - Optional - The availability zone in which an Amazon EC2 instance runs. </li>
	 * 			<li><code>GroupName</code> - <code>string</code> - Optional - The name of the PlacementGroup in which an Amazon EC2 instance runs. Placement groups are primarily used for launching High Performance Computing instances in the same group to ensure fast connection speeds. </li>
	 * 		</ul></li>
	 * 		<li><code>KernelId</code> - <code>string</code> - Optional - Specifies the ID of the kernel to select. </li>
	 * 		<li><code>RamdiskId</code> - <code>string</code> - Optional - Specifies the ID of the RAM disk to select. Some kernels require additional drivers at launch. Check the kernel requirements for information on whether or not you need to specify a RAM disk and search for the kernel ID. </li>
	 * 		<li><code>BlockDeviceMapping</code> - <code>array</code> - Optional - Specifies how block devices are exposed to the instance. Each mapping is made up of a virtualName and a deviceName. <ul>
	 * 			<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 				<li><code>VirtualName</code> - <code>string</code> - Optional - Specifies the virtual device name. </li>
	 * 				<li><code>DeviceName</code> - <code>string</code> - Optional - Specifies the device name (e.g., <code>/dev/sdh</code>). </li>
	 * 				<li><code>Ebs</code> - <code>array</code> - Optional - Specifies parameters used to automatically setup Amazon EBS volumes when the instance is launched. Takes an associative array of parameters that can have the following keys: <ul>
	 * 					<li><code>SnapshotId</code> - <code>string</code> - Optional - The ID of the snapshot from which the volume will be created. </li>
	 * 					<li><code>VolumeSize</code> - <code>integer</code> - Optional - The size of the volume, in gigabytes. </li>
	 * 					<li><code>DeleteOnTermination</code> - <code>boolean</code> - Optional - Specifies whether the Amazon EBS volume is deleted on instance termination. </li>
	 * 				</ul></li>
	 * 				<li><code>NoDevice</code> - <code>string</code> - Optional - Specifies the device name to suppress during instance launch. </li>
	 * 			</ul></li>
	 * 		</ul></li>
	 * 		<li><code>Monitoring.Enabled</code> - <code>boolean</code> - Optional - Enables monitoring for the instance. </li>
	 * 		<li><code>SubnetId</code> - <code>string</code> - Optional - Specifies the Amazon VPC subnet ID within which to launch the instance(s) for Amazon Virtual Private Cloud. </li></ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function request_spot_instances($spot_price, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['SpotPrice'] = $spot_price;

		// Optional parameter
		if (isset($opt['ValidFrom']))
		{
			$opt['ValidFrom'] = $this->util->convert_date_to_iso8601($opt['ValidFrom']);
		}

		// Optional parameter
		if (isset($opt['ValidUntil']))
		{
			$opt['ValidUntil'] = $this->util->convert_date_to_iso8601($opt['ValidUntil']);
		}

		// Optional parameter
		if (isset($opt['LaunchSpecification']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'LaunchSpecification' => $opt['LaunchSpecification']
			)));
			unset($opt['LaunchSpecification']);
		}

		return $this->authenticate('RequestSpotInstances', $opt, $this->hostname);
	}

	/**
	 *
	 * Adds or overwrites tags for the specified resources. Each resource can have a maximum of 10 tags. Each tag consists of a key-value pair.
	 * Tag keys must be unique per resource.
	 *
	 * @param string|array $resource_id (Required) One or more IDs of resources to tag. This could be the ID of an AMI, an instance, an EBS volume, or snapshot, etc.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $tag (Required) The tags to add or overwrite for the specified resources. Each tag item consists of a key-value pair. <ul>
	 * 	<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 		<li><code>Key</code> - <code>string</code> - Optional - The tag's key. </li>
	 * 		<li><code>Value</code> - <code>string</code> - Optional - The tag's value. </li>
	 * 	</ul></li>
	 * </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_tags($resource_id, $tag, $opt = null)
	{
		if (!$opt) $opt = array();

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'ResourceId' => (is_array($resource_id) ? $resource_id : array($resource_id))
		)));

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'Tag' => (is_array($tag) ? $tag : array($tag))
		)));

		return $this->authenticate('CreateTags', $opt, $this->hostname);
	}

	/**
	 *
	 * Replaces an existing route within a route table in a VPC. For more information about route tables, go to <a
	 * href="http://docs.amazonwebservices.com/AmazonVPC/latest/UserGuide/VPC_Route_Tables.html">Route Tables</a> in the Amazon Virtual Private
	 * Cloud User Guide.
	 *
	 * @param string $route_table_id (Required) The ID of the route table where the route will be replaced.
	 * @param string $destination_cidr_block (Required) The CIDR address block used for the destination match. For example: <code>0.0.0.0/0</code>. The value you provide must match the CIDR of an existing route in the table.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>GatewayId</code> - <code>string</code> - Optional - The ID of a VPN or Internet gateway attached to your VPC. </li>
	 * 	<li><code>InstanceId</code> - <code>string</code> - Optional - The ID of a NAT instance in your VPC. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function replace_route($route_table_id, $destination_cidr_block, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['RouteTableId'] = $route_table_id;
		$opt['DestinationCidrBlock'] = $destination_cidr_block;

		return $this->authenticate('ReplaceRoute', $opt, $this->hostname);
	}

	/**
	 *
	 * Describes the tags for the specified resources.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for tags. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_tags($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeTags', $opt, $this->hostname);
	}

	/**
	 *
	 * CancelBundleTask operation cancels a pending or in-progress bundling task. This is an asynchronous call and it make take a while for the
	 * task to be canceled. If a task is canceled while it is storing items, there may be parts of the incomplete AMI stored in S3. It is up to the
	 * caller to clean up these parts from S3.
	 *
	 * @param string $bundle_id (Required) The ID of the bundle task to cancel.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function cancel_bundle_task($bundle_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['BundleId'] = $bundle_id;

		return $this->authenticate('CancelBundleTask', $opt, $this->hostname);
	}

	/**
	 *
	 * Cancels one or more Spot Instance requests.
	 *
	 * Spot Instances are instances that Amazon EC2 starts on your behalf when the maximum price that you specify exceeds the current Spot Price.
	 * Amazon EC2 periodically sets the Spot Price based on available Spot Instance capacity and current spot instance requests.
	 *
	 * For conceptual information about Spot Instances, refer to the Amazon Elastic Compute Cloud Developer Guide or Amazon Elastic Compute Cloud
	 * User Guide.
	 *
	 * @param string|array $spot_instance_request_id (Required) Specifies the ID of the Spot Instance request.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function cancel_spot_instance_requests($spot_instance_request_id, $opt = null)
	{
		if (!$opt) $opt = array();

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'SpotInstanceRequestId' => (is_array($spot_instance_request_id) ? $spot_instance_request_id : array($spot_instance_request_id))
		)));

		return $this->authenticate('CancelSpotInstanceRequests', $opt, $this->hostname);
	}

	/**
	 *
	 * The PurchaseReservedInstancesOffering operation purchases a Reserved Instance for use with your account. With Amazon EC2 Reserved
	 * Instances, you purchase the right to launch Amazon EC2 instances for a period of time (without getting insufficient capacity errors) and pay
	 * a lower usage rate for the actual time used.
	 *
	 * @param string $reserved_instances_offering_id (Required) The unique ID of the Reserved Instances offering being purchased.
	 * @param integer $instance_count (Required) The number of Reserved Instances to purchase.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function purchase_reserved_instances_offering($reserved_instances_offering_id, $instance_count, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['ReservedInstancesOfferingId'] = $reserved_instances_offering_id;
		$opt['InstanceCount'] = $instance_count;

		return $this->authenticate('PurchaseReservedInstancesOffering', $opt, $this->hostname);
	}

	/**
	 *
	 * Adds or remove permission settings for the specified snapshot.
	 *
	 * @param string $snapshot_id (Required) The ID of the EBS snapshot whose attributes are being modified.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Attribute</code> - <code>string</code> - Optional - The name of the attribute being modified. Available attribute names: <code>createVolumePermission</code> </li>
	 * 	<li><code>OperationType</code> - <code>string</code> - Optional - The operation to perform on the attribute. Available operation names: <code>add</code>, <code>remove</code> </li>
	 * 	<li><code>UserId</code> - <code>string|array</code> - Optional - The AWS user IDs to add to or remove from the list of users that have permission to create EBS volumes from the specified snapshot. Currently supports "all". Only valid when the <code>createVolumePermission</code> attribute is being modified.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>UserGroup</code> - <code>string|array</code> - Optional - The AWS group names to add to or remove from the list of groups that have permission to create EBS volumes from the specified snapshot. Currently supports "all". Only valid when the <code>createVolumePermission</code> attribute is being modified.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>CreateVolumePermission</code> - <code>array</code> - Optional -   <ul>
	 * 		<li><code>Add</code> - <code>array</code> - Optional -  <ul>
	 * 			<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 				<li><code>UserId</code> - <code>string</code> - Optional - The user ID of the user that can create volumes from the snapshot. </li>
	 * 				<li><code>Group</code> - <code>string</code> - Optional - The group that is allowed to create volumes from the snapshot (currently supports "all"). </li>
	 * 			</ul></li>
	 * 		</ul></li>
	 * 		<li><code>Remove</code> - <code>array</code> - Optional -  <ul>
	 * 			<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 				<li><code>UserId</code> - <code>string</code> - Optional - The user ID of the user that can create volumes from the snapshot. </li>
	 * 				<li><code>Group</code> - <code>string</code> - Optional - The group that is allowed to create volumes from the snapshot (currently supports "all"). </li>
	 * 			</ul></li>
	 * 		</ul></li></ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function modify_snapshot_attribute($snapshot_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['SnapshotId'] = $snapshot_id;

		// Optional parameter
		if (isset($opt['UserId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'UserId' => (is_array($opt['UserId']) ? $opt['UserId'] : array($opt['UserId']))
			)));
			unset($opt['UserId']);
		}

		// Optional parameter
		if (isset($opt['UserGroup']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'UserGroup' => (is_array($opt['UserGroup']) ? $opt['UserGroup'] : array($opt['UserGroup']))
			)));
			unset($opt['UserGroup']);
		}

		// Optional parameter
		if (isset($opt['CreateVolumePermission']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'CreateVolumePermission' => $opt['CreateVolumePermission']
			)));
			unset($opt['CreateVolumePermission']);
		}

		return $this->authenticate('ModifySnapshotAttribute', $opt, $this->hostname);
	}

	/**
	 *
	 * The TerminateInstances operation shuts down one or more instances. This operation is idempotent; if you terminate an instance more than
	 * once, each call will succeed.
	 *
	 * Terminated instances will remain visible after termination (approximately one hour).
	 *
	 * @param string|array $instance_id (Required) The list of instances to terminate.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function terminate_instances($instance_id, $opt = null)
	{
		if (!$opt) $opt = array();

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'InstanceId' => (is_array($instance_id) ? $instance_id : array($instance_id))
		)));

		return $this->authenticate('TerminateInstances', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes the data feed for Spot Instances.
	 *
	 * For conceptual information about Spot Instances, refer to the Amazon Elastic Compute Cloud Developer Guide or Amazon Elastic Compute Cloud
	 * User Guide.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_spot_datafeed_subscription($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('DeleteSpotDatafeedSubscription', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes an Internet gateway from your AWS account. The gateway must not be attached to a VPC. For more information about your VPC and
	 * Internet gateway, go to Amazon Virtual Private Cloud User Guide.
	 *
	 * @param string $internet_gateway_id (Required) The ID of the Internet gateway to be deleted.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_internet_gateway($internet_gateway_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['InternetGatewayId'] = $internet_gateway_id;

		return $this->authenticate('DeleteInternetGateway', $opt, $this->hostname);
	}

	/**
	 *
	 * Changes the route table associated with a given subnet in a VPC. After you execute this action, the subnet uses the routes in the new route
	 * table it's associated with. For more information about route tables, go to <a
	 * href="http://docs.amazonwebservices.com/AmazonVPC/latest/UserGuide/VPC_Route_Tables.html">Route Tables</a> in the Amazon Virtual Private
	 * Cloud User Guide.
	 *
	 * You can also use this to change which table is the main route table in the VPC. You just specify the main route table's association ID and
	 * the route table that you want to be the new main route table.
	 *
	 * @param string $association_id (Required) The ID representing the current association between the original route table and the subnet.
	 * @param string $route_table_id (Required) The ID of the new route table to associate with the subnet.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function replace_route_table_association($association_id, $route_table_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AssociationId'] = $association_id;
		$opt['RouteTableId'] = $route_table_id;

		return $this->authenticate('ReplaceRouteTableAssociation', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns information about an attribute of a snapshot. Only one attribute can be specified per call.
	 *
	 * @param string $snapshot_id (Required) The ID of the EBS snapshot whose attribute is being described.
	 * @param string $attribute (Required) The name of the EBS attribute to describe. Available attribute names: createVolumePermission
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_snapshot_attribute($snapshot_id, $attribute, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['SnapshotId'] = $snapshot_id;
		$opt['Attribute'] = $attribute;

		return $this->authenticate('DescribeSnapshotAttribute', $opt, $this->hostname);
	}

	/**
	 *
	 * The DescribeAddresses operation lists elastic IP addresses assigned to your account.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>PublicIp</code> - <code>string|array</code> - Optional - The optional list of Elastic IP addresses to describe.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for Addresses. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>AllocationId</code> - <code>string|array</code> - Optional -   Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_addresses($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['PublicIp']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'PublicIp' => (is_array($opt['PublicIp']) ? $opt['PublicIp'] : array($opt['PublicIp']))
			)));
			unset($opt['PublicIp']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		// Optional parameter
		if (isset($opt['AllocationId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'AllocationId' => (is_array($opt['AllocationId']) ? $opt['AllocationId'] : array($opt['AllocationId']))
			)));
			unset($opt['AllocationId']);
		}

		return $this->authenticate('DescribeAddresses', $opt, $this->hostname);
	}

	/**
	 *
	 * The DescribeKeyPairs operation returns information about key pairs available to you. If you specify key pairs, information about those key
	 * pairs is returned. Otherwise, information for all registered key pairs is returned.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>KeyName</code> - <code>string|array</code> - Optional - The optional list of key pair names to describe.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for KeyPairs. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_key_pairs($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['KeyName']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'KeyName' => (is_array($opt['KeyName']) ? $opt['KeyName'] : array($opt['KeyName']))
			)));
			unset($opt['KeyName']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeKeyPairs', $opt, $this->hostname);
	}

	/**
	 *
	 * The DescribeImageAttribute operation returns information about an attribute of an AMI. Only one attribute can be specified per call.
	 *
	 * @param string $image_id (Required) The ID of the AMI whose attribute is to be described.
	 * @param string $attribute (Required) The name of the attribute to describe. Available attribute names: <code>productCodes</code>, <code>kernel</code>, <code>ramdisk</code>, <code>launchPermisson</code>, <code>blockDeviceMapping</code>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_image_attribute($image_id, $attribute, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['ImageId'] = $image_id;
		$opt['Attribute'] = $attribute;

		return $this->authenticate('DescribeImageAttribute', $opt, $this->hostname);
	}

	/**
	 *
	 * Disassociates a subnet from a route table.
	 *
	 * After you perform this action, the subnet no longer uses the routes in the route table. Instead it uses the routes in the VPC's main route
	 * table. For more information about route tables, go to <a
	 * href="http://docs.amazonwebservices.com/AmazonVPC/latest/UserGuide/VPC_Route_Tables.html">Route Tables</a> in the Amazon Virtual Private
	 * Cloud User Guide.
	 *
	 * @param string $association_id (Required) The association ID representing the current association between the route table and subnet.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function disassociate_route_table($association_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AssociationId'] = $association_id;

		return $this->authenticate('DisassociateRouteTable', $opt, $this->hostname);
	}

	/**
	 *
	 * The ConfirmProductInstance operation returns true if the specified product code is attached to the specified instance. The operation
	 * returns false if the product code is not attached to the instance.
	 *
	 * The ConfirmProductInstance operation can only be executed by the owner of the AMI. This feature is useful when an AMI owner is providing
	 * support and wants to verify whether a user's instance is eligible.
	 *
	 * @param string $product_code (Required) The product code to confirm.
	 * @param string $instance_id (Required) The ID of the instance to confirm.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function confirm_product_instance($product_code, $instance_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['ProductCode'] = $product_code;
		$opt['InstanceId'] = $instance_id;

		return $this->authenticate('ConfirmProductInstance', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes an ingress or egress entry (i.e., rule) from a network ACL. For more information about network ACLs, go to Network ACLs in the
	 * Amazon Virtual Private Cloud User Guide.
	 *
	 * @param string $network_acl_id (Required) ID of the network ACL.
	 * @param integer $rule_number (Required) Rule number for the entry to delete.
	 * @param boolean $egress (Required) Whether the rule to delete is an egress rule (<code>true</code>) or ingress rule (<code>false</code>).
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_network_acl_entry($network_acl_id, $rule_number, $egress, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['NetworkAclId'] = $network_acl_id;
		$opt['RuleNumber'] = $rule_number;
		$opt['Egress'] = $egress;

		return $this->authenticate('DeleteNetworkAclEntry', $opt, $this->hostname);
	}

	/**
	 *
	 * This action applies only to security groups in a VPC. It doesn't work with EC2 security groups. For information about Amazon Virtual
	 * Private Cloud and VPC security groups, go to the Amazon Virtual Private Cloud User Guide.
	 *
	 * The action removes one or more egress rules from a VPC security group. The values that you specify in the revoke request (e.g., ports,
	 * etc.) must match the existing rule's values in order for the rule to be revoked.
	 *
	 * Each rule consists of the protocol, and the CIDR range or destination security group. For the TCP and UDP protocols, you must also specify
	 * the destination port or range of ports. For the ICMP protocol, you must also specify the ICMP type and code.
	 *
	 * Rule changes are propagated to instances within the security group as quickly as possible. However, a small delay might occur.
	 *
	 * @param string $group_id (Required) ID of the VPC security group to modify.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>IpPermissions</code> - <code>array</code> - Optional - List of IP permissions to authorize on the specified security group. Specifying permissions through IP permissions is the preferred way of authorizing permissions since it offers more flexibility and control. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>IpProtocol</code> - <code>string</code> - Optional - The IP protocol of this permission. Valid protocol values: <code>tcp</code>, <code>udp</code>, <code>icmp</code> </li>
	 * 			<li><code>FromPort</code> - <code>integer</code> - Optional - Start of port range for the TCP and UDP protocols, or an ICMP type number. An ICMP type number of <code>-1</code> indicates a wildcard (i.e., any ICMP type number). </li>
	 * 			<li><code>ToPort</code> - <code>integer</code> - Optional - End of port range for the TCP and UDP protocols, or an ICMP code. An ICMP code of <code>-1</code> indicates a wildcard (i.e., any ICMP code). </li>
	 * 			<li><code>Groups</code> - <code>array</code> - Optional - The list of AWS user IDs and groups included in this permission. <ul>
	 * 				<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 					<li><code>UserId</code> - <code>string</code> - Optional - The AWS user ID of an account. </li>
	 * 					<li><code>GroupName</code> - <code>string</code> - Optional - Name of the security group in the specified AWS account. Cannot be used when specifying a CIDR IP address range. </li>
	 * 					<li><code>GroupId</code> - <code>string</code> - Optional - ID of the security group in the specified AWS account. Cannot be used when specifying a CIDR IP address range. </li>
	 * 				</ul></li>
	 * 			</ul></li>
	 * 			<li><code>IpRanges</code> - <code>string|array</code> - Optional - The list of CIDR IP ranges included in this permission.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function revoke_security_group_egress($group_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['GroupId'] = $group_id;

		// Optional parameter
		if (isset($opt['IpPermissions']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'IpPermissions' => $opt['IpPermissions']
			)));
			unset($opt['IpPermissions']);
		}

		return $this->authenticate('RevokeSecurityGroupEgress', $opt, $this->hostname);
	}

	/**
	 *
	 * Initializes an empty volume of a given size.
	 *
	 * @param string $availability_zone (Required) The Availability Zone in which to create the new volume.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Size</code> - <code>integer</code> - Optional - The size of the volume, in gigabytes. Required if you are not creating a volume from a snapshot. </li>
	 * 	<li><code>SnapshotId</code> - <code>string</code> - Optional - The ID of the snapshot from which to create the new volume. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_volume($availability_zone, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AvailabilityZone'] = $availability_zone;

		return $this->authenticate('CreateVolume', $opt, $this->hostname);
	}

	/**
	 *
	 * Gives you information about your VPN gateways. You can filter the results to return information only about VPN gateways that match criteria
	 * you specify.
	 *
	 * For example, you could ask to get information about a particular VPN gateway (or all) only if the gateway's state is pending or available.
	 * You can specify multiple filters (e.g., the VPN gateway is in a particular Availability Zone and the gateway's state is pending or
	 * available).
	 *
	 * The result includes information for a particular VPN gateway only if the gateway matches all your filters. If there's no match, no special
	 * message is returned; the response is simply empty. The following table shows the available filters.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>VpnGatewayId</code> - <code>string|array</code> - Optional - A list of filters used to match properties for VPN Gateways. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for VPN Gateways. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_vpn_gateways($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['VpnGatewayId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'VpnGatewayId' => (is_array($opt['VpnGatewayId']) ? $opt['VpnGatewayId'] : array($opt['VpnGatewayId']))
			)));
			unset($opt['VpnGatewayId']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeVpnGateways', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a subnet in an existing VPC. You can create up to 20 subnets in a VPC. If you add more than one subnet to a VPC, they're set up in
	 * a star topology with a logical router in the middle. When you create each subnet, you provide the VPC ID and the CIDR block you want for the
	 * subnet. Once you create a subnet, you can't change its CIDR block. The subnet's CIDR block can be the same as the VPC's CIDR block (assuming
	 * you want only a single subnet in the VPC), or a subset of the VPC's CIDR block. If you create more than one subnet in a VPC, the subnets'
	 * CIDR blocks must not overlap. The smallest subnet (and VPC) you can create uses a <code>/28</code> netmask (16 IP addresses), and the
	 * largest uses a <code>/18</code> netmask (16,384 IP addresses).
	 *
	 * AWS reserves both the first four and the last IP address in each subnet's CIDR block. They're not available for use.
	 *
	 * @param string $vpc_id (Required) The ID of the VPC to create the subnet in.
	 * @param string $cidr_block (Required) The CIDR block the subnet is to cover.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>AvailabilityZone</code> - <code>string</code> - Optional - The Availability Zone to create the subnet in. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_subnet($vpc_id, $cidr_block, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['VpcId'] = $vpc_id;
		$opt['CidrBlock'] = $cidr_block;

		return $this->authenticate('CreateSubnet', $opt, $this->hostname);
	}

	/**
	 *
	 * The DescribeReservedInstancesOfferings operation describes Reserved Instance offerings that are available for purchase. With Amazon EC2
	 * Reserved Instances, you purchase the right to launch Amazon EC2 instances for a period of time (without getting insufficient capacity
	 * errors) and pay a lower usage rate for the actual time used.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>ReservedInstancesOfferingId</code> - <code>string|array</code> - Optional - An optional list of the unique IDs of the Reserved Instance offerings to describe.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>InstanceType</code> - <code>string</code> - Optional - The instance type on which the Reserved Instance can be used. [Allowed values: <code>t1.micro</code>, <code>m1.small</code>, <code>m1.large</code>, <code>m1.xlarge</code>, <code>m2.xlarge</code>, <code>m2.2xlarge</code>, <code>m2.4xlarge</code>, <code>c1.medium</code>, <code>c1.xlarge</code>, <code>cc1.4xlarge</code>, <code>cg1.4xlarge</code>]</li>
	 * 	<li><code>AvailabilityZone</code> - <code>string</code> - Optional - The Availability Zone in which the Reserved Instance can be used. </li>
	 * 	<li><code>ProductDescription</code> - <code>string</code> - Optional - The Reserved Instance product description. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for ReservedInstancesOfferings. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>InstanceTenancy</code> - <code>string</code> - Optional - The tenancy of the Reserved Instance offering. A Reserved Instance with tenancy of dedicated will run on single-tenant hardware and can only be launched within a VPC. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_reserved_instances_offerings($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['ReservedInstancesOfferingId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'ReservedInstancesOfferingId' => (is_array($opt['ReservedInstancesOfferingId']) ? $opt['ReservedInstancesOfferingId'] : array($opt['ReservedInstancesOfferingId']))
			)));
			unset($opt['ReservedInstancesOfferingId']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeReservedInstancesOfferings', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes the snapshot identified by <code>snapshotId</code>.
	 *
	 * @param string $snapshot_id (Required) The ID of the snapshot to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_snapshot($snapshot_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['SnapshotId'] = $snapshot_id;

		return $this->authenticate('DeleteSnapshot', $opt, $this->hostname);
	}

	/**
	 *
	 * Changes which network ACL a subnet is associated with. By default when you create a subnet, it's automatically associated with the default
	 * network ACL. For more information about network ACLs, go to Network ACLs in the Amazon Virtual Private Cloud User Guide.
	 *
	 * @param string $association_id (Required) The ID representing the current association between the original network ACL and the subnet.
	 * @param string $network_acl_id (Required) The ID of the new ACL to associate with the subnet.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function replace_network_acl_association($association_id, $network_acl_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AssociationId'] = $association_id;
		$opt['NetworkAclId'] = $network_acl_id;

		return $this->authenticate('ReplaceNetworkAclAssociation', $opt, $this->hostname);
	}

	/**
	 *
	 * The DisassociateAddress operation disassociates the specified elastic IP address from the instance to which it is assigned. This is an
	 * idempotent operation. If you enter it more than once, Amazon EC2 does not return an error.
	 *
	 * @param string $public_ip (Required) The elastic IP address that you are disassociating from the instance.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>AssociationId</code> - <code>string</code> - Optional - Association ID corresponding to the VPC elastic IP address you want to disassociate. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function disassociate_address($public_ip, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['PublicIp'] = $public_ip;

		return $this->authenticate('DisassociateAddress', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a PlacementGroup into which multiple Amazon EC2 instances can be launched. Users must give the group a name unique within the scope
	 * of the user account.
	 *
	 * @param string $group_name (Required) The name of the <code>PlacementGroup</code>.
	 * @param string $strategy (Required) The <code>PlacementGroup</code> strategy. [Allowed values: <code>cluster</code>]
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_placement_group($group_name, $strategy, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['GroupName'] = $group_name;
		$opt['Strategy'] = $strategy;

		return $this->authenticate('CreatePlacementGroup', $opt, $this->hostname);
	}

	/**
	 * The BundleInstance operation request that an instance is bundled the next time it boots. The
	 * bundling process creates a new image from a running instance and stores the AMI data in S3. Once
	 * bundled, the image must be registered in the normal way using the RegisterImage API.
	 *
	 * @param string $instance_id (Required) The ID of the instance to bundle.
	 * @param array $policy (Required) The details of S3 storage for bundling a Windows instance. Takes an associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Bucket</code> - <code>string</code> - Optional - The bucket in which to store the AMI. You can specify a bucket that you already own or a new bucket that Amazon EC2 creates on your behalf. If you specify a bucket that belongs to someone else, Amazon EC2 returns an error.</li>
	 * 	<li><code>Prefix</code> - <code>string</code> - Optional - The prefix to use when storing the AMI in S3.</li>
	 * 	<li><code>AWSAccessKeyId</code> - <code>string</code> - Optional - The Access Key ID of the owner of the Amazon S3 bucket. Use the <CFPolicy::get_key()> method of a <CFPolicy> instance.</li>
	 * 	<li><code>UploadPolicy</code> - <code>string</code> - Optional - A Base64-encoded Amazon S3 upload policy that gives Amazon EC2 permission to upload items into Amazon S3 on the user's behalf. Use the <CFPolicy::get_policy()> method of a <CFPolicy> instance.</li>
	 * 	<li><code>UploadPolicySignature</code> - <code>string</code> - Optional - The signature of the Base64 encoded JSON document. Use the <CFPolicy::get_policy_signature()> method of a <CFPolicy> instance.</li></ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 *  <li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This is useful for manually-managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function bundle_instance($instance_id, $policy, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['InstanceId'] = $instance_id;

		$opt = array_merge($opt, CFComplexType::map(array(
			'Storage.S3' => $policy
		)));

		return $this->authenticate('BundleInstance', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes a PlacementGroup from a user's account. Terminate all Amazon EC2 instances in the placement group before deletion.
	 *
	 * @param string $group_name (Required) The name of the <code>PlacementGroup</code> to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_placement_group($group_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['GroupName'] = $group_name;

		return $this->authenticate('DeletePlacementGroup', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes a VPC. You must detach or delete all gateways or other objects that are dependent on the VPC first. For example, you must terminate
	 * all running instances, delete all VPC security groups (except the default), delete all the route tables (except the default), etc.
	 *
	 * @param string $vpc_id (Required) The ID of the VPC you want to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_vpc($vpc_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['VpcId'] = $vpc_id;

		return $this->authenticate('DeleteVpc', $opt, $this->hostname);
	}

	/**
	 *
	 * The AllocateAddress operation acquires an elastic IP address for use with your account.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Domain</code> - <code>string</code> - Optional - Set to <code>vpc</code> to allocate the address to your VPC. By default, will allocate to EC2. [Allowed values: <code>vpc</code>, <code>standard</code>]</li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function allocate_address($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('AllocateAddress', $opt, $this->hostname);
	}

	/**
	 *
	 * The ReleaseAddress operation releases an elastic IP address associated with your account.
	 *
	 * Releasing an IP address automatically disassociates it from any instance with which it is associated. For more information, see
	 * DisassociateAddress.
	 *
	 * After releasing an elastic IP address, it is released to the IP address pool and might no longer be available to your account. Make sure to
	 * update your DNS records and any servers or devices that communicate with the address.
	 *
	 * If you run this operation on an elastic IP address that is already released, the address might be assigned to another account which will
	 * cause Amazon EC2 to return an error.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>PublicIp</code> - <code>string</code> - Optional - The elastic IP address that you are releasing from your account. </li>
	 * 	<li><code>AllocationId</code> - <code>string</code> - Optional - The allocation ID that AWS provided when you allocated the address for use with Amazon VPC. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function release_address($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('ReleaseAddress', $opt, $this->hostname);
	}

	/**
	 *
	 * Resets an attribute of an instance to its default value.
	 *
	 * @param string $instance_id (Required) The ID of the Amazon EC2 instance whose attribute is being reset.
	 * @param string $attribute (Required) The name of the attribute being reset. Available attribute names: <code>kernel</code>, <code>ramdisk</code>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function reset_instance_attribute($instance_id, $attribute, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['InstanceId'] = $instance_id;
		$opt['Attribute'] = $attribute;

		return $this->authenticate('ResetInstanceAttribute', $opt, $this->hostname);
	}

	/**
	 *
	 * The CreateKeyPair operation creates a new 2048 bit RSA key pair and returns a unique ID that can be used to reference this key pair when
	 * launching new instances. For more information, see RunInstances.
	 *
	 * @param string $key_name (Required) The unique name for the new key pair.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_key_pair($key_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['KeyName'] = $key_name;

		return $this->authenticate('CreateKeyPair', $opt, $this->hostname);
	}

	/**
	 *
	 * Replaces an entry (i.e., rule) in a network ACL. For more information about network ACLs, go to Network ACLs in the Amazon Virtual Private
	 * Cloud User Guide.
	 *
	 * @param string $network_acl_id (Required) ID of the ACL where the entry will be replaced.
	 * @param integer $rule_number (Required) Rule number of the entry to replace.
	 * @param string $protocol (Required) IP protocol the rule applies to. Valid Values: <code>tcp</code>, <code>udp</code>, <code>icmp</code> or an IP protocol number.
	 * @param string $rule_action (Required) Whether to allow or deny traffic that matches the rule. [Allowed values: <code>allow</code>, <code>deny</code>]
	 * @param boolean $egress (Required) Whether this rule applies to egress traffic from the subnet (<code>true</code>) or ingress traffic (<code>false</code>).
	 * @param string $cidr_block (Required) The CIDR range to allow or deny, in CIDR notation (e.g., <code>172.16.0.0/24</code>).
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Icmp</code> - <code>array</code> - Optional -  ICMP values. <ul>
	 * 		<li><code>Type</code> - <code>integer</code> - Optional - For the ICMP protocol, the ICMP type. A value of <code>-1</code> is a wildcard meaning all types. Required if specifying <code>icmp</code> for the protocol. </li>
	 * 		<li><code>Code</code> - <code>integer</code> - Optional - For the ICMP protocol, the ICMP code. A value of <code>-1</code> is a wildcard meaning all codes. Required if specifying <code>icmp</code> for the protocol. </li></ul></li>
	 * 	<li><code>PortRange</code> - <code>array</code> - Optional -  Port ranges. <ul>
	 * 		<li><code>From</code> - <code>integer</code> - Optional - The first port in the range. Required if specifying <code>tcp</code> or <code>udp</code> for the protocol. </li>
	 * 		<li><code>To</code> - <code>integer</code> - Optional - The last port in the range. Required if specifying <code>tcp</code> or <code>udp</code> for the protocol. </li></ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function replace_network_acl_entry($network_acl_id, $rule_number, $protocol, $rule_action, $egress, $cidr_block, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['NetworkAclId'] = $network_acl_id;
		$opt['RuleNumber'] = $rule_number;
		$opt['Protocol'] = $protocol;
		$opt['RuleAction'] = $rule_action;
		$opt['Egress'] = $egress;
		$opt['CidrBlock'] = $cidr_block;

		// Optional parameter
		if (isset($opt['Icmp']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Icmp' => $opt['Icmp']
			)));
			unset($opt['Icmp']);
		}

		// Optional parameter
		if (isset($opt['PortRange']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'PortRange' => $opt['PortRange']
			)));
			unset($opt['PortRange']);
		}

		return $this->authenticate('ReplaceNetworkAclEntry', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns information about the Amazon EBS snapshots available to you. Snapshots available to you include public snapshots available for any
	 * AWS account to launch, private snapshots you own, and private snapshots owned by another AWS account but for which you've been given
	 * explicit create volume permissions.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>SnapshotId</code> - <code>string|array</code> - Optional - The optional list of EBS snapshot IDs to describe.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Owner</code> - <code>string|array</code> - Optional - The optional list of EBS snapshot owners.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>RestorableBy</code> - <code>string|array</code> - Optional - The optional list of users who have permission to create volumes from the described EBS snapshots.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Filter</code> - <code>array</code> - Optional - A list of filters used to match properties for Snapshots. For a complete reference to the available filter keys for this operation, see the Amazon EC2 API reference. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Specifies the name of the filter. </li>
	 * 			<li><code>Value</code> - <code>string|array</code> - Optional - Contains one or more values for the filter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_snapshots($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['SnapshotId']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'SnapshotId' => (is_array($opt['SnapshotId']) ? $opt['SnapshotId'] : array($opt['SnapshotId']))
			)));
			unset($opt['SnapshotId']);
		}

		// Optional parameter
		if (isset($opt['Owner']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Owner' => (is_array($opt['Owner']) ? $opt['Owner'] : array($opt['Owner']))
			)));
			unset($opt['Owner']);
		}

		// Optional parameter
		if (isset($opt['RestorableBy']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'RestorableBy' => (is_array($opt['RestorableBy']) ? $opt['RestorableBy'] : array($opt['RestorableBy']))
			)));
			unset($opt['RestorableBy']);
		}

		// Optional parameter
		if (isset($opt['Filter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Filter' => $opt['Filter']
			)));
			unset($opt['Filter']);
		}

		return $this->authenticate('DescribeSnapshots', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a new network ACL in a VPC. Network ACLs provide an optional layer of security (on top of security groups) for the instances in
	 * your VPC. For more information about network ACLs, go to Network ACLs in the Amazon Virtual Private Cloud User Guide.
	 *
	 * @param string $vpc_id (Required) The ID of the VPC where the network ACL will be created.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_network_acl($vpc_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['VpcId'] = $vpc_id;

		return $this->authenticate('CreateNetworkAcl', $opt, $this->hostname);
	}

	/**
	 *
	 * The RegisterImage operation registers an AMI with Amazon EC2. Images must be registered before they can be launched. For more information,
	 * see RunInstances.
	 *
	 * Each AMI is associated with an unique ID which is provided by the Amazon EC2 service through the RegisterImage operation. During
	 * registration, Amazon EC2 retrieves the specified image manifest from Amazon S3 and verifies that the image is owned by the user registering
	 * the image.
	 *
	 * The image manifest is retrieved once and stored within the Amazon EC2. Any modifications to an image in Amazon S3 invalidates this
	 * registration. If you make changes to an image, deregister the previous image and register the new image. For more information, see
	 * DeregisterImage.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>ImageLocation</code> - <code>string</code> - Optional - The full path to your AMI manifest in Amazon S3 storage. </li>
	 * 	<li><code>Name</code> - <code>string</code> - Optional - The name to give the new Amazon Machine Image. Constraints: 3-128 alphanumeric characters, parenthesis (<code>()</code>), commas (<code>,</code>), slashes (<code>/</code>), dashes (<code>-</code>), or underscores(<code>_</code>) </li>
	 * 	<li><code>Description</code> - <code>string</code> - Optional - The description describing the new AMI. </li>
	 * 	<li><code>Architecture</code> - <code>string</code> - Optional - The architecture of the image. Valid Values: <code>i386</code>, <code>x86_64</code> </li>
	 * 	<li><code>KernelId</code> - <code>string</code> - Optional - The optional ID of a specific kernel to register with the new AMI. </li>
	 * 	<li><code>RamdiskId</code> - <code>string</code> - Optional - The optional ID of a specific ramdisk to register with the new AMI. Some kernels require additional drivers at launch. Check the kernel requirements for information on whether you need to specify a RAM disk. </li>
	 * 	<li><code>RootDeviceName</code> - <code>string</code> - Optional - The root device name (e.g., <code>/dev/sda1</code>). </li>
	 * 	<li><code>BlockDeviceMapping</code> - <code>array</code> - Optional - The block device mappings for the new AMI, which specify how different block devices (ex: EBS volumes and ephemeral drives) will be exposed on instances launched from the new image. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>VirtualName</code> - <code>string</code> - Optional - Specifies the virtual device name. </li>
	 * 			<li><code>DeviceName</code> - <code>string</code> - Optional - Specifies the device name (e.g., <code>/dev/sdh</code>). </li>
	 * 			<li><code>Ebs</code> - <code>array</code> - Optional - Specifies parameters used to automatically setup Amazon EBS volumes when the instance is launched. Takes an associative array of parameters that can have the following keys: <ul>
	 * 				<li><code>SnapshotId</code> - <code>string</code> - Optional - The ID of the snapshot from which the volume will be created. </li>
	 * 				<li><code>VolumeSize</code> - <code>integer</code> - Optional - The size of the volume, in gigabytes. </li>
	 * 				<li><code>DeleteOnTermination</code> - <code>boolean</code> - Optional - Specifies whether the Amazon EBS volume is deleted on instance termination. </li>
	 * 			</ul></li>
	 * 			<li><code>NoDevice</code> - <code>string</code> - Optional - Specifies the device name to suppress during instance launch. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function register_image($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['BlockDeviceMapping']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'BlockDeviceMapping' => $opt['BlockDeviceMapping']
			)));
			unset($opt['BlockDeviceMapping']);
		}

		return $this->authenticate('RegisterImage', $opt, $this->hostname);
	}
}


/*%******************************************************************************************%*/
// EXCEPTIONS

/**
 * Default EC2 Exception.
 */
class EC2_Exception extends Exception {}