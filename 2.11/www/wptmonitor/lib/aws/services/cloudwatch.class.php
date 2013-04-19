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
 * This is the <i>Amazon CloudWatch API Reference</i>. This guide provides detailed information about Amazon CloudWatch actions, data types,
 * parameters, and errors. For detailed information about Amazon CloudWatch features and their associated API calls, go to the <a
 * href="http://docs.amazonwebservices.com/AmazonCloudWatch/latest/DeveloperGuide">Amazon CloudWatch Developer Guide</a>.
 *
 * Amazon CloudWatch is a web service that enables you to publish, monitor, and manage various metrics, as well as configure alarm actions
 * based on data from metrics. For more information about this product go to <a
 * href="http://aws.amazon.com/cloudwatch">http://aws.amazon.com/cloudwatch</a>.
 *
 * Use the following links to get started using the <i>Amazon CloudWatch API Reference</i>:
 *
 * <ul> <li> <a href="http://docs.amazonwebservices.com/AmazonCloudWatch/latest/APIReference/API_Operations.html">Actions</a>: An alphabetical
 * list of all Amazon CloudWatch actions.</li>
 *
 * <li> <a href="http://docs.amazonwebservices.com/AmazonCloudWatch/latest/APIReference/API_Types.html">Data Types</a>: An alphabetical list
 * of all Amazon CloudWatch data types.</li>
 *
 * <li> <a href="http://docs.amazonwebservices.com/AmazonCloudWatch/latest/APIReference/CommonParameters.html">Common Parameters</a>:
 * Parameters that all Query actions can use.</li>
 *
 * <li> <a href="http://docs.amazonwebservices.com/AmazonCloudWatch/latest/APIReference/CommonErrors.html">Common Errors</a>: Client and
 * server errors that all actions can return.</li>
 *
 * <li> <a href="http://docs.amazonwebservices.com/general/latest/gr/index.html?rande.html">Regions and Endpoints</a>: Itemized regions and
 * endpoints for all AWS products.</li>
 *
 * <li> <a href="http://monitoring.amazonaws.com/doc/2010-08-01/CloudWatch.wsdl">WSDL Location</a>:
 * http://monitoring.amazonaws.com/doc/2010-08-01/CloudWatch.wsdl</li>
 *
 * </ul>
 *
 * @version Thu Sep 01 21:18:18 PDT 2011
 * @license See the included NOTICE.md file for complete information.
 * @copyright See the included NOTICE.md file for complete information.
 * @link http://aws.amazon.com/cloudwatch/Amazon CloudWatch
 * @link http://aws.amazon.com/documentation/cloudwatch/Amazon CloudWatch documentation
 */
class AmazonCloudWatch extends CFRuntime
{

	/*%******************************************************************************************%*/
	// CLASS CONSTANTS

	/**
	 * Specify the default queue URL.
	 */
	const DEFAULT_URL = 'monitoring.amazonaws.com';

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
		$this->set_hostname('http://monitoring.'. $region .'.amazonaws.com');
		return $this;
	}


	/*%******************************************************************************************%*/
	// CONSTRUCTOR

	/**
	 * Constructs a new instance of <AmazonCloudWatch>.
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
			throw new CW_Exception('No account key was passed into the constructor, nor was it set in the AWS_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		if (!$secret_key && !defined('AWS_SECRET_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new CW_Exception('No account secret was passed into the constructor, nor was it set in the AWS_SECRET_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		return parent::__construct($key, $secret_key);
	}


	/*%******************************************************************************************%*/
	// SERVICE METHODS

	/**
	 *
	 * Creates or updates an alarm and associates it with the specified Amazon CloudWatch metric. Optionally, this operation can associate one or
	 * more Amazon Simple Notification Service resources with the alarm.
	 *
	 * When this operation creates an alarm, the alarm state is immediately set to <code>INSUFFICIENT_DATA</code>. The alarm is evaluated and its
	 * <code>StateValue</code> is set appropriately. Any actions associated with the <code>StateValue</code> is then executed.
	 *
	 * When updating an existing alarm, its <code>StateValue</code> is left unchanged.
	 *
	 * @param string $alarm_name (Required) The descriptive name for the alarm. This name must be unique within the user's AWS account
	 * @param string $metric_name (Required) The name for the alarm's associated metric.
	 * @param string $namespace (Required) The namespace for the alarm's associated metric.
	 * @param string $statistic (Required) The statistic to apply to the alarm's associated metric. [Allowed values: <code>SampleCount</code>, <code>Average</code>, <code>Sum</code>, <code>Minimum</code>, <code>Maximum</code>]
	 * @param integer $period (Required) The period in seconds over which the specified statistic is applied.
	 * @param integer $evaluation_periods (Required) The number of periods over which data is compared to the specified threshold.
	 * @param double $threshold (Required) The value against which the specified statistic is compared.
	 * @param string $comparison_operator (Required) The arithmetic operation to use when comparing the specified <code>Statistic</code> and <code>Threshold</code>. The specified <code>Statistic</code> value is used as the first operand. [Allowed values: <code>GreaterThanOrEqualToThreshold</code>, <code>GreaterThanThreshold</code>, <code>LessThanThreshold</code>, <code>LessThanOrEqualToThreshold</code>]
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>AlarmDescription</code> - <code>string</code> - Optional - The description for the alarm. </li>
	 * 	<li><code>ActionsEnabled</code> - <code>boolean</code> - Optional - Indicates whether or not actions should be executed during any changes to the alarm's state. </li>
	 * 	<li><code>OKActions</code> - <code>string|array</code> - Optional - The list of actions to execute when this alarm transitions into an <code>OK</code> state from any other state. Each action is specified as an Amazon Resource Number (ARN). Currently the only action supported is publishing to an Amazon SNS topic or an Amazon Auto Scaling policy.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>AlarmActions</code> - <code>string|array</code> - Optional - The list of actions to execute when this alarm transitions into an <code>ALARM</code> state from any other state. Each action is specified as an Amazon Resource Number (ARN). Currently the only action supported is publishing to an Amazon SNS topic or an Amazon Auto Scaling policy.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>InsufficientDataActions</code> - <code>string|array</code> - Optional - The list of actions to execute when this alarm transitions into an <code>INSUFFICIENT_DATA</code> state from any other state. Each action is specified as an Amazon Resource Number (ARN). Currently the only action supported is publishing to an Amazon SNS topic or an Amazon Auto Scaling policy.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>Dimensions</code> - <code>array</code> - Optional - The dimensions for the alarm's associated metric. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Required - The name of the dimension. </li>
	 * 			<li><code>Value</code> - <code>string</code> - Required - The value representing the dimension measurement </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>Unit</code> - <code>string</code> - Optional - The unit for the alarm's associated metric. [Allowed values: <code>Seconds</code>, <code>Microseconds</code>, <code>Milliseconds</code>, <code>Bytes</code>, <code>Kilobytes</code>, <code>Megabytes</code>, <code>Gigabytes</code>, <code>Terabytes</code>, <code>Bits</code>, <code>Kilobits</code>, <code>Megabits</code>, <code>Gigabits</code>, <code>Terabits</code>, <code>Percent</code>, <code>Count</code>, <code>Bytes/Second</code>, <code>Kilobytes/Second</code>, <code>Megabytes/Second</code>, <code>Gigabytes/Second</code>, <code>Terabytes/Second</code>, <code>Bits/Second</code>, <code>Kilobits/Second</code>, <code>Megabits/Second</code>, <code>Gigabits/Second</code>, <code>Terabits/Second</code>, <code>Count/Second</code>, <code>None</code>]</li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function put_metric_alarm($alarm_name, $metric_name, $namespace, $statistic, $period, $evaluation_periods, $threshold, $comparison_operator, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AlarmName'] = $alarm_name;

		// Optional parameter
		if (isset($opt['OKActions']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'OKActions' => (is_array($opt['OKActions']) ? $opt['OKActions'] : array($opt['OKActions']))
			), 'member'));
			unset($opt['OKActions']);
		}

		// Optional parameter
		if (isset($opt['AlarmActions']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'AlarmActions' => (is_array($opt['AlarmActions']) ? $opt['AlarmActions'] : array($opt['AlarmActions']))
			), 'member'));
			unset($opt['AlarmActions']);
		}

		// Optional parameter
		if (isset($opt['InsufficientDataActions']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'InsufficientDataActions' => (is_array($opt['InsufficientDataActions']) ? $opt['InsufficientDataActions'] : array($opt['InsufficientDataActions']))
			), 'member'));
			unset($opt['InsufficientDataActions']);
		}
		$opt['MetricName'] = $metric_name;
		$opt['Namespace'] = $namespace;
		$opt['Statistic'] = $statistic;

		// Optional parameter
		if (isset($opt['Dimensions']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Dimensions' => $opt['Dimensions']
			), 'member'));
			unset($opt['Dimensions']);
		}
		$opt['Period'] = $period;
		$opt['EvaluationPeriods'] = $evaluation_periods;
		$opt['Threshold'] = $threshold;
		$opt['ComparisonOperator'] = $comparison_operator;

		return $this->authenticate('PutMetricAlarm', $opt, $this->hostname);
	}

	/**
	 * Publishes metric data points to Amazon CloudWatch. Amazon Cloudwatch associates the data points with the specified metric. If the specified
	 * metric does not exist, Amazon CloudWatch creates the metric. If you create a metric with the <code>PutMetricData</code> action, allow up to
	 * fifteen minutes for the metric to appear in calls to the ListMetrics action.
	 *
	 * The size of a <code>PutMetricData</code> request is limited to 8 KB for HTTP GET requests and 40 KB for HTTP POST requests.
	 *
	 * Amazon CloudWatch truncates values with very large exponents. Values with base-10 exponents greater than 126 (1 x 10^126) are truncated.
	 * Likewise, values with base-10 exponents less than -130 (1 x 10^-130) are also truncated.
	 *
	 * @param string $namespace (Required) The namespace for the metric data. You cannot specify a namespace that begins with <code>AWS/</code>. Namespaces that begin with <code>AWS/</code> are reserved for other Amazon Web Services products that send metrics to Amazon CloudWatch.
	 * @param array $metric_data (Required) A list of data describing the metric. <ul>
	 * 	<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 		<li><code>MetricName</code> - <code>string</code> - Required - The name of the metric. </li>
	 * 		<li><code>Dimensions</code> - <code>array</code> - Optional - A list of dimensions associated with the metric. <ul>
	 * 			<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 				<li><code>Name</code> - <code>string</code> - Required - The name of the dimension. </li>
	 * 				<li><code>Value</code> - <code>string</code> - Required - The value representing the dimension measurement </li>
	 * 			</ul></li>
	 * 		</ul></li>
	 * 		<li><code>Timestamp</code> - <code>string</code> - Optional - The time stamp used for the metric. If not specified, the default value is set to the time the metric data was received. May be passed as a number of seconds since UNIX Epoch, or any string compatible with <php:strtotime()>.</li>
	 * 		<li><code>Value</code> - <code>integer</code> - Optional - The value for the metric. <important>Amazon CloudWatch truncates values with very large exponents. Values with base-10 exponents greater than 126 (1 x 10^126) are truncated. Likewise, values with base-10 exponents less than -130 (1 x 10^-130) are also truncated. </important> </li>
	 * 		<li><code>StatisticValues</code> - <code>array</code> - Optional - A set of statistical values describing the metric. Takes an associative array of parameters that can have the following keys: <ul>
	 * 			<li><code>SampleCount</code> - <code>double</code> - Required - The number of samples used for the statistic set. </li>
	 * 			<li><code>Sum</code> - <code>double</code> - Required - The sum of values for the sample set. </li>
	 * 			<li><code>Minimum</code> - <code>double</code> - Required - The minimum value of the sample set. </li>
	 * 			<li><code>Maximum</code> - <code>double</code> - Required - The maximum value of the sample set. </li>
	 * 		</ul></li>
	 * 		<li><code>Unit</code> - <code>string</code> - Optional - The unit of the metric. [Allowed values: <code>Seconds</code>, <code>Microseconds</code>, <code>Milliseconds</code>, <code>Bytes</code>, <code>Kilobytes</code>, <code>Megabytes</code>, <code>Gigabytes</code>, <code>Terabytes</code>, <code>Bits</code>, <code>Kilobits</code>, <code>Megabits</code>, <code>Gigabits</code>, <code>Terabits</code>, <code>Percent</code>, <code>Count</code>, <code>Bytes/Second</code>, <code>Kilobytes/Second</code>, <code>Megabytes/Second</code>, <code>Gigabytes/Second</code>, <code>Terabytes/Second</code>, <code>Bits/Second</code>, <code>Kilobits/Second</code>, <code>Megabits/Second</code>, <code>Gigabits/Second</code>, <code>Terabits/Second</code>, <code>Count/Second</code>, <code>None</code>]</li>
	 * 	</ul></li>
	 * </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function put_metric_data($namespace, $metric_data, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['Namespace'] = $namespace;

		// Handle Timestamps
		for ($i = 0, $max = count($metric_data); $i < $max; $i++)
		{
			if (isset($metric_data[$i]['Timestamp']))
			{
				$metric_data[$i]['Timestamp'] = $this->util->convert_date_to_iso8601($metric_data[$i]['Timestamp']);
			}
		}

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'MetricData' => (is_array($metric_data) ? $metric_data : array($metric_data))
		), 'member'));

		return $this->authenticate('PutMetricData', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns a list of valid metrics stored for the AWS account owner. Returned metrics can be used with GetMetricStatistics to obtain
	 * statistical data for a given metric.
	 *
	 * Up to 500 results are returned for any one call. To retrieve further results, use returned <code>NextToken</code> values with subsequent
	 * <code>ListMetrics</code> operations.
	 *
	 * If you create a metric with the PutMetricData action, allow up to fifteen minutes for the metric to appear in calls to the
	 * <code>ListMetrics</code> action. Statistics about the metric, however, are available sooner using GetMetricStatistics.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Namespace</code> - <code>string</code> - Optional - The namespace to filter against. </li>
	 * 	<li><code>MetricName</code> - <code>string</code> - Optional - The name of the metric to filter against. </li>
	 * 	<li><code>Dimensions</code> - <code>array</code> - Optional - A list of dimensions to filter against. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Required - The dimension name to be matched. </li>
	 * 			<li><code>Value</code> - <code>string</code> - Optional - The value of the dimension to be matched. Specifying a <code>Name</code> without specifying a <code>Value</code> returns all values associated with that <code>Name</code>. </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>NextToken</code> - <code>string</code> - Optional - The token returned by a previous call to indicate that there is more data available. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function list_metrics($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['Dimensions']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Dimensions' => $opt['Dimensions']
			), 'member'));
			unset($opt['Dimensions']);
		}

		return $this->authenticate('ListMetrics', $opt, $this->hostname);
	}

	/**
	 *
	 * Gets statistics for the specified metric.
	 *
	 * The maximum number of data points returned from a single <code>GetMetricStatistics</code> request is 1,440. If a request is made that
	 * generates more than 1,440 data points, Amazon CloudWatch returns an error. In such a case, alter the request by narrowing the specified time
	 * range or increasing the specified period. Alternatively, make multiple requests across adjacent time ranges.
	 *
	 * Amazon CloudWatch aggregates data points based on the length of the <code>period</code> that you specify. For example, if you request
	 * statistics with a one-minute granularity, Amazon CloudWatch aggregates data points with time stamps that fall within the same one-minute
	 * period. In such a case, the data points queried can greatly outnumber the data points returned.
	 *
	 * The maximum number of data points that can be queried is 50,850; whereas the maximum number of data points returned is 1,440.
	 *
	 * The following examples show various statistics allowed by the data point query maximum of 50,850 when you call
	 * <code>GetMetricStatistics</code> on Amazon EC2 instances with detailed (one-minute) monitoring enabled:
	 *
	 * <ul> <li>Statistics for up to 400 instances for a span of one hour</li>
	 *
	 * <li>Statistics for up to 35 instances over a span of 24 hours</li>
	 *
	 * <li>Statistics for up to 2 instances over a span of 2 weeks</li>
	 *
	 * </ul>
	 *
	 * @param string $namespace (Required) The namespace of the metric.
	 * @param string $metric_name (Required) The name of the metric.
	 * @param string $start_time (Required) The time stamp to use for determining the first datapoint to return. The value specified is inclusive; results include datapoints with the time stamp specified. The specified start time is rounded down to the nearest value. Datapoints are returned for start times up to two weeks in the past. Specified start times that are more than two weeks in the past will not return datapoints for metrics that are older than two weeks. Accepts any value that <php:strtotime()> understands.
	 * @param string $end_time (Required) The time stamp to use for determining the last datapoint to return. The value specified is exclusive; results will include datapoints up to the time stamp specified. Accepts any value that <php:strtotime()> understands.
	 * @param integer $period (Required) The granularity, in seconds, of the returned datapoints. <code>Period</code> must be at least 60 seconds and must be a multiple of 60. The default value is 60.
	 * @param string|array $statistics (Required) The metric statistics to return.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param string $unit (Required) The unit for the metric. [Allowed values: <code>Seconds</code>, <code>Microseconds</code>, <code>Milliseconds</code>, <code>Bytes</code>, <code>Kilobytes</code>, <code>Megabytes</code>, <code>Gigabytes</code>, <code>Terabytes</code>, <code>Bits</code>, <code>Kilobits</code>, <code>Megabits</code>, <code>Gigabits</code>, <code>Terabits</code>, <code>Percent</code>, <code>Count</code>, <code>Bytes/Second</code>, <code>Kilobytes/Second</code>, <code>Megabytes/Second</code>, <code>Gigabytes/Second</code>, <code>Terabytes/Second</code>, <code>Bits/Second</code>, <code>Kilobits/Second</code>, <code>Megabits/Second</code>, <code>Gigabits/Second</code>, <code>Terabits/Second</code>, <code>Count/Second</code>, <code>None</code>]
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Dimensions</code> - <code>array</code> - Optional - A list of dimensions describing qualities of the metric. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Required - The name of the dimension. </li>
	 * 			<li><code>Value</code> - <code>string</code> - Required - The value representing the dimension measurement </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function get_metric_statistics($namespace, $metric_name, $start_time, $end_time, $period, $statistics, $unit, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['Namespace'] = $namespace;
		$opt['MetricName'] = $metric_name;

		// Optional parameter
		if (isset($opt['Dimensions']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Dimensions' => $opt['Dimensions']
			), 'member'));
			unset($opt['Dimensions']);
		}
		$opt['StartTime'] = $this->util->convert_date_to_iso8601($start_time);
		$opt['EndTime'] = $this->util->convert_date_to_iso8601($end_time);
		$opt['Period'] = $period;

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'Statistics' => (is_array($statistics) ? $statistics : array($statistics))
		), 'member'));
		$opt['Unit'] = $unit;

		return $this->authenticate('GetMetricStatistics', $opt, $this->hostname);
	}

	/**
	 *
	 * Disables actions for the specified alarms. When an alarm's actions are disabled the alarm's state may change, but none of the alarm's
	 * actions will execute.
	 *
	 * @param string|array $alarm_names (Required) The names of the alarms to disable actions for.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function disable_alarm_actions($alarm_names, $opt = null)
	{
		if (!$opt) $opt = array();

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'AlarmNames' => (is_array($alarm_names) ? $alarm_names : array($alarm_names))
		), 'member'));

		return $this->authenticate('DisableAlarmActions', $opt, $this->hostname);
	}

	/**
	 *
	 * Retrieves alarms with the specified names. If no name is specified, all alarms for the user are returned. Alarms can be retrieved by using
	 * only a prefix for the alarm name, the alarm state, or a prefix for any action.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>AlarmNames</code> - <code>string|array</code> - Optional - A list of alarm names to retrieve information for.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>AlarmNamePrefix</code> - <code>string</code> - Optional - The alarm name prefix. <code>AlarmNames</code> cannot be specified if this parameter is specified. </li>
	 * 	<li><code>StateValue</code> - <code>string</code> - Optional - The state value to be used in matching alarms. [Allowed values: <code>OK</code>, <code>ALARM</code>, <code>INSUFFICIENT_DATA</code>]</li>
	 * 	<li><code>ActionPrefix</code> - <code>string</code> - Optional - The action name prefix. </li>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of alarm descriptions to retrieve. </li>
	 * 	<li><code>NextToken</code> - <code>string</code> - Optional - The token returned by a previous call to indicate that there is more data available. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_alarms($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['AlarmNames']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'AlarmNames' => (is_array($opt['AlarmNames']) ? $opt['AlarmNames'] : array($opt['AlarmNames']))
			), 'member'));
			unset($opt['AlarmNames']);
		}

		return $this->authenticate('DescribeAlarms', $opt, $this->hostname);
	}

	/**
	 *
	 * Retrieves all alarms for a single metric. Specify a statistic, period, or unit to filter the set of alarms further.
	 *
	 * @param string $metric_name (Required) The name of the metric.
	 * @param string $namespace (Required) The namespace of the metric.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Statistic</code> - <code>string</code> - Optional - The statistic for the metric. [Allowed values: <code>SampleCount</code>, <code>Average</code>, <code>Sum</code>, <code>Minimum</code>, <code>Maximum</code>]</li>
	 * 	<li><code>Dimensions</code> - <code>array</code> - Optional - The list of dimensions associated with the metric. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Required - The name of the dimension. </li>
	 * 			<li><code>Value</code> - <code>string</code> - Required - The value representing the dimension measurement </li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>Period</code> - <code>integer</code> - Optional - The period in seconds over which the statistic is applied. </li>
	 * 	<li><code>Unit</code> - <code>string</code> - Optional - The unit for the metric. [Allowed values: <code>Seconds</code>, <code>Microseconds</code>, <code>Milliseconds</code>, <code>Bytes</code>, <code>Kilobytes</code>, <code>Megabytes</code>, <code>Gigabytes</code>, <code>Terabytes</code>, <code>Bits</code>, <code>Kilobits</code>, <code>Megabits</code>, <code>Gigabits</code>, <code>Terabits</code>, <code>Percent</code>, <code>Count</code>, <code>Bytes/Second</code>, <code>Kilobytes/Second</code>, <code>Megabytes/Second</code>, <code>Gigabytes/Second</code>, <code>Terabytes/Second</code>, <code>Bits/Second</code>, <code>Kilobits/Second</code>, <code>Megabits/Second</code>, <code>Gigabits/Second</code>, <code>Terabits/Second</code>, <code>Count/Second</code>, <code>None</code>]</li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_alarms_for_metric($metric_name, $namespace, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['MetricName'] = $metric_name;
		$opt['Namespace'] = $namespace;

		// Optional parameter
		if (isset($opt['Dimensions']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Dimensions' => $opt['Dimensions']
			), 'member'));
			unset($opt['Dimensions']);
		}

		return $this->authenticate('DescribeAlarmsForMetric', $opt, $this->hostname);
	}

	/**
	 *
	 * Retrieves history for the specified alarm. Filter alarms by date range or item type. If an alarm name is not specified, Amazon CloudWatch
	 * returns histories for all of the owner's alarms.
	 *
	 * Amazon CloudWatch retains the history of an alarm for two weeks, whether or not you delete the alarm.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>AlarmName</code> - <code>string</code> - Optional - The name of the alarm. </li>
	 * 	<li><code>HistoryItemType</code> - <code>string</code> - Optional - The type of alarm histories to retrieve. [Allowed values: <code>ConfigurationUpdate</code>, <code>StateUpdate</code>, <code>Action</code>]</li>
	 * 	<li><code>StartDate</code> - <code>string</code> - Optional - The starting date to retrieve alarm history. May be passed as a number of seconds since UNIX Epoch, or any string compatible with <php:strtotime()>.</li>
	 * 	<li><code>EndDate</code> - <code>string</code> - Optional - The ending date to retrieve alarm history. May be passed as a number of seconds since UNIX Epoch, or any string compatible with <php:strtotime()>.</li>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of alarm history records to retrieve. </li>
	 * 	<li><code>NextToken</code> - <code>string</code> - Optional - The token returned by a previous call to indicate that there is more data available. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_alarm_history($opt = null)
	{
		if (!$opt) $opt = array();

		// Optional parameter
		if (isset($opt['StartDate']))
		{
			$opt['StartDate'] = $this->util->convert_date_to_iso8601($opt['StartDate']);
		}

		// Optional parameter
		if (isset($opt['EndDate']))
		{
			$opt['EndDate'] = $this->util->convert_date_to_iso8601($opt['EndDate']);
		}

		return $this->authenticate('DescribeAlarmHistory', $opt, $this->hostname);
	}

	/**
	 *
	 * Enables actions for the specified alarms.
	 *
	 * @param string|array $alarm_names (Required) The names of the alarms to enable actions for.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function enable_alarm_actions($alarm_names, $opt = null)
	{
		if (!$opt) $opt = array();

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'AlarmNames' => (is_array($alarm_names) ? $alarm_names : array($alarm_names))
		), 'member'));

		return $this->authenticate('EnableAlarmActions', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes all specified alarms. In the event of an error, no alarms are deleted.
	 *
	 * @param string|array $alarm_names (Required) A list of alarms to be deleted.  Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_alarms($alarm_names, $opt = null)
	{
		if (!$opt) $opt = array();

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'AlarmNames' => (is_array($alarm_names) ? $alarm_names : array($alarm_names))
		), 'member'));

		return $this->authenticate('DeleteAlarms', $opt, $this->hostname);
	}

	/**
	 *
	 * Temporarily sets the state of an alarm. When the updated <code>StateValue</code> differs from the previous value, the action configured for
	 * the appropriate state is invoked. This is not a permanent change. The next periodic alarm check (in about a minute) will set the alarm to
	 * its actual state.
	 *
	 * @param string $alarm_name (Required) The descriptive name for the alarm. This name must be unique within the user's AWS account. The maximum length is 255 characters.
	 * @param string $state_value (Required) The value of the state. [Allowed values: <code>OK</code>, <code>ALARM</code>, <code>INSUFFICIENT_DATA</code>]
	 * @param string $state_reason (Required) The reason that this alarm is set to this specific state (in human-readable text format)
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>StateReasonData</code> - <code>string</code> - Optional - The reason that this alarm is set to this specific state (in machine-readable JSON format) </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function set_alarm_state($alarm_name, $state_value, $state_reason, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['AlarmName'] = $alarm_name;
		$opt['StateValue'] = $state_value;
		$opt['StateReason'] = $state_reason;

		return $this->authenticate('SetAlarmState', $opt, $this->hostname);
	}
}


/*%******************************************************************************************%*/
// EXCEPTIONS

/**
 * Default CloudWatch Exception.
 */
class CloudWatch_Exception extends Exception {}