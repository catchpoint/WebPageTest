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
 * This is the AWS Identity and Access Management (IAM) API Reference. This guide provides descriptions of the IAM API as well as links to
 * related content in the guide, <a href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/">Using IAM</a>.
 *
 * AWS Identity and Access Management (IAM) is a web service that enables Amazon Web Services (AWS) customers to manage Users and User
 * permissions under their AWS Account.
 *
 * For more information about this product go to <a href="http://aws.amazon.com/iam/">AWS Identity and Access Management (IAM)</a>. For
 * specific information about setting up signatures and authorization through the API, go to <a
 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/IAM_UsingQueryAPI.html">Making Query Requests</a> in the Using IAM guide.
 *
 * If you're new to AWS and need additional technical information about a specific AWS product, you can find the product's technical
 * documentation at <a href="http://aws.amazon.com/documentation/">http://aws.amazon.com/documentation/</a>.
 *
 * We will refer to Amazon AWS Identity and Access Management using the abbreviated form IAM. All copyrights and legal protections still apply.
 *
 * @version Thu Sep 01 21:21:56 PDT 2011
 * @license See the included NOTICE.md file for complete information.
 * @copyright See the included NOTICE.md file for complete information.
 * @link http://aws.amazon.com/iam/Amazon Identity and Access Management Service
 * @link http://aws.amazon.com/documentation/iam/Amazon Identity and Access Management Service documentation
 */
class AmazonIAM extends CFRuntime
{

	/*%******************************************************************************************%*/
	// CLASS CONSTANTS

	/**
	 * Specify the default queue URL.
	 */
	const DEFAULT_URL = 'iam.amazonaws.com';



	/*%******************************************************************************************%*/
	// CONSTRUCTOR

	/**
	 * Constructs a new instance of <AmazonIAM>.
	 *
	 * @param string $key (Optional) Your Amazon API Key. If blank, it will look for the <code>AWS_KEY</code> constant.
	 * @param string $secret_key (Optional) Your Amazon API Secret Key. If blank, it will look for the <code>AWS_SECRET_KEY</code> constant.
	 * @return boolean false if no valid values are set, otherwise true.
	 */
	public function __construct($key = null, $secret_key = null)
	{
		$this->api_version = '2010-05-08';
		$this->hostname = self::DEFAULT_URL;

		if (!$key && !defined('AWS_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new IAM_Exception('No account key was passed into the constructor, nor was it set in the AWS_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		if (!$secret_key && !defined('AWS_SECRET_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new IAM_Exception('No account secret was passed into the constructor, nor was it set in the AWS_SECRET_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		return parent::__construct($key, $secret_key);
	}


	/*%******************************************************************************************%*/
	// SERVICE METHODS

	/**
	 *
	 * Lists the groups that have the specified path prefix.
	 *
	 * You can paginate the results using the <code>MaxItems</code> and <code>Marker</code> parameters.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>PathPrefix</code> - <code>string</code> - Optional - The path prefix for filtering the results. For example: <code>/division_abc/subdivision_xyz/</code>, which would get all groups whose path starts with <code>/division_abc/subdivision_xyz/</code>. This parameter is optional. If it is not included, it defaults to a slash (/), listing all groups. </li>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - Use this only when paginating results, and only in a subsequent request after you've received a response where the results are truncated. Set it to the value of the <code>Marker</code> element in the response you just received. </li>
	 * 	<li><code>MaxItems</code> - <code>integer</code> - Optional - Use this only when paginating results to indicate the maximum number of groups you want in the response. If there are additional groups beyond the maximum you specify, the <code>IsTruncated</code> response element is <code>true</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function list_groups($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('ListGroups', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes the access key associated with the specified User.
	 *
	 * If you do not specify a User name, IAM determines the User name implicitly based on the AWS Access Key ID signing the request. Because this
	 * action works for access keys under the AWS Account, you can use this API to manage root credentials even if the AWS Account has no
	 * associated Users.
	 *
	 * @param string $access_key_id (Required) The Access Key ID for the Access Key ID and Secret Access Key you want to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>UserName</code> - <code>string</code> - Optional - Name of the User whose key you want to delete. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_access_key($access_key_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AccessKeyId'] = $access_key_id;

		return $this->authenticate('DeleteAccessKey', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes the specified AWS Account alias. For information about using an AWS Account alias, see <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/AccountAlias.html">Using an Alias for Your AWS Account ID</a> in <i>Using AWS
	 * Identity and Access Management</i>.
	 *
	 * @param string $account_alias (Required) Name of the account alias to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_account_alias($account_alias, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AccountAlias'] = $account_alias;

		return $this->authenticate('DeleteAccountAlias', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns information about the signing certificates associated with the specified User. If there are none, the action returns an empty list.
	 *
	 * Although each User is limited to a small number of signing certificates, you can still paginate the results using the <code>MaxItems</code>
	 * and <code>Marker</code> parameters.
	 *
	 * If the <code>UserName</code> field is not specified, the UserName is determined implicitly based on the AWS Access Key ID used to sign the
	 * request. Because this action works for access keys under the AWS Account, this API can be used to manage root credentials even if the AWS
	 * Account has no associated Users.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>UserName</code> - <code>string</code> - Optional - The name of the User. </li>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - Use this only when paginating results, and only in a subsequent request after you've received a response where the results are truncated. Set it to the value of the <code>Marker</code> element in the response you just received. </li>
	 * 	<li><code>MaxItems</code> - <code>integer</code> - Optional - Use this only when paginating results to indicate the maximum number of certificate IDs you want in the response. If there are additional certificate IDs beyond the maximum you specify, the <code>IsTruncated</code> response element is <code>true</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function list_signing_certificates($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('ListSigningCertificates', $opt, $this->hostname);
	}

	/**
	 *
	 * Uploads an X.509 signing certificate and associates it with the specified User. Some AWS services use X.509 signing certificates to validate
	 * requests that are signed with a corresponding private key. When you upload the certificate, its default status is <code>Active</code>.
	 *
	 * If the <code>UserName</code> field is not specified, the User name is determined implicitly based on the AWS Access Key ID used to sign the
	 * request. Because this action works for access keys under the AWS Account, this API can be used to manage root credentials even if the AWS
	 * Account has no associated Users.
	 *
	 * Because the body of a X.509 certificate can be large, you should use POST rather than GET when calling
	 * <code>UploadSigningCertificate</code>. For more information, see <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/index.html?IAM_UsingQueryAPI.html">Making Query Requests</a> in <i>Using AWS
	 * Identity and Access Management</i>.
	 *
	 * @param string $certificate_body (Required) The contents of the signing certificate.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>UserName</code> - <code>string</code> - Optional - Name of the User the signing certificate is for. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function upload_signing_certificate($certificate_body, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['CertificateBody'] = $certificate_body;

		return $this->authenticate('UploadSigningCertificate', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes the specified policy associated with the specified User.
	 *
	 * @param string $user_name (Required) Name of the User the policy is associated with.
	 * @param string $policy_name (Required) Name of the policy document to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_user_policy($user_name, $policy_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['UserName'] = $user_name;
		$opt['PolicyName'] = $policy_name;

		return $this->authenticate('DeleteUserPolicy', $opt, $this->hostname);
	}

	/**
	 *
	 * Adds (or updates) a policy document associated with the specified User. For information about policies, refer to <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/index.html?PoliciesOverview.html">Overview of Policies</a> in <i>Using AWS
	 * Identity and Access Management</i>.
	 *
	 * For information about limits on the number of policies you can associate with a User, see <a
	 * href="http://docs.amazonwebservices.com/IAM/2010-05-08/UserGuide/index.html?LimitationsOnEntities.html">Limitations on IAM Entities</a> in
	 * <i>Using AWS Identity and Access Management</i>.
	 *
	 * Because policy documents can be large, you should use POST rather than GET when calling <code>PutUserPolicy</code>. For more information,
	 * see <a href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/index.html?IAM_UsingQueryAPI.html">Making Query Requests</a> in <i>Using
	 * AWS Identity and Access Management</i>.
	 *
	 * @param string $user_name (Required) Name of the User to associate the policy with.
	 * @param string $policy_name (Required) Name of the policy document.
	 * @param string $policy_document (Required) The policy document.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function put_user_policy($user_name, $policy_name, $policy_document, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['UserName'] = $user_name;
		$opt['PolicyName'] = $policy_name;
		$opt['PolicyDocument'] = $policy_document;

		return $this->authenticate('PutUserPolicy', $opt, $this->hostname);
	}

	/**
	 *
	 * Lists the server certificates that have the specified path prefix. If none exist, the action returns an empty list.
	 *
	 * You can paginate the results using the <code>MaxItems</code> and <code>Marker</code> parameters.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>PathPrefix</code> - <code>string</code> - Optional - The path prefix for filtering the results. For example: <code>/company/servercerts</code> would get all server certificates for which the path starts with <code>/company/servercerts</code>. This parameter is optional. If it is not included, it defaults to a slash (/), listing all server certificates. </li>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - Use this only when paginating results, and only in a subsequent request after you've received a response where the results are truncated. Set it to the value of the <code>Marker</code> element in the response you just received. </li>
	 * 	<li><code>MaxItems</code> - <code>integer</code> - Optional - Use this only when paginating results to indicate the maximum number of server certificates you want in the response. If there are additional server certificates beyond the maximum you specify, the <code>IsTruncated</code> response element will be set to <code>true</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function list_server_certificates($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('ListServerCertificates', $opt, $this->hostname);
	}

	/**
	 *
	 * Retrieves the specified policy document for the specified User. The returned policy is URL-encoded according to RFC 3986. For more
	 * information about RFC 3986, go to <a href="http://www.faqs.org/rfcs/rfc3986.html">http://www.faqs.org/rfcs/rfc3986.html</a>.
	 *
	 * @param string $user_name (Required) Name of the User who the policy is associated with.
	 * @param string $policy_name (Required) Name of the policy document to get.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function get_user_policy($user_name, $policy_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['UserName'] = $user_name;
		$opt['PolicyName'] = $policy_name;

		return $this->authenticate('GetUserPolicy', $opt, $this->hostname);
	}

	/**
	 *
	 * Updates the login profile for the specified User. Use this API to change the User's password.
	 *
	 * @param string $user_name (Required) Name of the User whose login profile you want to update.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Password</code> - <code>string</code> - Optional - The new password for the User name. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function update_login_profile($user_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['UserName'] = $user_name;

		return $this->authenticate('UpdateLoginProfile', $opt, $this->hostname);
	}

	/**
	 *
	 * Updates the name and/or the path of the specified server certificate.
	 *
	 * You should understand the implications of changing a server certificate's path or name. For more information, see <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/ManagingServerCerts.html">Managing Server Certificates</a> in <i>Using AWS
	 * Identity and Access Management</i>.
	 *
	 * To change a server certificate name the requester must have appropriate permissions on both the source object and the target object. For
	 * example, to change the name from ProductionCert to ProdCert, the entity making the request must have permission on ProductionCert and
	 * ProdCert, or must have permission on all (*). For more information about permissions, see <a
	 * href="http://docs.amazonwebservices.com/IAM/2010-05-08/UserGuide/PermissionsAndPolicies.html">Permissions and Policies</a>.
	 *
	 * @param string $server_certificate_name (Required) The name of the server certificate that you want to update.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>NewPath</code> - <code>string</code> - Optional - The new path for the server certificate. Include this only if you are updating the server certificate's path. </li>
	 * 	<li><code>NewServerCertificateName</code> - <code>string</code> - Optional - The new name for the server certificate. Include this only if you are updating the server certificate's name. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function update_server_certificate($server_certificate_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['ServerCertificateName'] = $server_certificate_name;

		return $this->authenticate('UpdateServerCertificate', $opt, $this->hostname);
	}

	/**
	 *
	 * Updates the name and/or the path of the specified User.
	 *
	 * You should understand the implications of changing a User's path or name. For more information, see <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/index.html?Using_Renaming.html">Renaming Users and Groups</a> in <i>Using AWS
	 * Identity and Access Management</i>.
	 *
	 * To change a User name the requester must have appropriate permissions on both the source object and the target object. For example, to
	 * change Bob to Robert, the entity making the request must have permission on Bob and Robert, or must have permission on all (*). For more
	 * information about permissions, see <a
	 * href="http://docs.amazonwebservices.com/IAM/2010-05-08/UserGuide/PermissionsAndPolicies.html">Permissions and Policies</a>.
	 *
	 * @param string $user_name (Required) Name of the User to update. If you're changing the name of the User, this is the original User name.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>NewPath</code> - <code>string</code> - Optional - New path for the User. Include this parameter only if you're changing the User's path. </li>
	 * 	<li><code>NewUserName</code> - <code>string</code> - Optional - New name for the User. Include this parameter only if you're changing the User's name. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function update_user($user_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['UserName'] = $user_name;

		return $this->authenticate('UpdateUser', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes the login profile for the specified User, which terminates the User's ability to access AWS services through the IAM login page.
	 *
	 * Deleting a User's login profile does not prevent a User from accessing IAM through the command line interface or the API. To prevent all
	 * User access you must also either make the access key inactive or delete it. For more information about making keys inactive or deleting
	 * them, see UpdateAccessKey and DeleteAccessKey.
	 *
	 * @param string $user_name (Required) Name of the User whose login profile you want to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_login_profile($user_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['UserName'] = $user_name;

		return $this->authenticate('DeleteLoginProfile', $opt, $this->hostname);
	}

	/**
	 *
	 * Changes the status of the specified signing certificate from active to disabled, or vice versa. This action can be used to disable a User's
	 * signing certificate as part of a certificate rotation workflow.
	 *
	 * If the <code>UserName</code> field is not specified, the UserName is determined implicitly based on the AWS Access Key ID used to sign the
	 * request. Because this action works for access keys under the AWS Account, this API can be used to manage root credentials even if the AWS
	 * Account has no associated Users.
	 *
	 * For information about rotating certificates, see <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/index.html?ManagingCredentials.html">Managing Keys and Certificates</a> in
	 * <i>Using AWS Identity and Access Management</i>.
	 *
	 * @param string $certificate_id (Required) The ID of the signing certificate you want to update.
	 * @param string $status (Required) The status you want to assign to the certificate. <code>Active</code> means the certificate can be used for API calls to AWS, while <code>Inactive</code> means the certificate cannot be used. [Allowed values: <code>Active</code>, <code>Inactive</code>]
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>UserName</code> - <code>string</code> - Optional - Name of the User the signing certificate belongs to. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function update_signing_certificate($certificate_id, $status, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['CertificateId'] = $certificate_id;
		$opt['Status'] = $status;

		return $this->authenticate('UpdateSigningCertificate', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes the specified policy that is associated with the specified group.
	 *
	 * @param string $group_name (Required) Name of the group the policy is associated with.
	 * @param string $policy_name (Required) Name of the policy document to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_group_policy($group_name, $policy_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['GroupName'] = $group_name;
		$opt['PolicyName'] = $policy_name;

		return $this->authenticate('DeleteGroupPolicy', $opt, $this->hostname);
	}

	/**
	 *
	 * Lists the Users that have the specified path prefix. If there are none, the action returns an empty list.
	 *
	 * You can paginate the results using the <code>MaxItems</code> and <code>Marker</code> parameters.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>PathPrefix</code> - <code>string</code> - Optional - The path prefix for filtering the results. For example: <code>/division_abc/subdivision_xyz/</code>, which would get all User names whose path starts with <code>/division_abc/subdivision_xyz/</code>. This parameter is optional. If it is not included, it defaults to a slash (/), listing all User names. </li>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - Use this parameter only when paginating results, and only in a subsequent request after you've received a response where the results are truncated. Set it to the value of the <code>Marker</code> element in the response you just received. </li>
	 * 	<li><code>MaxItems</code> - <code>integer</code> - Optional - Use this parameter only when paginating results to indicate the maximum number of User names you want in the response. If there are additional User names beyond the maximum you specify, the <code>IsTruncated</code> response element is <code>true</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function list_users($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('ListUsers', $opt, $this->hostname);
	}

	/**
	 *
	 * Updates the name and/or the path of the specified group.
	 *
	 * You should understand the implications of changing a group's path or name. For more information, see <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/index.html?Using_Renaming.html">Renaming Users and Groups</a> in <i>Using AWS
	 * Identity and Access Management</i>.
	 *
	 * To change a group name the requester must have appropriate permissions on both the source object and the target object. For example, to
	 * change Managers to MGRs, the entity making the request must have permission on Managers and MGRs, or must have permission on all (*). For
	 * more information about permissions, see <a
	 * href="http://docs.amazonwebservices.com/IAM/2010-05-08/UserGuide/PermissionsAndPolicies.html">Permissions and Policies</a>.
	 *
	 * @param string $group_name (Required) Name of the group to update. If you're changing the name of the group, this is the original name.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>NewPath</code> - <code>string</code> - Optional - New path for the group. Only include this if changing the group's path. </li>
	 * 	<li><code>NewGroupName</code> - <code>string</code> - Optional - New name for the group. Only include this if changing the group's name. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function update_group($group_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['GroupName'] = $group_name;

		return $this->authenticate('UpdateGroup', $opt, $this->hostname);
	}

	/**
	 *
	 * Retrieves information about the specified server certificate.
	 *
	 * @param string $server_certificate_name (Required) The name of the server certificate you want to retrieve information about.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function get_server_certificate($server_certificate_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['ServerCertificateName'] = $server_certificate_name;

		return $this->authenticate('GetServerCertificate', $opt, $this->hostname);
	}

	/**
	 *
	 * Adds (or updates) a policy document associated with the specified group. For information about policies, refer to <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/index.html?PoliciesOverview.html">Overview of Policies</a> in <i>Using AWS
	 * Identity and Access Management</i>.
	 *
	 * For information about limits on the number of policies you can associate with a group, see <a
	 * href="http://docs.amazonwebservices.com/IAM/2010-05-08/UserGuide/index.html?LimitationsOnEntities.html">Limitations on IAM Entities</a> in
	 * <i>Using AWS Identity and Access Management</i>.
	 *
	 * Because policy documents can be large, you should use POST rather than GET when calling <code>PutGroupPolicy</code>. For more information,
	 * see <a href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/index.html?IAM_UsingQueryAPI.html">Making Query Requests</a> in <i>Using
	 * AWS Identity and Access Management</i>.
	 *
	 * @param string $group_name (Required) Name of the group to associate the policy with.
	 * @param string $policy_name (Required) Name of the policy document.
	 * @param string $policy_document (Required) The policy document.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function put_group_policy($group_name, $policy_name, $policy_document, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['GroupName'] = $group_name;
		$opt['PolicyName'] = $policy_name;
		$opt['PolicyDocument'] = $policy_document;

		return $this->authenticate('PutGroupPolicy', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a new User for your AWS Account.
	 *
	 * For information about limitations on the number of Users you can create, see <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/index.html?LimitationsOnEntities.html">Limitations on IAM Entities</a> in
	 * <i>Using AWS Identity and Access Management</i>.
	 *
	 * @param string $user_name (Required) Name of the User to create.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Path</code> - <code>string</code> - Optional - The path for the User name. For more information about paths, see Identifiers for IAM Entities in <i>Using AWS Identity and Access Management</i>. This parameter is optional. If it is not included, it defaults to a slash (/). </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_user($user_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['UserName'] = $user_name;

		return $this->authenticate('CreateUser', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes the specified signing certificate associated with the specified User.
	 *
	 * If you do not specify a User name, IAM determines the User name implicitly based on the AWS Access Key ID signing the request. Because this
	 * action works for access keys under the AWS Account, you can use this API to manage root credentials even if the AWS Account has no
	 * associated Users.
	 *
	 * @param string $certificate_id (Required) ID of the signing certificate to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>UserName</code> - <code>string</code> - Optional - Name of the User the signing certificate belongs to. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_signing_certificate($certificate_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['CertificateId'] = $certificate_id;

		return $this->authenticate('DeleteSigningCertificate', $opt, $this->hostname);
	}

	/**
	 *
	 * Enables the specified MFA device and associates it with the specified User name. When enabled, the MFA device is required for every
	 * subsequent login by the User name associated with the device.
	 *
	 * @param string $user_name (Required) Name of the User for whom you want to enable the MFA device.
	 * @param string $serial_number (Required) The serial number that uniquely identifies the MFA device.
	 * @param string $authentication_code1 (Required) An authentication code emitted by the device.
	 * @param string $authentication_code2 (Required) A subsequent authentication code emitted by the device.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function enable_mfa_device($user_name, $serial_number, $authentication_code1, $authentication_code2, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['UserName'] = $user_name;
		$opt['SerialNumber'] = $serial_number;
		$opt['AuthenticationCode1'] = $authentication_code1;
		$opt['AuthenticationCode2'] = $authentication_code2;

		return $this->authenticate('EnableMFADevice', $opt, $this->hostname);
	}

	/**
	 *
	 * Lists the names of the policies associated with the specified User. If there are none, the action returns an empty list.
	 *
	 * You can paginate the results using the <code>MaxItems</code> and <code>Marker</code> parameters.
	 *
	 * @param string $user_name (Required) The name of the User to list policies for.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - Use this only when paginating results, and only in a subsequent request after you've received a response where the results are truncated. Set it to the value of the <code>Marker</code> element in the response you just received. </li>
	 * 	<li><code>MaxItems</code> - <code>integer</code> - Optional - Use this only when paginating results to indicate the maximum number of policy names you want in the response. If there are additional policy names beyond the maximum you specify, the <code>IsTruncated</code> response element is <code>true</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function list_user_policies($user_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['UserName'] = $user_name;

		return $this->authenticate('ListUserPolicies', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns information about the Access Key IDs associated with the specified User. If there are none, the action returns an empty list.
	 *
	 * Although each User is limited to a small number of keys, you can still paginate the results using the <code>MaxItems</code> and
	 * <code>Marker</code> parameters.
	 *
	 * If the <code>UserName</code> field is not specified, the UserName is determined implicitly based on the AWS Access Key ID used to sign the
	 * request. Because this action works for access keys under the AWS Account, this API can be used to manage root credentials even if the AWS
	 * Account has no associated Users.
	 *
	 * To ensure the security of your AWS Account, the secret access key is accessible only during key and User creation.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>UserName</code> - <code>string</code> - Optional - Name of the User. </li>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - Use this parameter only when paginating results, and only in a subsequent request after you've received a response where the results are truncated. Set it to the value of the <code>Marker</code> element in the response you just received. </li>
	 * 	<li><code>MaxItems</code> - <code>integer</code> - Optional - Use this parameter only when paginating results to indicate the maximum number of keys you want in the response. If there are additional keys beyond the maximum you specify, the <code>IsTruncated</code> response element is <code>true</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function list_access_keys($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('ListAccessKeys', $opt, $this->hostname);
	}

	/**
	 *
	 * Retrieves the login profile for the specified User.
	 *
	 * @param string $user_name (Required) Name of the User whose login profile you want to retrieve.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function get_login_profile($user_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['UserName'] = $user_name;

		return $this->authenticate('GetLoginProfile', $opt, $this->hostname);
	}

	/**
	 *
	 * Lists the groups the specified User belongs to.
	 *
	 * You can paginate the results using the <code>MaxItems</code> and <code>Marker</code> parameters.
	 *
	 * @param string $user_name (Required) The name of the User to list groups for.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - Use this only when paginating results, and only in a subsequent request after you've received a response where the results are truncated. Set it to the value of the <code>Marker</code> element in the response you just received. </li>
	 * 	<li><code>MaxItems</code> - <code>integer</code> - Optional - Use this only when paginating results to indicate the maximum number of groups you want in the response. If there are additional groups beyond the maximum you specify, the <code>IsTruncated</code> response element is <code>true</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function list_groups_for_user($user_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['UserName'] = $user_name;

		return $this->authenticate('ListGroupsForUser', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a new group.
	 *
	 * For information about the number of groups you can create, see <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/index.html?LimitationsOnEntities.html">Limitations on IAM Entities</a> in
	 * <i>Using AWS Identity and Access Management</i>.
	 *
	 * @param string $group_name (Required) Name of the group to create. Do not include the path in this value.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Path</code> - <code>string</code> - Optional - The path to the group. For more information about paths, see Identifiers for IAM Entities in <i>Using AWS Identity and Access Management</i>. This parameter is optional. If it is not included, it defaults to a slash (/). </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_group($group_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['GroupName'] = $group_name;

		return $this->authenticate('CreateGroup', $opt, $this->hostname);
	}

	/**
	 *
	 * Uploads a server certificate entity for the AWS Account. The server certificate entity includes a public key certificate, a private key, and
	 * an optional certificate chain, which should all be PEM-encoded.
	 *
	 * For information about the number of server certificates you can upload, see <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/index.html?LimitationsOnEntities.html">Limitations on IAM Entities</a> in
	 * <i>Using AWS Identity and Access Management</i>.
	 *
	 * Because the body of the public key certificate, private key, and the certificate chain can be large, you should use POST rather than GET
	 * when calling <code>UploadServerCertificate</code>. For more information, see <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/IAM_UsingQueryAPI.html">Making Query Requests</a> in <i>Using AWS Identity and
	 * Access Management</i>.
	 *
	 * @param string $server_certificate_name (Required) The name for the server certificate. Do not include the path in this value.
	 * @param string $certificate_body (Required) The contents of the public key certificate in PEM-encoded format.
	 * @param string $private_key (Required) The contents of the private key in PEM-encoded format.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Path</code> - <code>string</code> - Optional - The path for the server certificate. For more information about paths, see Identifiers for IAM Entities in <i>Using AWS Identity and Access Management</i>. This parameter is optional. If it is not included, it defaults to a slash (/). </li>
	 * 	<li><code>CertificateChain</code> - <code>string</code> - Optional - The contents of the certificate chain. This is typically a concatenation of the PEM-encoded public key certificates of the chain. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function upload_server_certificate($server_certificate_name, $certificate_body, $private_key, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['ServerCertificateName'] = $server_certificate_name;
		$opt['CertificateBody'] = $certificate_body;
		$opt['PrivateKey'] = $private_key;

		return $this->authenticate('UploadServerCertificate', $opt, $this->hostname);
	}

	/**
	 *
	 * This action creates an alias for your AWS Account. For information about using an AWS Account alias, see <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/AccountAlias.html">Using an Alias for Your AWS Account ID</a> in <i>Using AWS
	 * Identity and Access Management</i>.
	 *
	 * @param string $account_alias (Required) Name of the account alias to create
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_account_alias($account_alias, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AccountAlias'] = $account_alias;

		return $this->authenticate('CreateAccountAlias', $opt, $this->hostname);
	}

	/**
	 *
	 * Retrieves the specified policy document for the specified group. The returned policy is URL-encoded according to RFC 3986. For more
	 * information about RFC 3986, go to <a href="http://www.faqs.org/rfcs/rfc3986.html">http://www.faqs.org/rfcs/rfc3986.html</a>.
	 *
	 * @param string $group_name (Required) Name of the group the policy is associated with.
	 * @param string $policy_name (Required) Name of the policy document to get.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function get_group_policy($group_name, $policy_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['GroupName'] = $group_name;
		$opt['PolicyName'] = $policy_name;

		return $this->authenticate('GetGroupPolicy', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes the specified User. The User must not belong to any groups, have any keys or signing certificates, or have any attached policies.
	 *
	 * @param string $user_name (Required) Name of the User to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_user($user_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['UserName'] = $user_name;

		return $this->authenticate('DeleteUser', $opt, $this->hostname);
	}

	/**
	 *
	 * Deactivates the specified MFA device and removes it from association with the User name for which it was originally enabled.
	 *
	 * @param string $user_name (Required) Name of the User whose MFA device you want to deactivate.
	 * @param string $serial_number (Required) The serial number that uniquely identifies the MFA device.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function deactivate_mfa_device($user_name, $serial_number, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['UserName'] = $user_name;
		$opt['SerialNumber'] = $serial_number;

		return $this->authenticate('DeactivateMFADevice', $opt, $this->hostname);
	}

	/**
	 *
	 * Removes the specified User from the specified group.
	 *
	 * @param string $group_name (Required) Name of the group to update.
	 * @param string $user_name (Required) Name of the User to remove.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function remove_user_from_group($group_name, $user_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['GroupName'] = $group_name;
		$opt['UserName'] = $user_name;

		return $this->authenticate('RemoveUserFromGroup', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes the specified server certificate.
	 *
	 * If your Elastic Load Balancing instances are using a server certificate, deleting the certificate could have implications for your
	 * application. If your Elastic Load Balancing instances do not detect the deletion of bound certificates, they may continue to use the
	 * certificates. This could cause them to stop accepting traffic. We recommend that you remove the reference to the certificate from your
	 * Elastic Load Balancing instances before using this command to delete the certificate.
	 *
	 * @param string $server_certificate_name (Required) The name of the server certificate you want to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_server_certificate($server_certificate_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['ServerCertificateName'] = $server_certificate_name;

		return $this->authenticate('DeleteServerCertificate', $opt, $this->hostname);
	}

	/**
	 *
	 * Lists the names of the policies associated with the specified group. If there are none, the action returns an empty list.
	 *
	 * You can paginate the results using the <code>MaxItems</code> and <code>Marker</code> parameters.
	 *
	 * @param string $group_name (Required) The name of the group to list policies for.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - Use this only when paginating results, and only in a subsequent request after you've received a response where the results are truncated. Set it to the value of the <code>Marker</code> element in the response you just received. </li>
	 * 	<li><code>MaxItems</code> - <code>integer</code> - Optional - Use this only when paginating results to indicate the maximum number of policy names you want in the response. If there are additional policy names beyond the maximum you specify, the <code>IsTruncated</code> response element is <code>true</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function list_group_policies($group_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['GroupName'] = $group_name;

		return $this->authenticate('ListGroupPolicies', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a login profile for the specified User, giving the User the ability to access AWS services such as the AWS Management Console. For
	 * more information about login profiles, see <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/index.html?Using_ManagingLoginsAndMFA.html">Managing Login Profiles and MFA
	 * Devices</a> in <i>Using AWS Identity and Access Management</i>.
	 *
	 * @param string $user_name (Required) Name of the User to create a login profile for.
	 * @param string $password (Required) The new password for the User name.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_login_profile($user_name, $password, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['UserName'] = $user_name;
		$opt['Password'] = $password;

		return $this->authenticate('CreateLoginProfile', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a new AWS Secret Access Key and corresponding AWS Access Key ID for the specified User. The default status for new keys is
	 * <code>Active</code>.
	 *
	 * If you do not specify a User name, IAM determines the User name implicitly based on the AWS Access Key ID signing the request. Because this
	 * action works for access keys under the AWS Account, you can use this API to manage root credentials even if the AWS Account has no
	 * associated Users.
	 *
	 * For information about limits on the number of keys you can create, see <a
	 * href="http://docs.amazonwebservices.com/IAM/2010-05-08/UserGuide/index.html?LimitationsOnEntities.html">Limitations on IAM Entities</a> in
	 * <i>Using AWS Identity and Access Management</i>.
	 *
	 * To ensure the security of your AWS Account, the Secret Access Key is accessible only during key and User creation. You must save the key
	 * (for example, in a text file) if you want to be able to access it again. If a secret key is lost, you can delete the access keys for the
	 * associated User and then create new keys.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>UserName</code> - <code>string</code> - Optional - The User name that the new key will belong to. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_access_key($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('CreateAccessKey', $opt, $this->hostname);
	}

	/**
	 *
	 * Retrieves information about the specified User, including the User's path, GUID, and ARN.
	 *
	 * If you do not specify a User name, IAM determines the User name implicitly based on the AWS Access Key ID signing the request.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>UserName</code> - <code>string</code> - Optional - Name of the User to get information about. This parameter is optional. If it is not included, it defaults to the User making the request. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function get_user($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('GetUser', $opt, $this->hostname);
	}

	/**
	 *
	 * Synchronizes the specified MFA device with AWS servers.
	 *
	 * @param string $user_name (Required) Name of the User whose MFA device you want to resynchronize.
	 * @param string $serial_number (Required) Serial number that uniquely identifies the MFA device.
	 * @param string $authentication_code1 (Required) An authentication code emitted by the device.
	 * @param string $authentication_code2 (Required) A subsequent authentication code emitted by the device.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function resync_mfa_device($user_name, $serial_number, $authentication_code1, $authentication_code2, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['UserName'] = $user_name;
		$opt['SerialNumber'] = $serial_number;
		$opt['AuthenticationCode1'] = $authentication_code1;
		$opt['AuthenticationCode2'] = $authentication_code2;

		return $this->authenticate('ResyncMFADevice', $opt, $this->hostname);
	}

	/**
	 *
	 * Lists the MFA devices associated with the specified User name.
	 *
	 * You can paginate the results using the <code>MaxItems</code> and <code>Marker</code> parameters.
	 *
	 * @param string $user_name (Required) Name of the User whose MFA devices you want to list.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - Use this only when paginating results, and only in a subsequent request after you've received a response where the results are truncated. Set it to the value of the <code>Marker</code> element in the response you just received. </li>
	 * 	<li><code>MaxItems</code> - <code>integer</code> - Optional - Use this only when paginating results to indicate the maximum number of keys you want in the response. If there are additional keys beyond the maximum you specify, the <code>IsTruncated</code> response element is <code>true</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function list_mfa_devices($user_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['UserName'] = $user_name;

		return $this->authenticate('ListMFADevices', $opt, $this->hostname);
	}

	/**
	 *
	 * Changes the status of the specified access key from Active to Inactive, or vice versa. This action can be used to disable a User's key as
	 * part of a key rotation workflow.
	 *
	 * If the <code>UserName</code> field is not specified, the UserName is determined implicitly based on the AWS Access Key ID used to sign the
	 * request. Because this action works for access keys under the AWS Account, this API can be used to manage root credentials even if the AWS
	 * Account has no associated Users.
	 *
	 * For information about rotating keys, see <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/index.html?ManagingCredentials.html">Managing Keys and Certificates</a> in
	 * <i>Using AWS Identity and Access Management</i>.
	 *
	 * @param string $access_key_id (Required) The Access Key ID of the Secret Access Key you want to update.
	 * @param string $status (Required) The status you want to assign to the Secret Access Key. <code>Active</code> means the key can be used for API calls to AWS, while <code>Inactive</code> means the key cannot be used. [Allowed values: <code>Active</code>, <code>Inactive</code>]
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>UserName</code> - <code>string</code> - Optional - Name of the User whose key you want to update. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function update_access_key($access_key_id, $status, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AccessKeyId'] = $access_key_id;
		$opt['Status'] = $status;

		return $this->authenticate('UpdateAccessKey', $opt, $this->hostname);
	}

	/**
	 *
	 * Retrieves account level information about account entity usage and IAM quotas.
	 *
	 * For information about limitations on IAM entities, see <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/index.html?LimitationsOnEntities.html">Limitations on IAM Entities</a> in
	 * <i>Using AWS Identity and Access Management</i>.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function get_account_summary($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('GetAccountSummary', $opt, $this->hostname);
	}

	/**
	 *
	 * Adds the specified User to the specified group.
	 *
	 * @param string $group_name (Required) Name of the group to update.
	 * @param string $user_name (Required) Name of the User to add.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function add_user_to_group($group_name, $user_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['GroupName'] = $group_name;
		$opt['UserName'] = $user_name;

		return $this->authenticate('AddUserToGroup', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns a list of Users that are in the specified group. You can paginate the results using the <code>MaxItems</code> and
	 * <code>Marker</code> parameters.
	 *
	 * @param string $group_name (Required) Name of the group.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - Use this only when paginating results, and only in a subsequent request after you've received a response where the results are truncated. Set it to the value of the <code>Marker</code> element in the response you just received. </li>
	 * 	<li><code>MaxItems</code> - <code>integer</code> - Optional - Use this only when paginating results to indicate the maximum number of User names you want in the response. If there are additional User names beyond the maximum you specify, the <code>IsTruncated</code> response element is <code>true</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function get_group($group_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['GroupName'] = $group_name;

		return $this->authenticate('GetGroup', $opt, $this->hostname);
	}

	/**
	 *
	 * Lists the account aliases associated with the account. For information about using an AWS Account alias, see <a
	 * href="http://docs.amazonwebservices.com/IAM/latest/UserGuide/AccountAlias.html">Using an Alias for Your AWS Account ID</a> in <i>Using AWS
	 * Identity and Access Management</i>.
	 *
	 * You can paginate the results using the <code>MaxItems</code> and <code>Marker</code> parameters.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - Use this only when paginating results, and only in a subsequent request after you've received a response where the results are truncated. Set it to the value of the <code>Marker</code> element in the response you just received. </li>
	 * 	<li><code>MaxItems</code> - <code>integer</code> - Optional - Use this only when paginating results to indicate the maximum number of account aliases you want in the response. If there are additional account aliases beyond the maximum you specify, the <code>IsTruncated</code> response element is <code>true</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function list_account_aliases($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('ListAccountAliases', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes the specified group. The group must not contain any Users or have any attached policies.
	 *
	 * @param string $group_name (Required) Name of the group to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_group($group_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['GroupName'] = $group_name;

		return $this->authenticate('DeleteGroup', $opt, $this->hostname);
	}
}


/*%******************************************************************************************%*/
// EXCEPTIONS

/**
 * Default IAM Exception.
 */
class IAM_Exception extends Exception {}