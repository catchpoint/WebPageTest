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
 * Amazon Simple Queue Service (Amazon SQS) offers a reliable, highly scalable, hosted queue for storing messages as they travel between
 * computers. By using Amazon SQS, developers can simply move data between distributed components of their applications that perform different
 * tasks, without losing messages or requiring each component to be always available. Amazon SQS makes it easy to build an automated workflow,
 * working in close conjunction with the Amazon Elastic Compute Cloud (Amazon EC2) and the other AWS infrastructure web services.
 *
 * Amazon SQS works by exposing Amazon's web-scale messaging infrastructure as a web service. Any computer on the Internet can add or read
 * messages without any installed software or special firewall configurations. Components of applications using Amazon SQS can run
 * independently, and do not need to be on the same network, developed with the same technologies, or running at the same time.
 *
 * Visit <a href="http://aws.amazon.com/sqs/">http://aws.amazon.com/sqs/</a> for more information.
 *
 * @version Thu Sep 01 21:24:22 PDT 2011
 * @license See the included NOTICE.md file for complete information.
 * @copyright See the included NOTICE.md file for complete information.
 * @link http://aws.amazon.com/sqs/Amazon Simple Queue Service
 * @link http://aws.amazon.com/documentation/sqs/Amazon Simple Queue Service documentation
 */
class AmazonSQS extends CFRuntime
{

	/*%******************************************************************************************%*/
	// CLASS CONSTANTS

	/**
	 * Specify the default queue URL.
	 */
	const DEFAULT_URL = 'sqs.us-east-1.amazonaws.com';

	/**
	 * Specify the queue URL for the US-East (Northern Virginia) Region.
	 */
	const REGION_US_E1 = self::DEFAULT_URL;

	/**
	 * Specify the queue URL for the US-West (Northern California) Region.
	 */
	const REGION_US_W1 = 'sqs.us-west-1.amazonaws.com';

	/**
	 * Specify the queue URL for the EU (Ireland) Region.
	 */
	const REGION_EU_W1 = 'sqs.eu-west-1.amazonaws.com';

	/**
	 * Specify the queue URL for the Asia Pacific (Singapore) Region.
	 */
	const REGION_APAC_SE1 = 'sqs.ap-southeast-1.amazonaws.com';

	/**
	 * Specify the queue URL for the Asia Pacific (Japan) Region.
	 */
	const REGION_APAC_NE1 = 'sqs.ap-northeast-1.amazonaws.com';


	/*%******************************************************************************************%*/
	// SETTERS

	/**
	 * This allows you to explicitly sets the region for the service to use.
	 *
	 * @param string $region (Required) The region to use for subsequent Amazon S3 operations. [Allowed values: `AmazonSQS::REGION_US_E1 `, `AmazonSQS::REGION_US_W1`, `AmazonSQS::REGION_EU_W1`, `AmazonSQS::REGION_APAC_SE1`]
	 * @return $this A reference to the current instance.
	 */
	public function set_region($region)
	{
		$this->set_hostname($region);
		return $this;
	}


	/*%******************************************************************************************%*/
	// CONVENIENCE METHODS

	/**
	 * Converts a queue URI into a queue ARN.
	 *
	 * @param string $queue_url (Required) The queue URL to perform the action on. Retrieved when the queue is first created.
	 * @return string An ARN representation of the queue URI.
	 */
	function get_queue_arn($queue_url)
	{
		return str_replace(
			array('http://',  'https://', '.amazonaws.com', '/', '.'),
			array('arn:aws:', 'arn:aws:', '',               ':', ':'),
			$queue_url
		);
	}

	/**
	 * Returns the approximate number of messages in the queue.
	 *
	 * @param string $queue_url (Required) The queue URL to perform the action on. Retrieved when the queue is first created.
	 * @return mixed The Approximate number of messages in the queue as an integer. If the queue doesn't exist, it returns the entire <CFResponse> object.
	 */
	public function get_queue_size($queue_url)
	{
		$response = $this->get_queue_attributes($queue_url, array(
			'AttributeName' => 'ApproximateNumberOfMessages'
		));

		if (!$response->isOK())
		{
			return $response;
		}

		return (integer) $response->body->Value(0);
	}

	/**
	 * ONLY lists the queue URLs, as an array, on the SQS account.
	 *
	 * @param string $pcre (Optional) A Perl-Compatible Regular Expression (PCRE) to filter the names against.
	 * @return array The list of matching queue names. If there are no results, the method will return an empty array.
	 * @link http://php.net/pcre Perl-Compatible Regular Expression (PCRE) Docs
	 */
	public function get_queue_list($pcre = null)
	{
		if ($this->use_batch_flow)
		{
			throw new SQS_Exception(__FUNCTION__ . '() cannot be batch requested');
		}

		// Get a list of queues.
		$list = $this->list_queues();
		if ($list = $list->body->QueueUrl())
		{
			$list = $list->map_string($pcre);
			return $list;
		}

		return array();
	}


	/*%******************************************************************************************%*/
	// CONSTRUCTOR

	/**
	 * Constructs a new instance of <AmazonSQS>. If the <code>AWS_DEFAULT_CACHE_CONFIG</code> configuration
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
		$this->api_version = '2009-02-01';
		$this->hostname = self::DEFAULT_URL;

		if (!$key && !defined('AWS_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new SQS_Exception('No account key was passed into the constructor, nor was it set in the AWS_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		if (!$secret_key && !defined('AWS_SECRET_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new SQS_Exception('No account secret was passed into the constructor, nor was it set in the AWS_SECRET_KEY constant.');
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
	 * Returns a list of your queues.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>QueueNamePrefix</code> - <code>string</code> - Optional - A string to use for filtering the list results. Only those queues whose name begins with the specified string are returned. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function list_queues($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('ListQueues', $opt, $this->hostname);
	}

	/**
	 *
	 * Sets an attribute of a queue. Currently, you can set only the <code>VisibilityTimeout</code> attribute for a queue.
	 *
	 * @param string $queue_url (Required) The URL of the SQS queue to take action on.
	 * @param array $attribute (Required) A list of attributes to set. <ul>
	 * 	<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 		<li><code>Name</code> - <code>string</code> - Optional - The name of the queue attribute to set a custom value for. [Allowed values: <code>Policy</code>, <code>VisibilityTimeout</code>, <code>MaximumMessageSize</code>, <code>MessageRetentionPeriod</code>, <code>ApproximateNumberOfMessages</code>, <code>ApproximateNumberOfMessagesNotVisible</code>, <code>CreatedTimestamp</code>, <code>LastModifiedTimestamp</code>]</li>
	 * 		<li><code>Value</code> - <code>string</code> - Optional - The custom value to assign for the matching attribute key. </li>
	 * 	</ul></li>
	 * </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function set_queue_attributes($queue_url, $attribute, $opt = null)
	{
		if (!$opt) $opt = array();

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'Attribute' => (is_array($attribute) ? $attribute : array($attribute))
		)));

		return $this->authenticate('SetQueueAttributes', $opt, $queue_url);
	}

	/**
	 *
	 * The <code>ChangeMessageVisibility</code> action changes the visibility timeout of a specified message in a queue to a new value. The maximum
	 * allowed timeout value you can set the value to is 12 hours. This means you can't extend the timeout of a message in an existing queue to
	 * more than a total visibility timeout of 12 hours. (For more information visibility timeout, see <a
	 * href="http://docs.amazonwebservices.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/AboutVT.html">Visibility Timeout</a> in the Amazon
	 * SQS Developer Guide.)
	 *
	 * For example, let's say you have a message and its default message visibility timeout is 30 minutes. You could call
	 * <code>ChangeMessageVisiblity</code> with a value of two hours and the effective timeout would be two hours and 30 minutes. When that time
	 * comes near you could again extend the time out by calling ChangeMessageVisiblity, but this time the maximum allowed timeout would be 9 hours
	 * and 30 minutes.
	 *
	 * If you attempt to set the <code>VisibilityTimeout</code> to an amount more than the maximum time left, Amazon SQS returns an error. It will
	 * not automatically recalculate and increase the timeout to the maximum time remaining.
	 *
	 * Unlike with a queue, when you change the visibility timeout for a specific message, that timeout value is applied immediately but is not
	 * saved in memory for that message. If you don't delete a message after it is received, the visibility timeout for the message the next time
	 * it is received reverts to the original timeout value, not the value you set with the ChangeMessageVisibility action.
	 *
	 * @param string $queue_url (Required) The URL of the SQS queue to take action on.
	 * @param string $receipt_handle (Required) The receipt handle associated with the message whose visibility timeout should be changed.
	 * @param integer $visibility_timeout (Required) The new value (in seconds) for the message's visibility timeout.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function change_message_visibility($queue_url, $receipt_handle, $visibility_timeout, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['ReceiptHandle'] = $receipt_handle;
		$opt['VisibilityTimeout'] = $visibility_timeout;

		return $this->authenticate('ChangeMessageVisibility', $opt, $queue_url);
	}

	/**
	 *
	 * The <code>CreateQueue</code> action creates a new queue, or returns the URL of an existing one. When you request <code>CreateQueue</code>,
	 * you provide a name for the queue. To successfully create a new queue, you must provide a name that is unique within the scope of your own
	 * queues. If you provide the name of an existing queue, a new queue isn't created and an error isn't returned. Instead, the request succeeds
	 * and the queue URL for the existing queue is returned.
	 *
	 * If you provide a value for <code>DefaultVisibilityTimeout</code> that is different from the value for the existing queue, you receive an
	 * error.
	 *
	 * @param string $queue_name (Required) The name for the queue to be created.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>DefaultVisibilityTimeout</code> - <code>integer</code> - Optional - The visibility timeout (in seconds) to use for the created queue. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_queue($queue_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['QueueName'] = $queue_name;

		return $this->authenticate('CreateQueue', $opt, $this->hostname);
	}

	/**
	 *
	 * The <code>RemovePermission</code> action revokes any permissions in the queue policy that matches the specified <code>Label</code>
	 * parameter. Only the owner of the queue can remove permissions.
	 *
	 * @param string $queue_url (Required) The URL of the SQS queue to take action on.
	 * @param string $label (Required) The identfication of the permission to remove. This is the label added with the AddPermission operation.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function remove_permission($queue_url, $label, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['Label'] = $label;

		return $this->authenticate('RemovePermission', $opt, $queue_url);
	}

	/**
	 *
	 * Gets one or all attributes of a queue. Queues currently have two attributes you can get: <code>ApproximateNumberOfMessages</code> and
	 * <code>VisibilityTimeout</code>.
	 *
	 * @param string $queue_url (Required) The URL of the SQS queue to take action on.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>AttributeName</code> - <code>string|array</code> - Optional - A list of attributes to retrieve information for.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function get_queue_attributes($queue_url, $opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['AttributeName']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'AttributeName' => (is_array($opt['AttributeName']) ? $opt['AttributeName'] : array($opt['AttributeName']))
			)));
			unset($opt['AttributeName']);
		}

		return $this->authenticate('GetQueueAttributes', $opt, $queue_url);
	}

	/**
	 *
	 * The AddPermission action adds a permission to a queue for a specific <a
	 * href="http://docs.amazonwebservices.com/AWSSimpleQueueService/latest/APIReference/Glossary.html#d0e3892">principal</a>. This allows for
	 * sharing access to the queue.
	 *
	 * When you create a queue, you have full control access rights for the queue. Only you (as owner of the queue) can grant or deny permissions
	 * to the queue. For more information about these permissions, see <a
	 * href="http://docs.amazonwebservices.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/?acp-overview.html">Shared Queues</a> in the Amazon
	 * SQS Developer Guide.
	 *
	 * <code>AddPermission</code> writes an SQS-generated policy. If you want to write your own policy, use SetQueueAttributes to upload your
	 * policy. For more information about writing your own policy, see <a
	 * href="http://docs.amazonwebservices.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/?AccessPolicyLanguage.html">Appendix: The Access
	 * Policy Language</a> in the Amazon SQS Developer Guide.
	 *
	 * @param string $queue_url (Required) The URL of the SQS queue to take action on.
	 * @param string $label (Required) The unique identification of the permission you're setting (e.g., <code>AliceSendMessage</code>). Constraints: Maximum 80 characters; alphanumeric characters, hyphens (-), and underscores (_) are allowed.
	 * @param string|array $account_id (Required) The AWS account number of the principal who will be given permission. The principal must have an AWS account, but does not need to be signed up for Amazon SQS.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param string|array $action_name (Required) The action the client wants to allow for the specified principal.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function add_permission($queue_url, $label, $account_id, $action_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['Label'] = $label;

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'AWSAccountId' => (is_array($account_id) ? $account_id : array($account_id))
		)));

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'ActionName' => (is_array($action_name) ? $action_name : array($action_name))
		)));

		return $this->authenticate('AddPermission', $opt, $queue_url);
	}

	/**
	 *
	 * This action unconditionally deletes the queue specified by the queue URL. Use this operation WITH CARE! The queue is deleted even if it is
	 * NOT empty.
	 *
	 * Once a queue has been deleted, the queue name is unavailable for use with new queues for 60 seconds.
	 *
	 * @param string $queue_url (Required) The URL of the SQS queue to take action on.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_queue($queue_url, $opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('DeleteQueue', $opt, $queue_url);
	}

	/**
	 *
	 * The <code>DeleteMessage</code> action unconditionally removes the specified message from the specified queue. Even if the message is locked
	 * by another reader due to the visibility timeout setting, it is still deleted from the queue.
	 *
	 * @param string $queue_url (Required) The URL of the SQS queue to take action on.
	 * @param string $receipt_handle (Required) The receipt handle associated with the message to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_message($queue_url, $receipt_handle, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['ReceiptHandle'] = $receipt_handle;

		return $this->authenticate('DeleteMessage', $opt, $queue_url);
	}

	/**
	 *
	 * The <code>SendMessage</code> action delivers a message to the specified queue.
	 *
	 * @param string $queue_url (Required) The URL of the SQS queue to take action on.
	 * @param string $message_body (Required) The message to send.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function send_message($queue_url, $message_body, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['MessageBody'] = $message_body;

		return $this->authenticate('SendMessage', $opt, $queue_url);
	}

	/**
	 *
	 * Retrieves one or more messages from the specified queue, including the message body and message ID of each message. Messages returned by
	 * this action stay in the queue until you delete them. However, once a message is returned to a <code>ReceiveMessage</code> request, it is not
	 * returned on subsequent <code>ReceiveMessage</code> requests for the duration of the <code>VisibilityTimeout</code>. If you do not specify a
	 * <code>VisibilityTimeout</code> in the request, the overall visibility timeout for the queue is used for the returned messages.
	 *
	 * @param string $queue_url (Required) The URL of the SQS queue to take action on.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>AttributeName</code> - <code>string|array</code> - Optional - A list of attributes to retrieve information for.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>MaxNumberOfMessages</code> - <code>integer</code> - Optional - The maximum number of messages to return. Amazon SQS never returns more messages than this value but may return fewer. All of the messages are not necessarily returned. </li>
	 * 	<li><code>VisibilityTimeout</code> - <code>integer</code> - Optional - The duration (in seconds) that the received messages are hidden from subsequent retrieve requests after being retrieved by a <code>ReceiveMessage</code> request. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function receive_message($queue_url, $opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['AttributeName']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'AttributeName' => (is_array($opt['AttributeName']) ? $opt['AttributeName'] : array($opt['AttributeName']))
			)));
			unset($opt['AttributeName']);
		}

		return $this->authenticate('ReceiveMessage', $opt, $queue_url);
	}
}


/*%******************************************************************************************%*/
// EXCEPTIONS

/**
 * Default SQS Exception.
 */
class SQS_Exception extends Exception {}