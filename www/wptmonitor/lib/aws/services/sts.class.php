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
 * This is the AWS Security Token Service (STS) API Reference. STS is a web service that enables you to request temporary, limited-privilege
 * credentials for users that you authenticate (federated users), or IAM users. This guide provides descriptions of the STS API as well as
 * links to related content in <a href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/">Using AWS Identity and Access Management</a>.
 *
 * For more detailed information about using this service, go to <a
 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/TokenBasedAuth.html">Granting Temporary Access to Your AWS Resources</a>, in
 * <i>Using AWS Identity and Access Management</i>.
 *
 * For specific information about setting up signatures and authorization through the API, go to <a
 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/IAM_UsingQueryAPI.html">Making Query Requests</a> in <i>Using AWS Identity and
 * Access Management</i>.
 *
 * If you're new to AWS and need additional technical information about a specific AWS product, you can find the product's technical
 * documentation at <a href="http://aws.amazon.com/documentation/">http://aws.amazon.com/documentation/</a>.
 *
 * We will refer to Amazon AWS Security Token Service using the abbreviated form STS, and to Amazon Identity and Access Management using the
 * abbreviated form IAM. All copyrights and legal protections still apply.
 *
 * @version Thu Sep 01 21:24:44 PDT 2011
 * @license See the included NOTICE.md file for complete information.
 * @copyright See the included NOTICE.md file for complete information.
 * @link http://aws.amazon.com/sts/AWS Secure Token Service
 * @link http://aws.amazon.com/documentation/sts/AWS Secure Token Service documentation
 */
class AmazonSTS extends CFRuntime
{

	/*%******************************************************************************************%*/
	// CLASS CONSTANTS

	/**
	 * Specify the default queue URL.
	 */
	const DEFAULT_URL = 'sts.amazonaws.com';




	/*%******************************************************************************************%*/
	// CONSTRUCTOR

	/**
	 * Constructs a new instance of <AmazonSTS>.
	 *
	 * @param string $key (Optional) Your Amazon API Key. If blank, it will look for the <code>AWS_KEY</code> constant.
	 * @param string $secret_key (Optional) Your Amazon API Secret Key. If blank, it will look for the <code>AWS_SECRET_KEY</code> constant.
	 * @return boolean false if no valid values are set, otherwise true.
	 */
	public function __construct($key = null, $secret_key = null)
	{
		$this->api_version = '2011-06-15';
		$this->hostname = self::DEFAULT_URL;

		if (!$key && !defined('AWS_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new STS_Exception('No account key was passed into the constructor, nor was it set in the AWS_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		if (!$secret_key && !defined('AWS_SECRET_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new STS_Exception('No account secret was passed into the constructor, nor was it set in the AWS_SECRET_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		return parent::__construct($key, $secret_key);
	}


	/*%******************************************************************************************%*/
	// SERVICE METHODS

	/**
	 *
	 * The GetSessionToken action returns a set of temporary credentials for an AWS account or IAM User. The credentials consist of an Access Key
	 * ID, a Secret Access Key, and a security token. These credentials are valid for the specified duration only. The session duration for IAM
	 * users can be between one and 36 hours, with a default of 12 hours. The session duration for AWS account owners is restricted to one hour.
	 *
	 * For more information about using GetSessionToken to create temporary credentials, go to <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/CreatingSessionTokens.html">Creating Temporary Credentials to Enable Access for
	 * IAM Users</a> in <i>Using AWS Identity and Access Management</i>.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>DurationSeconds</code> - <code>integer</code> - Optional - The duration, in seconds, that the credentials should remain valid. Acceptable durations for IAM user sessions range from 3600s (one hour) to 129600s (36 hours), with 43200s (12 hours) as the default. Sessions for AWS account owners are restricted to a maximum of 3600s (one hour). </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function get_session_token($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('GetSessionToken', $opt, $this->hostname);
	}

	/**
	 *
	 * The GetFederationToken action returns a set of temporary credentials for a federated user with the user name and policy specified in the
	 * request. The credentials consist of an Access Key ID, a Secret Access Key, and a security token. The credentials are valid for the specified
	 * duration, between one and 36 hours.
	 *
	 * The federated user who holds these credentials has any permissions allowed by the intersection of the specified policy and any resource or
	 * user policies that apply to the caller of the GetFederationToken API, and any resource policies that apply to the federated user's ARN. For
	 * more information about how token permissions work, see <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/TokenPermissions.html">Controlling Permissions in Temporary Credentials</a> in
	 * <i>Using AWS Identity and Access Management</i>. For information about using GetFederationToken to create temporary credentials, see <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/CreatingFedTokens.html">Creating Temporary Credentials to Enable Access for
	 * Federated Users</a> in <i>Using AWS Identity and Access Management</i>.
	 *
	 * @param string $name (Required) The name of the federated user associated with the credentials. For information about limitations on user names, go to Limitations on IAM Entities in <i>Using AWS Identity and Access Management</i>.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Policy</code> - <code>string</code> - Optional - A policy specifying the permissions to associate with the credentials. The caller can delegate their own permissions by specifying a policy, and both policies will be checked when a service call is made. For more information about how permissions work in the context of temporary credentials, see Controlling Permissions in Temporary Credentials in <i>Using AWS Identity and Access Management</i>. </li>
	 * 	<li><code>DurationSeconds</code> - <code>integer</code> - Optional - The duration, in seconds, that the session should last. Acceptable durations for federation sessions range from 3600s (one hour) to 129600s (36 hours), with 43200s (12 hours) as the default. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function get_federation_token($name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['Name'] = $name;

		return $this->authenticate('GetFederationToken', $opt, $this->hostname);
	}
}


/*%******************************************************************************************%*/
// EXCEPTIONS

/**
 * Default STS Exception.
 */
class STS_Exception extends Exception {}