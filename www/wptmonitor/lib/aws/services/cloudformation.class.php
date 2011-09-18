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
 * This is the AWS CloudFormation API Reference. The major sections of this guide are described in the following table.
 *
 * <ul> <li> <a href="http://docs.amazonwebservices.com/AWSCloudFormation/latest/APIReference/API_Operations.html">Actions</a>: Alphabetical
 * list of CloudFormation actions</li>
 *
 * <li> <a href="http://docs.amazonwebservices.com/AWSCloudFormation/latest/APIReference/API_Types.html">Data Types</a>: Alphabetical list of
 * CloudFormation data types</li>
 *
 * <li> <a href="http://docs.amazonwebservices.com/AWSCloudFormation/latest/APIReference/CommonParameters.html">Common Parameters</a>:
 * Parameters that all Query actions can use</li>
 *
 * <li> <a href="http://docs.amazonwebservices.com/AWSCloudFormation/latest/APIReference/CommonErrors.html">Common Errors</a>: Client and
 * server errors that all actions can return</li>
 *
 * </ul>
 *
 * This guide is for programmers who need detailed information about the CloudFormation APIs. You use AWS CloudFormation to create and manage
 * AWS infrastructure deployments predictably and repeatedly. CloudFormation helps you leverage AWS products such as Amazon EC2, EBS, Amazon
 * SNS, ELB, and Auto Scaling to build highly-reliable, highly scalable, cost effective applications without worrying about creating and
 * configuring the underlying the AWS infrastructure.
 *
 * Through the use of a template file you write, and a few AWS CloudFormation commands or API actions, AWS CloudFormation enables you to manage
 * a collection of resources together as a single unit called a stack. AWS CloudFormation creates and deletes all member resources of the stack
 * together and manages all dependencies between the resources for you.
 *
 * For more information about this product, go to the <a href="http://aws.amazon.com/documentation/cloudformation">CloudFormation Product
 * Page</a>.
 *
 * Amazon CloudFormation makes use of other AWS products. If you need additional technical information about a specific AWS product, you can
 * find the product's technical documentation at <a href="http://aws.amazon.com/documentation/">http://aws.amazon.com/documentation/</a>.
 *
 * @version Thu Sep 01 21:17:41 PDT 2011
 * @license See the included NOTICE.md file for complete information.
 * @copyright See the included NOTICE.md file for complete information.
 * @link http://aws.amazon.com/cloudformation/Amazon CloudFormation
 * @link http://aws.amazon.com/documentation/cloudformation/Amazon CloudFormation documentation
 */
class AmazonCloudFormation extends CFRuntime
{

	/*%******************************************************************************************%*/
	// CLASS CONSTANTS

	/**
	 * Specify the default queue URL.
	 */
	const DEFAULT_URL = 'cloudformation.us-east-1.amazonaws.com';

	/**
	 * Specify the queue URL for the US-East (Northern Virginia) Region.
	 */
	const REGION_US_E1 = self::DEFAULT_URL;

	/**
	 * Specify the queue URL for the US-West (Northern California) Region.
	 */
	const REGION_US_W1 = 'cloudformation.us-west-1.amazonaws.com';

	/**
	 * Specify the queue URL for the EU (Ireland) Region.
	 */
	const REGION_EU_W1 = 'cloudformation.eu-west-1.amazonaws.com';

	/**
	 * Specify the queue URL for the Asia Pacific (Singapore) Region.
	 */
	const REGION_APAC_SE1 = 'cloudformation.ap-southeast-1.amazonaws.com';

	/**
	 * Specify the queue URL for the Asia Pacific (Japan) Region.
	 */
	const REGION_APAC_NE1 = 'cloudformation.ap-northeast-1.amazonaws.com';


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
	 * Constructs a new instance of <AmazonCloudFormation>.
	 *
	 * @param string $key (Optional) Your Amazon API Key. If blank, it will look for the <code>AWS_KEY</code> constant.
	 * @param string $secret_key (Optional) Your Amazon API Secret Key. If blank, it will look for the <code>AWS_SECRET_KEY</code> constant.
	 * @return boolean false if no valid values are set, otherwise true.
	 */
	public function __construct($key = null, $secret_key = null)
	{
		$this->api_version = '2010-05-15';
		$this->hostname = self::DEFAULT_URL;

		if (!$key && !defined('AWS_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new CloudFormation_Exception('No account key was passed into the constructor, nor was it set in the AWS_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		if (!$secret_key && !defined('AWS_SECRET_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new CloudFormation_Exception('No account secret was passed into the constructor, nor was it set in the AWS_SECRET_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		return parent::__construct($key, $secret_key);
	}


	/*%******************************************************************************************%*/
	// SERVICE METHODS

	/**
	 *
	 * Returns the summary information for stacks whose status matches the specified StackStatusFilter. Summary information for stacks that have
	 * been deleted is kept for 90 days after the stack is deleted. If no StackStatusFilter is specified, summary information for all stacks is
	 * returned (including existing stacks and stacks that have been deleted).
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>NextToken</code> - <code>string</code> - Optional -  </li>
	 * 	<li><code>StackStatusFilter</code> - <code>string|array</code> - Optional -   Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function list_stacks($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['StackStatusFilter']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'StackStatusFilter' => (is_array($opt['StackStatusFilter']) ? $opt['StackStatusFilter'] : array($opt['StackStatusFilter']))
			), 'member'));
			unset($opt['StackStatusFilter']);
		}

		return $this->authenticate('ListStacks', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a stack as specified in the template. After the call completes successfully, the stack creation starts. You can check the status of
	 * the stack via the DescribeStacks API.
	 *
	 * Currently, the limit for stacks is 20 stacks per account per region.
	 *
	 * @param string $stack_name (Required) The name associated with the stack. The name must be unique within your AWS account. Must contain only alphanumeric characters (case sensitive) and start with an alpha character. Maximum length of the name is 255 characters.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>TemplateBody</code> - <code>string</code> - Optional - Structure containing the template body. (For more information, go to the AWS CloudFormation User Guide.) Condition: You must pass <code>TemplateBody</code> or <code>TemplateURL</code>. If both are passed, only <code>TemplateBody</code> is used. </li>
	 * 	<li><code>TemplateURL</code> - <code>string</code> - Optional - Location of file containing the template body. The URL must point to a template located in an S3 bucket in the same region as the stack. For more information, go to the AWS CloudFormation User Guide. Conditional: You must pass <code>TemplateURL</code> or <code>TemplateBody</code>. If both are passed, only <code>TemplateBody</code> is used. </li>
	 * 	<li><code>Parameters</code> - <code>array</code> - Optional - A list of <code>Parameter</code> structures. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>ParameterKey</code> - <code>string</code> - Optional - The key associated with the parameter. </li>
	 * 			<li><code>ParameterValue</code> - <code>string</code> - Optional - The value associated with the parameter. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>DisableRollback</code> - <code>boolean</code> - Optional - Boolean to enable or disable rollback on stack creation failures.<br></br> Default: <code>false</code> </li>
	 * 	<li><code>TimeoutInMinutes</code> - <code>integer</code> - Optional - The amount of time that can pass before the stack status becomes CREATE_FAILED; if <code>DisableRollback</code> is not set or is set to <code>false</code>, the stack will be rolled back. </li>
	 * 	<li><code>NotificationARNs</code> - <code>string|array</code> - Optional - The Simple Notification Service (SNS) topic ARNs to publish stack related events. You can find your SNS topic ARNs using the SNS console or your Command Line Interface (CLI).  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_stack($stack_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['StackName'] = $stack_name;

		// Optional parameter
		if (isset($opt['Parameters']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Parameters' => $opt['Parameters']
			), 'member'));
			unset($opt['Parameters']);
		}

		// Optional parameter
		if (isset($opt['NotificationARNs']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'NotificationARNs' => (is_array($opt['NotificationARNs']) ? $opt['NotificationARNs'] : array($opt['NotificationARNs']))
			), 'member'));
			unset($opt['NotificationARNs']);
		}

		return $this->authenticate('CreateStack', $opt, $this->hostname);
	}

	/**
	 *
	 * Validates a specified template.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>TemplateBody</code> - <code>string</code> - Optional - String containing the template body. (For more information, go to the AWS CloudFormation User Guide.) Conditional: You must pass <code>TemplateURL</code> or <code>TemplateBody</code>. If both are passed, only <code>TemplateBody</code> is used. </li>
	 * 	<li><code>TemplateURL</code> - <code>string</code> - Optional - Location of file containing the template body. The URL must point to a template located in an S3 bucket in the same region as the stack. For more information, go to the AWS CloudFormation User Guide. Conditional: You must pass <code>TemplateURL</code> or <code>TemplateBody</code>. If both are passed, only <code>TemplateBody</code> is used. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function validate_template($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('ValidateTemplate', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns the description for the specified stack; if no stack name was specified, then it returns the description for all the stacks
	 * created.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>StackName</code> - <code>string</code> - Optional - The name or the unique identifier associated with the stack. Default: There is no default value. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_stacks($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('DescribeStacks', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns all the stack related events for the AWS account. If <code>StackName</code> is specified, returns events related to all the stacks
	 * with the given name. If <code>StackName</code> is not specified, returns all the events for the account. For more information about a
	 * stack's event history, go to the <a href="http://docs.amazonwebservices.com/AWSCloudFormation/latest/UserGuide">AWS CloudFormation User
	 * Guide</a>.
	 *
	 * Events are returned, even if the stack never existed or has been successfully deleted.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>StackName</code> - <code>string</code> - Optional - The name or the unique identifier associated with the stack.<br></br> Default: There is no default value. </li>
	 * 	<li><code>NextToken</code> - <code>string</code> - Optional - String that identifies the start of the next list of events, if there is one.<br></br> Default: There is no default value. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_stack_events($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('DescribeStackEvents', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns the template body for a specified stack name. You can get the template for running or deleted stacks.
	 *
	 * For deleted stacks, GetTemplate returns the template for up to 90 days after the stack has been deleted.
	 *
	 * If the template does not exist, a <code>ValidationError</code> is returned.
	 *
	 * @param string $stack_name (Required) The name or the unique identifier associated with the stack.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function get_template($stack_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['StackName'] = $stack_name;

		return $this->authenticate('GetTemplate', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns a description of the specified resource in the specified stack.
	 *
	 * For deleted stacks, DescribeStackResource returns resource information for up to 90 days after the stack has been deleted.
	 *
	 * @param string $stack_name (Required) The name or the unique identifier associated with the stack. Default: There is no default value.
	 * @param string $logical_resource_id (Required) The logical name of the resource as specified in the template.<br></br> Default: There is on default value.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_stack_resource($stack_name, $logical_resource_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['StackName'] = $stack_name;
		$opt['LogicalResourceId'] = $logical_resource_id;

		return $this->authenticate('DescribeStackResource', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes a specified stack. Once the call completes successfully, stack deletion starts. Deleted stacks do not show up in the DescribeStacks
	 * API if the deletion has been completed successfully.
	 *
	 * @param string $stack_name (Required) The name or the unique identifier associated with the stack.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_stack($stack_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['StackName'] = $stack_name;

		return $this->authenticate('DeleteStack', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns descriptions of all resources of the specified stack.
	 *
	 * For deleted stacks, ListStackResources returns resource information for up to 90 days after the stack has been deleted.
	 *
	 * @param string $stack_name (Required) The name or the unique identifier associated with the stack. Default: There is no default value.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>NextToken</code> - <code>string</code> - Optional - String that identifies the start of the next list of events, if there is one. Default: There is no default value. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function list_stack_resources($stack_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['StackName'] = $stack_name;

		return $this->authenticate('ListStackResources', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns AWS resource descriptions for running and deleted stacks. If <code>StackName</code> is specified, all the associated resources that
	 * are part of the stack are returned. If <code>PhysicalResourceId</code> is specified, all the associated resources of the stack the resource
	 * belongs to are returned.
	 *
	 * For deleted stacks, DescribeStackResources returns resource information for up to 90 days after the stack has been deleted.
	 *
	 * You must specify <code>StackName</code> or <code>PhysicalResourceId.</code> In addition, you can specify <code>LogicalResourceId</code> to
	 * filter the returned result. For more information about resources, the <code>LogicalResourceId</code> and <code>PhysicalResourceId</code>, go
	 * to the <a href="http://docs.amazonwebservices.com/AWSCloudFormation/latest/UserGuide">AWS CloudFormation User Guide</a>.
	 *
	 * A <code>ValidationError</code> is returned if you specify both <code>StackName</code> and <code>PhysicalResourceId</code> in the same
	 * request.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>StackName</code> - <code>string</code> - Optional - The name or the unique identifier associated with the stack. Default: There is no default value. </li>
	 * 	<li><code>LogicalResourceId</code> - <code>string</code> - Optional - The logical name of the resource as specified in the template.<br></br> Default: There is on default value. </li>
	 * 	<li><code>PhysicalResourceId</code> - <code>string</code> - Optional - The name or unique identifier that corresponds to a physical instance ID of a resource supported by AWS CloudFormation. For example, for an Amazon Elastic Compute Cloud (EC2) instance, <code>PhysicalResourceId</code> corresponds to the <code>InstanceId</code>. You can pass the EC2 <code>InstanceId</code> to <code>DescribeStackResources</code> to find which stack the instance belongs to and what other resources are part of the stack. Default: There is no default value. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_stack_resources($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('DescribeStackResources', $opt, $this->hostname);
	}
}


/*%******************************************************************************************%*/
// EXCEPTIONS

/**
 * Default CloudFormation Exception.
 */
class CloudFormation_Exception extends Exception {}