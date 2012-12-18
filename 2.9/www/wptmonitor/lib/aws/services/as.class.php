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
 * Auto Scaling is a web service designed to automatically launch or terminate EC2 instances based on user-defined policies, schedules, and
 * health checks. Auto Scaling responds automatically to changing conditions. All you need to do is specify how it should respond to those
 * changes.
 *
 * Auto Scaling groups can work across multiple Availability Zones - distinct physical locations for the hosted Amazon EC2 instances - so that
 * if an Availability Zone becomes unavailable, Auto Scaling will automatically redistribute applications to a different Availability Zone.
 *
 * Every API call returns a response meta data object that contains a request identifier. Successful requests return an HTTP 200 status code.
 * Unsuccessful requests return an error object and an HTTP status code of 400 or 500.
 *
 * The current WSDL is available at:
 *
 * <a
 * href="http://autoscaling.amazonaws.com/doc/2010-08-01/AutoScaling.wsdl">http://autoscaling.amazonaws.com/doc/2010-08-01/AutoScaling.wsdl</a>
 *
 * <b>Endpoints</b>
 *
 * For information about this product's regions and endpoints, go to <a
 * href="http://docs.amazonwebservices.com/general/latest/gr/index.html?rande.html">Regions and Endpoints</a> in the Amazon Web Services
 * General Reference.
 *
 * @version Thu Sep 01 21:17:05 PDT 2011
 * @license See the included NOTICE.md file for complete information.
 * @copyright See the included NOTICE.md file for complete information.
 * @link http://aws.amazon.com/autoscaling/Amazon Auto-Scaling
 * @link http://aws.amazon.com/documentation/autoscaling/Amazon Auto-Scaling documentation
 */
class AmazonAS extends CFRuntime
{

	/*%******************************************************************************************%*/
	// CLASS CONSTANTS

	/**
	 * Specify the default queue URL.
	 */
	const DEFAULT_URL = 'autoscaling.us-east-1.amazonaws.com';

	/**
	 * Specify the queue URL for the US-East (Northern Virginia) Region.
	 */
	const REGION_US_E1 = self::DEFAULT_URL;

	/**
	 * Specify the queue URL for the US-West (Northern California) Region.
	 */
	const REGION_US_W1 = 'autoscaling.us-west-1.amazonaws.com';

	/**
	 * Specify the queue URL for the EU (Ireland) Region.
	 */
	const REGION_EU_W1 = 'autoscaling.eu-west-1.amazonaws.com';

	/**
	 * Specify the queue URL for the Asia Pacific (Singapore) Region.
	 */
	const REGION_APAC_SE1 = 'autoscaling.ap-southeast-1.amazonaws.com';

	/**
	 * Specify the queue URL for the Asia Pacific (Japan) Region.
	 */
	const REGION_APAC_NE1 = 'autoscaling.ap-northeast-1.amazonaws.com';


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
	 * Constructs a new instance of <AmazonAS>.
	 *
	 * @param string $key (Optional) Your Amazon API Key. If blank, it will look for the <code>AWS_KEY</code> constant.
	 * @param string $secret_key (Optional) Your Amazon API Secret Key. If blank, it will look for the <code>AWS_SECRET_KEY</code> constant.
	 * @return boolean false if no valid values are set, otherwise true.
	 */
	public function __construct($key = null, $secret_key = null)
	{
		$this->api_version = '2010-08-01';
		$this->hostname = self::DEFAULT_URL;

		if (!$key && !defined('AWS_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new AS_Exception('No account key was passed into the constructor, nor was it set in the AWS_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		if (!$secret_key && !defined('AWS_SECRET_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new AS_Exception('No account secret was passed into the constructor, nor was it set in the AWS_SECRET_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		return parent::__construct($key, $secret_key);
	}


	/*%******************************************************************************************%*/
	// SERVICE METHODS

	/**
	 *
	 * Creates a scheduled scaling action for a Auto Scaling group. If you leave a parameter unspecified, the corresponding value remains
	 * unchanged in the affected Auto Scaling group.
	 *
	 * @param string $auto_scaling_group_name (Required) The name or ARN of the Auto Scaling Group.
	 * @param string $scheduled_action_name (Required) The name of this scaling action.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Time</code> - <code>string</code> - Optional - The time for this action to start. May be passed as a number of seconds since UNIX Epoch, or any string compatible with <php:strtotime()>.</li>
	 * 	<li><code>EndTime</code> - <code>string</code> - Optional -  May be passed as a number of seconds since UNIX Epoch, or any string compatible with <php:strtotime()>.</li>
	 * 	<li><code>Recurrence</code> - <code>string</code> - Optional -  </li>
	 * 	<li><code>MinSize</code> - <code>integer</code> - Optional - The minimum size for the new Auto Scaling group. </li>
	 * 	<li><code>MaxSize</code> - <code>integer</code> - Optional - The maximum size for the Auto Scaling group. </li>
	 * 	<li><code>DesiredCapacity</code> - <code>integer</code> - Optional - The number of EC2 instances that should be running in the group. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function put_scheduled_update_group_action($auto_scaling_group_name, $scheduled_action_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AutoScalingGroupName'] = $auto_scaling_group_name;
		$opt['ScheduledActionName'] = $scheduled_action_name;

		// Optional parameter
		if (isset($opt['Time']))
		{
			$opt['Time'] = $this->util->convert_date_to_iso8601($opt['Time']);
		}

		// Optional parameter
		if (isset($opt['EndTime']))
		{
			$opt['EndTime'] = $this->util->convert_date_to_iso8601($opt['EndTime']);
		}

		return $this->authenticate('PutScheduledUpdateGroupAction', $opt, $this->hostname);
	}

	/**
	 *
	 * Adjusts the desired size of the AutoScalingGroup by initiating scaling activities. When reducing the size of the group, it is not possible
	 * to define which EC2 instances will be terminated. This applies to any auto-scaling decisions that might result in terminating instances.
	 *
	 * There are two common use cases for <code>SetDesiredCapacity</code>: one for users of the Auto Scaling triggering system, and another for
	 * developers who write their own triggering systems. Both use cases relate to the concept of cooldown.
	 *
	 * In the first case, if you use the Auto Scaling triggering system, <code>SetDesiredCapacity</code> changes the size of your Auto Scaling
	 * group without regard to the cooldown period. This could be useful, for example, if Auto Scaling did something unexpected for some reason. If
	 * your cooldown period is 10 minutes, Auto Scaling would normally reject requests to change the size of the group for that entire 10 minute
	 * period. The <code>SetDesiredCapacity</code> command allows you to circumvent this restriction and change the size of the group before the
	 * end of the cooldown period.
	 *
	 * In the second case, if you write your own triggering system, you can use <code>SetDesiredCapacity</code> to control the size of your Auto
	 * Scaling group. If you want the same cooldown functionality that Auto Scaling offers, you can configure <code>SetDesiredCapacity</code> to
	 * honor cooldown by setting the <code>HonorCooldown</code> parameter to <code>true</code>.
	 *
	 * @param string $auto_scaling_group_name (Required) The name of the AutoScalingGroup.
	 * @param integer $desired_capacity (Required) The new capacity setting for the AutoScalingGroup.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>HonorCooldown</code> - <code>boolean</code> - Optional - By default, <code>SetDesiredCapacity</code> overrides any cooldown period. Set to True if you want Auto Scaling to reject this request if the Auto Scaling group is in cooldown. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function set_desired_capacity($auto_scaling_group_name, $desired_capacity, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AutoScalingGroupName'] = $auto_scaling_group_name;
		$opt['DesiredCapacity'] = $desired_capacity;

		return $this->authenticate('SetDesiredCapacity', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes a policy created by PutScalingPolicy
	 *
	 * @param string $policy_name (Required) The name or PolicyARN of the policy you want to delete
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>AutoScalingGroupName</code> - <code>string</code> - Optional - The name of the Auto Scaling group. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_policy($policy_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['PolicyName'] = $policy_name;

		return $this->authenticate('DeletePolicy', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes a scheduled action previously created using the PutScheduledUpdateGroupAction.
	 *
	 * @param string $scheduled_action_name (Required) The name of the action you want to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>AutoScalingGroupName</code> - <code>string</code> - Optional - The name of the Auto Scaling group </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_scheduled_action($scheduled_action_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['ScheduledActionName'] = $scheduled_action_name;

		return $this->authenticate('DeleteScheduledAction', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns a full description of the launch configurations given the specified names.
	 *
	 * If no names are specified, then the full details of all launch configurations are returned.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>LaunchConfigurationNames</code> - <code>string|array</code> - Optional - A list of launch configuration names.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>NextToken</code> - <code>string</code> - Optional - A string that marks the start of the next batch of returned results. </li>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of launch configurations. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_launch_configurations($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['LaunchConfigurationNames']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'LaunchConfigurationNames' => (is_array($opt['LaunchConfigurationNames']) ? $opt['LaunchConfigurationNames'] : array($opt['LaunchConfigurationNames']))
			), 'member'));
			unset($opt['LaunchConfigurationNames']);
		}

		return $this->authenticate('DescribeLaunchConfigurations', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns scaling process types for use in the ResumeProcesses and SuspendProcesses actions.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_scaling_process_types($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('DescribeScalingProcessTypes', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns a full description of each Auto Scaling group in the given list. This includes all Amazon EC2 instances that are members of the
	 * group. If a list of names is not provided, the service returns the full details of all Auto Scaling groups.
	 *
	 * This action supports pagination by returning a token if there are more pages to retrieve. To get the next page, call this action again with
	 * the returned token as the NextToken parameter.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>AutoScalingGroupNames</code> - <code>string|array</code> - Optional - A list of Auto Scaling group names.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>NextToken</code> - <code>string</code> - Optional - A string that marks the start of the next batch of returned results. </li>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of records to return. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_auto_scaling_groups($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['AutoScalingGroupNames']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'AutoScalingGroupNames' => (is_array($opt['AutoScalingGroupNames']) ? $opt['AutoScalingGroupNames'] : array($opt['AutoScalingGroupNames']))
			), 'member'));
			unset($opt['AutoScalingGroupNames']);
		}

		return $this->authenticate('DescribeAutoScalingGroups', $opt, $this->hostname);
	}

	/**
	 *
	 * Enables monitoring of group metrics for the Auto Scaling group specified in AutoScalingGroupName. You can specify the list of enabled
	 * metrics with the Metrics parameter.
	 *
	 * Auto scaling metrics collection can be turned on only if the <code>InstanceMonitoring.Enabled</code> flag, in the Auto Scaling group's
	 * launch configuration, is set to <code>true</code>.
	 *
	 * @param string $auto_scaling_group_name (Required) The name or ARN of the Auto Scaling Group.
	 * @param string $granularity (Required) The granularity to associate with the metrics to collect. Currently, the only legal granularity is "1Minute".
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Metrics</code> - <code>string|array</code> - Optional - The list of metrics to collect. If no metrics are specified, all metrics are enabled. The following metrics are supported: <ul> <li>GroupMinSize</li><li>GroupMaxSize</li><li>GroupDesiredCapacity</li><li>GroupInServiceInstances</li><li>GroupPendingInstances</li><li>GroupTerminatingInstances</li><li>GroupTotalInstances</li> </ul>  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function enable_metrics_collection($auto_scaling_group_name, $granularity, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AutoScalingGroupName'] = $auto_scaling_group_name;

		// Optional parameter
		if (isset($opt['Metrics']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Metrics' => (is_array($opt['Metrics']) ? $opt['Metrics'] : array($opt['Metrics']))
			), 'member'));
			unset($opt['Metrics']);
		}
		$opt['Granularity'] = $granularity;

		return $this->authenticate('EnableMetricsCollection', $opt, $this->hostname);
	}

	/**
	 *
	 * Terminates the specified instance. Optionally, the desired group size can be adjusted.
	 *
	 * This call simply registers a termination request. The termination of the instance cannot happen immediately.
	 *
	 * @param string $instance_id (Required) The ID of the EC2 instance to be terminated.
	 * @param boolean $should_decrement_desired_capacity (Required) Specifies whether (<i>true</i>) or not (<i>false</i>) terminating this instance should also decrement the size of the AutoScalingGroup.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function terminate_instance_in_auto_scaling_group($instance_id, $should_decrement_desired_capacity, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['InstanceId'] = $instance_id;
		$opt['ShouldDecrementDesiredCapacity'] = $should_decrement_desired_capacity;

		return $this->authenticate('TerminateInstanceInAutoScalingGroup', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns the scaling activities for the specified Auto Scaling group.
	 *
	 * If the specified <i>ActivityIds</i> list is empty, all the activities from the past six weeks are returned. Activities are sorted by
	 * completion time. Activities still in progress appear first on the list.
	 *
	 * This action supports pagination. If the response includes a token, there are more records available. To get the additional records, repeat
	 * the request with the response token as the NextToken parameter.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>ActivityIds</code> - <code>string|array</code> - Optional - A list containing the activity IDs of the desired scaling activities. If this list is omitted, all activities are described. If an AutoScalingGroupName is provided, the results are limited to that group. The list of requested activities cannot contain more than 50 items. If unknown activities are requested, they are ignored with no error.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>AutoScalingGroupName</code> - <code>string</code> - Optional - The name of the AutoScalingGroup. </li>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of scaling activities to return. </li>
	 * 	<li><code>NextToken</code> - <code>string</code> - Optional - A string that marks the start of the next batch of returned results for pagination. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_scaling_activities($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['ActivityIds']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'ActivityIds' => (is_array($opt['ActivityIds']) ? $opt['ActivityIds'] : array($opt['ActivityIds']))
			), 'member'));
			unset($opt['ActivityIds']);
		}

		return $this->authenticate('DescribeScalingActivities', $opt, $this->hostname);
	}

	/**
	 *
	 * Runs the policy you create for your Auto Scaling group in PutScalingPolicy.
	 *
	 * @param string $policy_name (Required) The name or PolicyARN of the policy you want to run.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>AutoScalingGroupName</code> - <code>string</code> - Optional - The name or ARN of the Auto Scaling Group. </li>
	 * 	<li><code>HonorCooldown</code> - <code>boolean</code> - Optional - Set to True if you want Auto Scaling to reject this request if the Auto Scaling group is in cooldown. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function execute_policy($policy_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['PolicyName'] = $policy_name;

		return $this->authenticate('ExecutePolicy', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns a list of metrics and a corresponding list of granularities for each metric.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_metric_collection_types($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('DescribeMetricCollectionTypes', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns descriptions of what each policy does. This action supports pagination. If the response includes a token, there are more records
	 * available. To get the additional records, repeat the request with the response token as the NextToken parameter.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>AutoScalingGroupName</code> - <code>string</code> - Optional - The name of the Auto Scaling group. </li>
	 * 	<li><code>PolicyNames</code> - <code>string|array</code> - Optional - A list of policy names or policy ARNs to be described. If this list is omitted, all policy names are described. If an auto scaling group name is provided, the results are limited to that group.The list of requested policy names cannot contain more than 50 items. If unknown policy names are requested, they are ignored with no error.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>NextToken</code> - <code>string</code> - Optional - A string that is used to mark the start of the next batch of returned results for pagination. </li>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of policies that will be described with each call. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_policies($opt = null)
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

		return $this->authenticate('DescribePolicies', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns policy adjustment types for use in the PutScalingPolicy action.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_adjustment_types($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('DescribeAdjustmentTypes', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes the specified auto scaling group if the group has no instances and no scaling activities in progress.
	 *
	 * To remove all instances before calling DeleteAutoScalingGroup, you can call UpdateAutoScalingGroup to set the minimum and maximum size of
	 * the AutoScalingGroup to zero.
	 *
	 * @param string $auto_scaling_group_name (Required) The name of the Auto Scaling group.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_auto_scaling_group($auto_scaling_group_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AutoScalingGroupName'] = $auto_scaling_group_name;

		return $this->authenticate('DeleteAutoScalingGroup', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a new Auto Scaling group with the specified name. Once the creation request is completed, the AutoScalingGroup is ready to be used
	 * in other calls.
	 *
	 * The Auto Scaling group name must be unique within the scope of your AWS account, and under the quota of Auto Scaling groups allowed for
	 * your account.
	 *
	 * @param string $auto_scaling_group_name (Required) The name of the Auto Scaling group.
	 * @param string $launch_configuration_name (Required) The name of the launch configuration to use with the Auto Scaling group.
	 * @param integer $min_size (Required) The minimum size of the Auto Scaling group.
	 * @param integer $max_size (Required) The maximum size of the Auto Scaling group.
	 * @param string|array $availability_zones (Required) A list of availability zones for the Auto Scaling group.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>DesiredCapacity</code> - <code>integer</code> - Optional - The number of EC2 instances that should be running in the group. For more information, see SetDesiredCapacity. </li>
	 * 	<li><code>DefaultCooldown</code> - <code>integer</code> - Optional - The amount of time, in seconds, after a scaling activity completes before any further trigger-related scaling activities can start. </li>
	 * 	<li><code>LoadBalancerNames</code> - <code>string|array</code> - Optional - A list of LoadBalancers to use.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>HealthCheckType</code> - <code>string</code> - Optional - The service you want the health status from, Amazon EC2 or Elastic Load Balancer. Valid values are "EC2" or "ELB." </li>
	 * 	<li><code>HealthCheckGracePeriod</code> - <code>integer</code> - Optional - Length of time in seconds after a new EC2 instance comes into service that Auto Scaling starts checking its health. </li>
	 * 	<li><code>PlacementGroup</code> - <code>string</code> - Optional - Physical location of your cluster placement group created in Amazon EC2. </li>
	 * 	<li><code>VPCZoneIdentifier</code> - <code>string</code> - Optional - The subnet identifier of the Virtual Private Cloud. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_auto_scaling_group($auto_scaling_group_name, $launch_configuration_name, $min_size, $max_size, $availability_zones, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AutoScalingGroupName'] = $auto_scaling_group_name;
		$opt['LaunchConfigurationName'] = $launch_configuration_name;
		$opt['MinSize'] = $min_size;
		$opt['MaxSize'] = $max_size;

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'AvailabilityZones' => (is_array($availability_zones) ? $availability_zones : array($availability_zones))
		), 'member'));

		// Optional parameter
		if (isset($opt['LoadBalancerNames']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'LoadBalancerNames' => (is_array($opt['LoadBalancerNames']) ? $opt['LoadBalancerNames'] : array($opt['LoadBalancerNames']))
			), 'member'));
			unset($opt['LoadBalancerNames']);
		}

		return $this->authenticate('CreateAutoScalingGroup', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns a description of each Auto Scaling instance in the InstanceIds list. If a list is not provided, the service returns the full
	 * details of all instances up to a maximum of fifty.
	 *
	 * This action supports pagination by returning a token if there are more pages to retrieve. To get the next page, call this action again with
	 * the returned token as the NextToken parameter.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>InstanceIds</code> - <code>string|array</code> - Optional - The list of Auto Scaling instances to describe. If this list is omitted, all auto scaling instances are described. The list of requested instances cannot contain more than 50 items. If unknown instances are requested, they are ignored with no error.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of Auto Scaling instances to be described with each call. </li>
	 * 	<li><code>NextToken</code> - <code>string</code> - Optional - The token returned by a previous call to indicate that there is more data available. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_auto_scaling_instances($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['InstanceIds']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'InstanceIds' => (is_array($opt['InstanceIds']) ? $opt['InstanceIds'] : array($opt['InstanceIds']))
			), 'member'));
			unset($opt['InstanceIds']);
		}

		return $this->authenticate('DescribeAutoScalingInstances', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes the specified LaunchConfiguration.
	 *
	 * The specified launch configuration must not be attached to an Auto Scaling group. Once this call completes, the launch configuration is no
	 * longer available for use.
	 *
	 * @param string $launch_configuration_name (Required) The name of the launch configuration.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_launch_configuration($launch_configuration_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LaunchConfigurationName'] = $launch_configuration_name;

		return $this->authenticate('DeleteLaunchConfiguration', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates or updates a policy for an Auto Scaling group. To update an existing policy, use the existing policy name and set the parameter(s)
	 * you want to change. Any existing parameter not changed in an update to an existing policy is not changed in this update request.
	 *
	 * @param string $auto_scaling_group_name (Required) The name or ARN of the Auto Scaling Group.
	 * @param string $policy_name (Required) The name of the policy you want to create or update.
	 * @param integer $scaling_adjustment (Required) The number of instances by which to scale. AdjustmentType determines the interpretation of this number (e.g., as an absolute number or as a percentage of the existing Auto Scaling group size). A positive increment adds to the current capacity and a negative value removes from the current capacity.
	 * @param string $adjustment_type (Required) Specifies whether the <code>ScalingAdjustment</code> is an absolute number or a percentage of the current capacity. Valid values are <code>ChangeInCapacity</code>, <code>ExactCapacity</code>, and <code>PercentChangeInCapacity</code>.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Cooldown</code> - <code>integer</code> - Optional - The amount of time, in seconds, after a scaling activity completes before any further trigger-related scaling activities can start. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function put_scaling_policy($auto_scaling_group_name, $policy_name, $scaling_adjustment, $adjustment_type, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AutoScalingGroupName'] = $auto_scaling_group_name;
		$opt['PolicyName'] = $policy_name;
		$opt['ScalingAdjustment'] = $scaling_adjustment;
		$opt['AdjustmentType'] = $adjustment_type;

		return $this->authenticate('PutScalingPolicy', $opt, $this->hostname);
	}

	/**
	 *
	 * Sets the health status of an instance.
	 *
	 * @param string $instance_id (Required) The identifier of the EC2 instance.
	 * @param string $health_status (Required) The health status of the instance. "Healthy" means that the instance is healthy and should remain in service. "Unhealthy" means that the instance is unhealthy. Auto Scaling should terminate and replace it.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>ShouldRespectGracePeriod</code> - <code>boolean</code> - Optional - If True, this call should respect the grace period associated with the group. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function set_instance_health($instance_id, $health_status, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['InstanceId'] = $instance_id;
		$opt['HealthStatus'] = $health_status;

		return $this->authenticate('SetInstanceHealth', $opt, $this->hostname);
	}

	/**
	 *
	 * Updates the configuration for the specified AutoScalingGroup.
	 *
	 * To update an Auto Scaling group with a launch configuration that has the <code>InstanceMonitoring.enabled</code> flag set to
	 * <code>false</code>, you must first ensure that collection of group metrics is disabled. Otherwise, calls to UpdateAutoScalingGroup will
	 * fail. If you have previously enabled group metrics collection, you can disable collection of all group metrics by calling
	 * DisableMetricsCollection.
	 *
	 *
	 * The new settings are registered upon the completion of this call. Any launch configuration settings take effect on any triggers after this
	 * call returns. Triggers that are currently in progress aren't affected.
	 *
	 * If the new values are specified for the <i>MinSize</i> or <i>MaxSize</i> parameters, then there will be an implicit call to
	 * SetDesiredCapacity to set the group to the new <i>MaxSize</i>. All optional parameters are left unchanged if not passed in the request.
	 *
	 * @param string $auto_scaling_group_name (Required) The name of the Auto Scaling group.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>LaunchConfigurationName</code> - <code>string</code> - Optional - The name of the launch configuration. </li>
	 * 	<li><code>MinSize</code> - <code>integer</code> - Optional - The minimum size of the Auto Scaling group. </li>
	 * 	<li><code>MaxSize</code> - <code>integer</code> - Optional - The maximum size of the Auto Scaling group. </li>
	 * 	<li><code>DesiredCapacity</code> - <code>integer</code> - Optional - The desired capacity for the Auto Scaling group. </li>
	 * 	<li><code>DefaultCooldown</code> - <code>integer</code> - Optional - The amount of time, in seconds, after a scaling activity completes before any further trigger-related scaling activities can start. </li>
	 * 	<li><code>AvailabilityZones</code> - <code>string|array</code> - Optional - Availability zones for the group.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>HealthCheckType</code> - <code>string</code> - Optional - The service of interest for the health status check, either "EC2" for Amazon EC2 or "ELB" for Elastic Load Balancing. </li>
	 * 	<li><code>HealthCheckGracePeriod</code> - <code>integer</code> - Optional - The length of time that Auto Scaling waits before checking an instance's health status. The grace period begins when an instance comes into service. </li>
	 * 	<li><code>PlacementGroup</code> - <code>string</code> - Optional - The name of the cluster placement group, if applicable. For more information, go to Using Cluster Instances in the <i>Amazon EC2 User Guide</i>. </li>
	 * 	<li><code>VPCZoneIdentifier</code> - <code>string</code> - Optional - The identifier for the VPC connection, if applicable. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function update_auto_scaling_group($auto_scaling_group_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AutoScalingGroupName'] = $auto_scaling_group_name;

		// Optional parameter
		if (isset($opt['AvailabilityZones']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'AvailabilityZones' => (is_array($opt['AvailabilityZones']) ? $opt['AvailabilityZones'] : array($opt['AvailabilityZones']))
			), 'member'));
			unset($opt['AvailabilityZones']);
		}

		return $this->authenticate('UpdateAutoScalingGroup', $opt, $this->hostname);
	}

	/**
	 *
	 * Lists all the actions scheduled for your Auto Scaling group that haven't been executed. To see a list of action already executed, see the
	 * activity record returned in DescribeScalingActivities.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>AutoScalingGroupName</code> - <code>string</code> - Optional - The name of the Auto Scaling group. </li>
	 * 	<li><code>ScheduledActionNames</code> - <code>string|array</code> - Optional - A list of scheduled actions to be described. If this list is omitted, all scheduled actions are described. The list of requested scheduled actions cannot contain more than 50 items. If an auto scaling group name is provided, the results are limited to that group. If unknown scheduled actions are requested, they are ignored with no error.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>StartTime</code> - <code>string</code> - Optional - The earliest scheduled start time to return. If scheduled action names are provided, this field will be ignored. May be passed as a number of seconds since UNIX Epoch, or any string compatible with <php:strtotime()>.</li>
	 * 	<li><code>EndTime</code> - <code>string</code> - Optional - The latest scheduled start time to return. If scheduled action names are provided, this field will be ignored. May be passed as a number of seconds since UNIX Epoch, or any string compatible with <php:strtotime()>.</li>
	 * 	<li><code>NextToken</code> - <code>string</code> - Optional - A string that marks the start of the next batch of returned results. </li>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of scheduled actions to return. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_scheduled_actions($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['ScheduledActionNames']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'ScheduledActionNames' => (is_array($opt['ScheduledActionNames']) ? $opt['ScheduledActionNames'] : array($opt['ScheduledActionNames']))
			), 'member'));
			unset($opt['ScheduledActionNames']);
		}

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

		return $this->authenticate('DescribeScheduledActions', $opt, $this->hostname);
	}

	/**
	 *
	 * Suspends Auto Scaling processes for an Auto Scaling group. To suspend specific process types, specify them by name with the
	 * <code>ScalingProcesses.member.N</code> parameter. To suspend all process types, omit the <code>ScalingProcesses.member.N</code> parameter.
	 *
	 * Suspending either of the two primary process types, <code>Launch</code> or <code>Terminate</code>, can prevent other process types from
	 * functioning properly. For more information about processes and their dependencies, see ProcessType.
	 *
	 *
	 * To resume processes that have been suspended, use ResumeProcesses.
	 *
	 * @param string $auto_scaling_group_name (Required) The name or Amazon Resource Name (ARN) of the Auto Scaling group.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>ScalingProcesses</code> - <code>string|array</code> - Optional - The processes that you want to suspend or resume, which can include one or more of the following: <ul> <li>Launch</li><li>Terminate</li><li>HealthCheck</li><li>ReplaceUnhealthy</li><li>AZRebalance</li><li>AlarmNotifications</li><li>ScheduledActions</li> </ul> To suspend all process types, omit this parameter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function suspend_processes($auto_scaling_group_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AutoScalingGroupName'] = $auto_scaling_group_name;

		// Optional parameter
		if (isset($opt['ScalingProcesses']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'ScalingProcesses' => (is_array($opt['ScalingProcesses']) ? $opt['ScalingProcesses'] : array($opt['ScalingProcesses']))
			), 'member'));
			unset($opt['ScalingProcesses']);
		}

		return $this->authenticate('SuspendProcesses', $opt, $this->hostname);
	}

	/**
	 *
	 * Resumes Auto Scaling processes for an Auto Scaling group. For more information, see SuspendProcesses and ProcessType.
	 *
	 * @param string $auto_scaling_group_name (Required) The name or Amazon Resource Name (ARN) of the Auto Scaling group.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>ScalingProcesses</code> - <code>string|array</code> - Optional - The processes that you want to suspend or resume, which can include one or more of the following: <ul> <li>Launch</li><li>Terminate</li><li>HealthCheck</li><li>ReplaceUnhealthy</li><li>AZRebalance</li><li>AlarmNotifications</li><li>ScheduledActions</li> </ul> To suspend all process types, omit this parameter.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function resume_processes($auto_scaling_group_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AutoScalingGroupName'] = $auto_scaling_group_name;

		// Optional parameter
		if (isset($opt['ScalingProcesses']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'ScalingProcesses' => (is_array($opt['ScalingProcesses']) ? $opt['ScalingProcesses'] : array($opt['ScalingProcesses']))
			), 'member'));
			unset($opt['ScalingProcesses']);
		}

		return $this->authenticate('ResumeProcesses', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a new launch configuration. Once created, the new launch configuration is available for immediate use.
	 *
	 * The launch configuration name used must be unique, within the scope of the client's AWS account, and the maximum limit of launch
	 * configurations must not yet have been met, or else the call will fail.
	 *
	 * @param string $launch_configuration_name (Required) The name of the launch configuration to create.
	 * @param string $image_id (Required) Unique ID of the <i>Amazon Machine Image</i> (AMI) which was assigned during registration. For more information about Amazon EC2 images, please go to Using AMIs in the <i>Amazon EC2 User Guide</i>
	 * @param string $instance_type (Required) The instance type of the EC2 instance. For more information about Amazon EC2 instance types, please go to Using Instances in the <i>Amazon EC2 User Guide</i>.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>KeyName</code> - <code>string</code> - Optional - The name of the EC2 key pair. </li>
	 * 	<li><code>SecurityGroups</code> - <code>string|array</code> - Optional - The names of the security groups with which to associate EC2 instances. For more information about Amazon EC2 security groups, go to Using Security Groups in the <i>Amazon EC2 User Guide</i>.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>UserData</code> - <code>string</code> - Optional - The user data available to the launched EC2 instances. For more information about Amazon EC2 user data, please go to Using Instances in the <i>Amazon EC2 User Guide</i>. </li>
	 * 	<li><code>KernelId</code> - <code>string</code> - Optional - The ID of the kernel associated with the EC2 AMI. </li>
	 * 	<li><code>RamdiskId</code> - <code>string</code> - Optional - The ID of the RAM disk associated with the EC2 AMI. </li>
	 * 	<li><code>BlockDeviceMappings</code> - <code>array</code> - Optional - A list of mappings that specify how block devices are exposed to the instance. Each mapping is made up of a <i>VirtualName</i>, a <i>DeviceName</i>, and an <i>ebs</i> data structure that contains information about the associated Elastic Block Storage volume. For more information about Amazon EC2 BlockDeviceMappings, please go to Block Device Mapping in the <i>Amazon EC2 User Guide</i>. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>VirtualName</code> - <code>string</code> - Optional - The virtual name associated with the device. </li>
	 * 			<li><code>DeviceName</code> - <code>string</code> - Required - The name of the device within Amazon EC2. </li>
	 * 			<li><code>Ebs</code> - <code>array</code> - Optional - The Elastic Block Storage volume information. Takes an associative array of parameters that can have the following keys: <ul>
	 * 				<li><code>SnapshotId</code> - <code>string</code> - Optional - The Snapshot ID. </li>
	 * 				<li><code>VolumeSize</code> - <code>integer</code> - Optional - The volume size, in GigaBytes. </li>
	 * 			</ul></li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>InstanceMonitoring</code> - <code>array</code> - Optional -  Enables detailed monitoring. <ul>
	 * 		<li><code>Enabled</code> - <code>boolean</code> - Optional - If true, instance monitoring is enabled. </li></ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_launch_configuration($launch_configuration_name, $image_id, $instance_type, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['LaunchConfigurationName'] = $launch_configuration_name;
		$opt['ImageId'] = $image_id;

		// Optional parameter
		if (isset($opt['SecurityGroups']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'SecurityGroups' => (is_array($opt['SecurityGroups']) ? $opt['SecurityGroups'] : array($opt['SecurityGroups']))
			), 'member'));
			unset($opt['SecurityGroups']);
		}
		$opt['InstanceType'] = $instance_type;

		// Optional parameter
		if (isset($opt['BlockDeviceMappings']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'BlockDeviceMappings' => $opt['BlockDeviceMappings']
			), 'member'));
			unset($opt['BlockDeviceMappings']);
		}

		// Optional parameter
		if (isset($opt['InstanceMonitoring']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'InstanceMonitoring' => $opt['InstanceMonitoring']
			), 'member'));
			unset($opt['InstanceMonitoring']);
		}

		return $this->authenticate('CreateLaunchConfiguration', $opt, $this->hostname);
	}

	/**
	 *
	 * Disables monitoring of group metrics for the Auto Scaling group specified in AutoScalingGroupName. You can specify the list of affected
	 * metrics with the Metrics parameter.
	 *
	 * @param string $auto_scaling_group_name (Required) The name or ARN of the Auto Scaling Group.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Metrics</code> - <code>string|array</code> - Optional - The list of metrics to disable. If no metrics are specified, all metrics are disabled. The following metrics are supported: <ul> <li>GroupMinSize</li><li>GroupMaxSize</li><li>GroupDesiredCapacity</li><li>GroupInServiceInstances</li><li>GroupPendingInstances</li><li>GroupTerminatingInstances</li><li>GroupTotalInstances</li> </ul>  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function disable_metrics_collection($auto_scaling_group_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AutoScalingGroupName'] = $auto_scaling_group_name;

		// Optional parameter
		if (isset($opt['Metrics']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Metrics' => (is_array($opt['Metrics']) ? $opt['Metrics'] : array($opt['Metrics']))
			), 'member'));
			unset($opt['Metrics']);
		}

		return $this->authenticate('DisableMetricsCollection', $opt, $this->hostname);
	}
}


/*%******************************************************************************************%*/
// EXCEPTIONS

/**
 * Default AS Exception.
 */
class AS_Exception extends Exception {}