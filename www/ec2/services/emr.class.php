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
 * This is the Amazon Elastic MapReduce API Reference Guide. This guide is for programmers who need detailed information about the Amazon
 * Elastic MapReduce APIs.
 *
 * @version Tue Apr 05 15:19:55 PDT 2011
 * @license See the included NOTICE.md file for complete information.
 * @copyright See the included NOTICE.md file for complete information.
 * @link http://aws.amazon.com/elasticmapreduce/Amazon Elastic MapReduce
 * @link http://aws.amazon.com/documentation/elasticmapreduce/Amazon Elastic MapReduce documentation
 */
class AmazonEMR extends CFRuntime
{

	/*%******************************************************************************************%*/
	// CLASS CONSTANTS

	/**
	 * Specify the default queue URL.
	 */
	const DEFAULT_URL = 'us-east-1.elasticmapreduce.amazonaws.com';

	/**
	 * Specify the queue URL for the US-East (Northern Virginia) Region.
	 */
	const REGION_US_E1 = self::DEFAULT_URL;

	/**
	 * Specify the queue URL for the US-West (Northern California) Region.
	 */
	const REGION_US_W1 = 'us-west-1.elasticmapreduce.amazonaws.com';

	/**
	 * Specify the queue URL for the EU (Ireland) Region.
	 */
	const REGION_EU_W1 = 'eu-west-1.elasticmapreduce.amazonaws.com';

	/**
	 * Specify the queue URL for the Asia Pacific (Singapore) Region.
	 */
	const REGION_APAC_SE1 = 'ap-southeast-1.elasticmapreduce.amazonaws.com';

	/**
	 * Specify the queue URL for the Asia Pacific (Japan) Region.
	 */
	const REGION_APAC_NE1 = 'ap-northeast-1.elasticmapreduce.amazonaws.com';


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
	 * Constructs a new instance of <AmazonEMR>.
	 *
	 * @param string $key (Optional) Your Amazon API Key. If blank, it will look for the <code>AWS_KEY</code> constant.
	 * @param string $secret_key (Optional) Your Amazon API Secret Key. If blank, it will look for the <code>AWS_SECRET_KEY</code> constant.
	 * @return boolean false if no valid values are set, otherwise true.
	 */
	public function __construct($key = null, $secret_key = null)
	{
		$this->api_version = '2009-03-31';
		$this->hostname = self::DEFAULT_URL;

		if (!$key && !defined('AWS_KEY'))
		{
			throw new EMR_Exception('No account key was passed into the constructor, nor was it set in the AWS_KEY constant.');
		}

		if (!$secret_key && !defined('AWS_SECRET_KEY'))
		{
			throw new EMR_Exception('No account secret was passed into the constructor, nor was it set in the AWS_SECRET_KEY constant.');
		}

		return parent::__construct($key, $secret_key);
	}


	/*%******************************************************************************************%*/
	// SERVICE METHODS

	/**
	 * AddInstanceGroups adds an instance group to a running cluster.
	 *
	 * @param string $job_flow_id (Required) Job flow in which to add the instance groups.
	 * @param array $instance_groups (Required) Instance Groups to add. Takes an indexed array of associative arrays of parameters. Each associative array can have the following keys: <ul>
	 * 	<li><code>Name</code> - <code>string</code> - Optional - Friendly name given to the instance group.</li>
	 *	<li><code>Market</code> - <code>string</code> - Required - Market type of the Amazon EC2 instances used to create a cluster node. [Allowed values: <code>ON_DEMAND</code>]</li>
	 *	<li><code>InstanceRole</code> - <code>string</code> - Required - The role of the instance group in the cluster. [Allowed values: <code>MASTER</code>, <code>CORE</code>, <code>TASK</code>]</li>
	 *	<li><code>InstanceType</code> - <code>string</code> - Required - The Amazon EC2 instance type for all instances in the instance group.</li>
	 *	<li><code>InstanceCount</code> - <code>integer</code> - Required - Target number of instances for the instance group.</li></ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <php:curl_setopt()>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 *  <li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This is useful for manually-managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function add_instance_groups($job_flow_id, $instance_groups, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['JobFlowId'] = $job_flow_id;

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'InstanceGroups' => (is_array($instance_groups) ? $instance_groups : array($instance_groups))
		), 'member'));

		return $this->authenticate('AddInstanceGroups', $opt, $this->hostname);
	}

	/**
	 *
	 * AddJobFlowSteps adds new steps to a running job flow. A maximum of 256 steps are allowed in each job flow.
	 *
	 * A step specifies the location of a JAR file stored either on the master node of the job flow or in Amazon S3. Each step is performed by the
	 * main function of the main class of the JAR file. The main class can be specified either in the manifest of the JAR or by using the
	 * MainFunction parameter of the step.
	 *
	 * Elastic MapReduce executes each step in the order listed. For a step to be considered complete, the main function must exit with a zero
	 * exit code and all Hadoop jobs started while the step was running must have completed and run successfully.
	 *
	 * You can only add steps to a job flow that is in one of the following states: STARTING, BOOTSTAPPING, RUNNING, or WAITING.
	 *
	 * @param string $job_flow_id (Required) A string that uniquely identifies the job flow. This identifier is returned by RunJobFlow and can also be obtained from DescribeJobFlows .
	 * @param array $steps (Required) A list of StepConfig to be executed by the job flow. <ul>
	 * 	<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 		<li><code>Name</code> - <code>string</code> - Required - The name of the job flow step. </li>
	 * 		<li><code>ActionOnFailure</code> - <code>string</code> - Optional - Specifies the action to take if the job flow step fails. [Allowed values: <code>TERMINATE_JOB_FLOW</code>, <code>CANCEL_AND_WAIT</code>, <code>CONTINUE</code>]</li>
	 * 		<li><code>HadoopJarStep</code> - <code>array</code> - Required - Specifies the JAR file used for the job flow step. Takes an associative array of parameters that can have the following keys: <ul>
	 * 			<li><code>Properties</code> - <code>array</code> - Optional - A list of Java properties that are set when the step runs. You can use these properties to pass key value pairs to your main function. <ul>
	 * 				<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 					<li><code>Key</code> - <code>string</code> - Optional - The unique identifier of a key value pair. </li>
	 * 					<li><code>Value</code> - <code>string</code> - Optional - The value part of the identified key. </li>
	 * 				</ul></li>
	 * 			</ul></li>
	 * 			<li><code>Jar</code> - <code>string</code> - Required - A path to a JAR file run during the step. </li>
	 * 			<li><code>MainClass</code> - <code>string</code> - Optional - The name of the main class in the specified Java file. If not specified, the JAR file should specify a Main-Class in its manifest file. </li>
	 * 			<li><code>Args</code> - <code>string|array</code> - Optional - A list of command line arguments passed to the JAR file's main function when executed.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <php:curl_setopt()>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function add_job_flow_steps($job_flow_id, $steps, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['JobFlowId'] = $job_flow_id;

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'Steps' => (is_array($steps) ? $steps : array($steps))
		), 'member'));

		return $this->authenticate('AddJobFlowSteps', $opt, $this->hostname);
	}

	/**
	 *
	 * TerminateJobFlows shuts a list of job flows down. When a job flow is shut down, any step not yet completed is canceled and the EC2
	 * instances on which the job flow is running are stopped. Any log files not already saved are uploaded to Amazon S3 if a LogUri was specified
	 * when the job flow was created.
	 *
	 * @param string|array $job_flow_ids (Required) A list of job flows to be shutdown.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <php:curl_setopt()>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function terminate_job_flows($job_flow_ids, $opt = null)
	{
		if (!$opt) $opt = array();

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'JobFlowIds' => (is_array($job_flow_ids) ? $job_flow_ids : array($job_flow_ids))
		), 'member'));

		return $this->authenticate('TerminateJobFlows', $opt, $this->hostname);
	}

	/**
	 *
	 * DescribeJobFlows returns a list of job flows that match all of the supplied parameters. The parameters can include a list of job flow IDs,
	 * job flow states, and restrictions on job flow creation date and time.
	 *
	 * Regardless of supplied parameters, only job flows created within the last two months are returned.
	 *
	 * If no parameters are supplied, then job flows matching either of the following criteria are returned:
	 *
	 * <ul> <li>Job flows created and completed in the last two weeks</li>
	 *
	 * <li> Job flows created within the last two months that are in one of the following states: <code>RUNNING</code> , <code>WAITING</code> ,
	 * <code>SHUTTING_DOWN</code> , <code>STARTING</code> </li>
	 *
	 * </ul>
	 *
	 * Amazon Elastic MapReduce can return a maximum of 512 job flow descriptions.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>CreatedAfter</code> - <code>string</code> - Optional - Return only job flows created after this date and time. May be passed as a number of seconds since UNIX Epoch, or any string compatible with <php:strtotime()>.</li>
	 * 	<li><code>CreatedBefore</code> - <code>string</code> - Optional - Return only job flows created before this date and time. May be passed as a number of seconds since UNIX Epoch, or any string compatible with <php:strtotime()>.</li>
	 * 	<li><code>JobFlowIds</code> - <code>string|array</code> - Optional - Return only job flows whose job flow ID is contained in this list.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>JobFlowStates</code> - <code>string|array</code> - Optional - Return only job flows whose state is contained in this list.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <php:curl_setopt()>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_job_flows($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['CreatedAfter']))
		{
			$opt['CreatedAfter'] = $this->util->convert_date_to_iso8601($opt['CreatedAfter']);
		}

		// Optional parameter
		if (isset($opt['CreatedBefore']))
		{
			$opt['CreatedBefore'] = $this->util->convert_date_to_iso8601($opt['CreatedBefore']);
		}

		// Optional parameter
		if (isset($opt['JobFlowIds']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'JobFlowIds' => (is_array($opt['JobFlowIds']) ? $opt['JobFlowIds'] : array($opt['JobFlowIds']))
			), 'member'));
			unset($opt['JobFlowIds']);
		}

		// Optional parameter
		if (isset($opt['JobFlowStates']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'JobFlowStates' => (is_array($opt['JobFlowStates']) ? $opt['JobFlowStates'] : array($opt['JobFlowStates']))
			), 'member'));
			unset($opt['JobFlowStates']);
		}

		return $this->authenticate('DescribeJobFlows', $opt, $this->hostname);
	}

	/**
	 *
	 * RunJobFlow creates and starts running a new job flow. The job flow will run the steps specified. Once the job flow completes, the cluster
	 * is stopped and the HDFS partition is lost. To prevent loss of data, configure the last step of the job flow to store results in Amazon S3.
	 * If the JobFlowInstancesDetail : KeepJobFlowAliveWhenNoSteps parameter is set to <code>TRUE</code>, the job flow will transition to the
	 * WAITING state rather than shutting down once the steps have completed.
	 *
	 * A maximum of 256 steps are allowed in each job flow.
	 *
	 * For long running job flows, we recommended that you periodically store your results.
	 *
	 * @param string $name (Required) The name of the job flow.
	 * @param array $instances (Required) A specification of the number and type of Amazon EC2 instances on which to run the job flow. <ul>
	 * 	<li><code>MasterInstanceType</code> - <code>string</code> - Optional - The EC2 instance type of the master node. </li>
	 * 	<li><code>SlaveInstanceType</code> - <code>string</code> - Optional - The EC2 instance type of the slave nodes. </li>
	 * 	<li><code>InstanceCount</code> - <code>integer</code> - Optional - The number of Amazon EC2 instances used to execute the job flow. </li>
	 * 	<li><code>InstanceGroups</code> - <code>array</code> - Optional - Configuration for the job flow's instance groups. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Optional - Friendly name given to the instance group. </li>
	 * 			<li><code>Market</code> - <code>string</code> - Required - Market type of the Amazon EC2 instances used to create a cluster node. [Allowed values: <code>ON_DEMAND</code>]</li>
	 * 			<li><code>InstanceRole</code> - <code>string</code> - Required - The role of the instance group in the cluster. [Allowed values: <code>MASTER</code>, <code>CORE</code>, <code>TASK</code>]</li>
	 * 			<li><code>InstanceType</code> - <code>string</code> - Required - The Amazon EC2 instance type for all instances in the instance group. </li>
	 * 			<li><code>InstanceCount</code> - <code>integer</code> - Required - Target number of instances for the instance group. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>Ec2KeyName</code> - <code>string</code> - Optional - Specifies the name of the Amazon EC2 key pair that can be used to ssh to the master node as the user called "hadoop." </li>
	 * 	<li><code>Placement</code> - <code>array</code> - Optional - Specifies the Availability Zone the job flow will run in. Takes an associative array of parameters that can have the following keys: <ul>
	 * 		<li><code>AvailabilityZone</code> - <code>string</code> - Required - The Amazon EC2 Availability Zone for the job flow. </li>
	 * 	</ul></li>
	 * 	<li><code>KeepJobFlowAliveWhenNoSteps</code> - <code>boolean</code> - Optional - Specifies whether the job flow should terminate after completing all steps. </li>
	 * 	<li><code>HadoopVersion</code> - <code>string</code> - Optional - Specifies the Hadoop version for the job flow. Valid inputs are "0.18" or "0.20". </li>
	 * </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>LogUri</code> - <code>string</code> - Optional - Specifies the location in Amazon S3 to write the log files of the job flow. If a value is not provided, logs are not created. </li>
	 * 	<li><code>AdditionalInfo</code> - <code>string</code> - Optional - A JSON string for selecting additional features. </li>
	 * 	<li><code>Steps</code> - <code>array</code> - Optional - A list of steps to be executed by the job flow. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Required - The name of the job flow step. </li>
	 * 			<li><code>ActionOnFailure</code> - <code>string</code> - Optional - Specifies the action to take if the job flow step fails. [Allowed values: <code>TERMINATE_JOB_FLOW</code>, <code>CANCEL_AND_WAIT</code>, <code>CONTINUE</code>]</li>
	 * 			<li><code>HadoopJarStep</code> - <code>array</code> - Required - Specifies the JAR file used for the job flow step. Takes an associative array of parameters that can have the following keys: <ul>
	 * 				<li><code>Properties</code> - <code>array</code> - Optional - A list of Java properties that are set when the step runs. You can use these properties to pass key value pairs to your main function. <ul>
	 * 					<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 						<li><code>Key</code> - <code>string</code> - Optional - The unique identifier of a key value pair. </li>
	 * 						<li><code>Value</code> - <code>string</code> - Optional - The value part of the identified key. </li>
	 * 					</ul></li>
	 * 				</ul></li>
	 * 				<li><code>Jar</code> - <code>string</code> - Required - A path to a JAR file run during the step. </li>
	 * 				<li><code>MainClass</code> - <code>string</code> - Optional - The name of the main class in the specified Java file. If not specified, the JAR file should specify a Main-Class in its manifest file. </li>
	 * 				<li><code>Args</code> - <code>string|array</code> - Optional - A list of command line arguments passed to the JAR file's main function when executed.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 			</ul></li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>BootstrapActions</code> - <code>array</code> - Optional - A list of bootstrap actions that will be run before Hadoop is started on the cluster nodes. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Required - The name of the bootstrap action. </li>
	 * 			<li><code>ScriptBootstrapAction</code> - <code>array</code> - Required - The script run by the bootstrap action. Takes an associative array of parameters that can have the following keys: <ul>
	 * 				<li><code>Path</code> - <code>string</code> - Optional - Location of the script to run during a bootstrap action. Can be either a location in Amazon S3 or on a local file system. </li>
	 * 				<li><code>Args</code> - <code>string|array</code> - Optional - A list of command line arguments to pass to the bootstrap action script.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 			</ul></li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <php:curl_setopt()>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function run_job_flow($name, $instances, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['Name'] = $name;

		// Collapse these list values for the required parameter
		if (isset($instances['InstanceGroups']))
		{
			$instances['InstanceGroups'] = CFComplexType::map(array(
				'member' => (is_array($instances['InstanceGroups']) ? $instances['InstanceGroups'] : array($instances['InstanceGroups']))
			));
		}

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'Instances' => (is_array($instances) ? $instances : array($instances))
		), 'member'));

		// Optional parameter
		if (isset($opt['Steps']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Steps' => $opt['Steps']
			), 'member'));
			unset($opt['Steps']);
		}

		// Optional parameter
		if (isset($opt['BootstrapActions']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'BootstrapActions' => $opt['BootstrapActions']
			), 'member'));
			unset($opt['BootstrapActions']);
		}

		return $this->authenticate('RunJobFlow', $opt, $this->hostname);
	}

	/**
	 *
	 * ModifyInstanceGroups modifies the number of nodes and configuration settings of an instance group. The input parameters include the new
	 * target instance count for the group and the instance group ID. The call will either succeed or fail atomically.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>InstanceGroups</code> - <code>array</code> - Optional - Instance groups to change. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>InstanceGroupId</code> - <code>string</code> - Required - Unique ID of the instance group to expand or shrink. </li>
	 * 			<li><code>InstanceCount</code> - <code>integer</code> - Required - Target size for the instance group. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <php:curl_setopt()>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function modify_instance_groups($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['InstanceGroups']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'InstanceGroups' => $opt['InstanceGroups']
			), 'member'));
			unset($opt['InstanceGroups']);
		}

		return $this->authenticate('ModifyInstanceGroups', $opt, $this->hostname);
	}
}


/*%******************************************************************************************%*/
// EXCEPTIONS

/**
 * Default EMR Exception.
 */
class EMR_Exception extends Exception {}