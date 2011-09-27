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
 * Amazon Relational Database Service (Amazon RDS) is a web service that makes it easier to set up, operate, and scale a relational database
 * in the cloud. It provides cost-efficient, resizable capacity for an industry-standard relational database and manages common database
 * administration tasks, freeing up developers to focus on what makes their applications and businesses unique.
 *
 * Amazon RDS gives you access to the capabilities of a familiar MySQL or Oracle database server. This means the code, applications, and tools
 * you already use today with your existing MySQL or Oracle databases work with Amazon RDS without modification. Amazon RDS automatically backs
 * up your database and maintains the database software that powers your DB Instance. Amazon RDS is flexible: you can scale your database
 * instance's compute resources and storage capacity to meet your application's demand. As with all Amazon Web Services, there are no up-front
 * investments, and you pay only for the resources you use.
 *
 * @version Thu Sep 01 21:22:55 PDT 2011
 * @license See the included NOTICE.md file for complete information.
 * @copyright See the included NOTICE.md file for complete information.
 * @link http://aws.amazon.com/rds/Amazon Relational Database Service
 * @link http://aws.amazon.com/documentation/rds/Amazon Relational Database Service documentation
 */
class AmazonRDS extends CFRuntime
{

	/*%******************************************************************************************%*/
	// CLASS CONSTANTS

	/**
	 * Specify the default queue URL.
	 */
	const DEFAULT_URL = 'rds.us-east-1.amazonaws.com';

	/**
	 * Specify the queue URL for the US-East (Northern Virginia) Region.
	 */
	const REGION_US_E1 = self::DEFAULT_URL;

	/**
	 * Specify the queue URL for the US-West (Northern California) Region.
	 */
	const REGION_US_W1 = 'rds.us-west-1.amazonaws.com';

	/**
	 * Specify the queue URL for the EU (Ireland) Region.
	 */
	const REGION_EU_W1 = 'rds.eu-west-1.amazonaws.com';

	/**
	 * Specify the queue URL for the Asia Pacific (Singapore) Region.
	 */
	const REGION_APAC_SE1 = 'rds.ap-southeast-1.amazonaws.com';

	/**
	 * Specify the queue URL for the Asia Pacific (Japan) Region.
	 */
	const REGION_APAC_NE1 = 'rds.ap-northeast-1.amazonaws.com';


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
	 * Constructs a new instance of <AmazonRDS>.
	 *
	 * @param string $key (Optional) Your Amazon API Key. If blank, it will look for the <code>AWS_KEY</code> constant.
	 * @param string $secret_key (Optional) Your Amazon API Secret Key. If blank, it will look for the <code>AWS_SECRET_KEY</code> constant.
	 * @return boolean false if no valid values are set, otherwise true.
	 */
	public function __construct($key = null, $secret_key = null)
	{
		$this->api_version = '2011-04-01';
		$this->hostname = self::DEFAULT_URL;

		if (!$key && !defined('AWS_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new RDS_Exception('No account key was passed into the constructor, nor was it set in the AWS_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		if (!$secret_key && !defined('AWS_SECRET_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new RDS_Exception('No account secret was passed into the constructor, nor was it set in the AWS_SECRET_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		return parent::__construct($key, $secret_key);
	}


	/*%******************************************************************************************%*/
	// SERVICE METHODS

	/**
	 *
	 * Returns information about provisioned RDS instances. This API supports pagination.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>DBInstanceIdentifier</code> - <code>string</code> - Optional - The user-supplied instance identifier. If this parameter is specified, information from only the specific DB Instance is returned. This parameter isn't case sensitive. Constraints: <ul> <li>Must contain from 1 to 63 alphanumeric characters or hyphens</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul> </li>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of records to include in the response. If more records exist than the specified <code>MaxRecords</code> value, a marker is included in the response so that the remaining results may be retrieved. Default: 100 Constraints: minimum 20, maximum 100 </li>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - An optional marker provided in the previous DescribeDBInstances request. If this parameter is specified, the response includes only records beyond the marker, up to the value specified by <code>MaxRecords</code> . </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_db_instances($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('DescribeDBInstances', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns events related to DB Instances, DB Security Groups, DB Snapshots and DB Parameter Groups for the past 14 days. Events specific to a
	 * particular DB Instance, database security group, database snapshot or database parameter group can be obtained by providing the name as a
	 * parameter. By default, the past hour of events are returned.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>SourceIdentifier</code> - <code>string</code> - Optional - The identifier of the event source for which events will be returned. If not specified, then all sources are included in the response. Constraints: <ul> <li>If SourceIdentifier is supplied, SourceType must also be provided.</li><li>If the source type is DBInstance, then a DBInstanceIdentifier must be supplied.</li><li>If the source type is DBSecurityGroup, a DBSecurityGroupName must be supplied.</li><li>If the source type is DBParameterGroup, a DBParameterGroupName must be supplied.</li><li>If the source type is DBSnapshot, a DBSnapshotIdentifier must be supplied.</li><li>Cannot end with a hyphen or contain two consecutive hyphens.</li> </ul> </li>
	 * 	<li><code>SourceType</code> - <code>string</code> - Optional - The event source to retrieve events for. If no value is specified, all events are returned. [Allowed values: <code>db-instance</code>, <code>db-parameter-group</code>, <code>db-security-group</code>, <code>db-snapshot</code>]</li>
	 * 	<li><code>StartTime</code> - <code>string</code> - Optional - The beginning of the time interval to retrieve events for, specified in ISO 8601 format. For more information about ISO 8601, go to the ISO8601 Wikipedia page. Example: 2009-07-08T18:00Z May be passed as a number of seconds since UNIX Epoch, or any string compatible with <php:strtotime()>.</li>
	 * 	<li><code>EndTime</code> - <code>string</code> - Optional - The end of the time interval for which to retrieve events, specified in ISO 8601 format. For more information about ISO 8601, go to the ISO8601 Wikipedia page. Example: 2009-07-08T18:00Z May be passed as a number of seconds since UNIX Epoch, or any string compatible with <php:strtotime()>.</li>
	 * 	<li><code>Duration</code> - <code>integer</code> - Optional - The number of minutes to retrieve events for. Default: 60 </li>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of records to include in the response. If more records exist than the specified <code>MaxRecords</code> value, a marker is included in the response so that the remaining results may be retrieved. Default: 100 Constraints: minimum 20, maximum 100 </li>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - An optional marker provided in the previous DescribeDBInstances request. If this parameter is specified, the response includes only records beyond the marker, up to the value specified by <code>MaxRecords</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_events($opt = null)
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

		return $this->authenticate('DescribeEvents', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns the detailed parameter list for a particular DBParameterGroup.
	 *
	 * @param string $db_parameter_group_name (Required) The name of a specific database parameter group to return details for. Constraints: <ul> <li>Must be 1 to 255 alphanumeric characters</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Source</code> - <code>string</code> - Optional - The parameter types to return. Default: All parameter types returned Valid Values: <code>user | system | engine-default</code> </li>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of records to include in the response. If more records exist than the specified <code>MaxRecords</code> value, a marker is included in the response so that the remaining results may be retrieved. Default: 100 Constraints: minimum 20, maximum 100 </li>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - An optional marker provided in the previous DescribeDBInstances request. If this parameter is specified, the response includes only records beyond the marker, up to the value specified by <code>MaxRecords</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_db_parameters($db_parameter_group_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DBParameterGroupName'] = $db_parameter_group_name;

		return $this->authenticate('DescribeDBParameters', $opt, $this->hostname);
	}

	/**
	 *
	 * Enables ingress to a DBSecurityGroup using one of two forms of authorization. First, EC2 Security Groups can be added to the
	 * DBSecurityGroup if the application using the database is running on EC2 instances. Second, IP ranges are available if the application
	 * accessing your database is running on the Internet. Required parameters for this API are one of CIDR range or (EC2SecurityGroupName AND
	 * EC2SecurityGroupOwnerId).
	 *
	 * You cannot authorize ingress from an EC2 security group in one Region to an Amazon RDS DB Instance in another.
	 *
	 * For an overview of CIDR ranges, go to the <a href="http://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing">Wikipedia Tutorial</a>.
	 *
	 * @param string $db_security_group_name (Required) The name of the DB Security Group to authorize.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>CIDRIP</code> - <code>string</code> - Optional - The IP range to authorize. </li>
	 * 	<li><code>EC2SecurityGroupName</code> - <code>string</code> - Optional - Name of the EC2 Security Group to authorize. </li>
	 * 	<li><code>EC2SecurityGroupOwnerId</code> - <code>string</code> - Optional - AWS Account Number of the owner of the security group specified in the EC2SecurityGroupName parameter. The AWS Access Key ID is not an acceptable value. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function authorize_db_security_group_ingress($db_security_group_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DBSecurityGroupName'] = $db_security_group_name;

		return $this->authenticate('AuthorizeDBSecurityGroupIngress', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns a list of DBSecurityGroup descriptions. If a DBSecurityGroupName is specified, the list will contain only the descriptions of the
	 * specified DBSecurityGroup.
	 *
	 * For an overview of CIDR ranges, go to the <a href="http://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing">Wikipedia Tutorial</a>.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>DBSecurityGroupName</code> - <code>string</code> - Optional - The name of the DB Security Group to return details for. </li>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of records to include in the response. If more records exist than the specified <code>MaxRecords</code> value, a marker is included in the response so that the remaining results may be retrieved. Default: 100 Constraints: minimum 20, maximum 100 </li>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - An optional marker provided in the previous DescribeDBInstances request. If this parameter is specified, the response includes only records beyond the marker, up to the value specified by <code>MaxRecords</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_db_security_groups($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('DescribeDBSecurityGroups', $opt, $this->hostname);
	}

	/**
	 *
	 * Modifies the parameters of a DBParameterGroup to the engine/system default value. To reset specific parameters submit a list of the
	 * following: ParameterName and ApplyMethod. To reset the entire DBParameterGroup specify the DBParameterGroup name and ResetAllParameters
	 * parameters. When resetting the entire group, dynamic parameters are updated immediately and static parameters are set to pending-reboot to
	 * take effect on the next DB instance restart or RebootDBInstance request.
	 *
	 * @param string $db_parameter_group_name (Required) The name of the DB Parameter Group. Constraints: <ul> <li>Must be 1 to 255 alphanumeric characters</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>ResetAllParameters</code> - <code>boolean</code> - Optional - Specifies whether (<code>true</code>) or not (<code>false</code>) to reset all parameters in the DB Parameter Group to default values. Default: <code>true</code> </li>
	 * 	<li><code>Parameters</code> - <code>array</code> - Optional - An array of parameter names, values, and the apply method for the parameter update. At least one parameter name, value, and apply method must be supplied; subsequent arguments are optional. A maximum of 20 parameters may be modified in a single request. <b>MySQL</b> Valid Values (for Apply method): <code>immediate</code> | <code>pending-reboot</code> You can use the immediate value with dynamic parameters only. You can use the <code>pending-reboot</code> value for both dynamic and static parameters, and changes are applied when DB Instance reboots. <b>Oracle</b> Valid Values (for Apply method): <code>pending-reboot</code> <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>ParameterName</code> - <code>string</code> - Optional - Specifies the name of the parameter. </li>
	 * 			<li><code>ParameterValue</code> - <code>string</code> - Optional - Specifies the value of the parameter. </li>
	 * 			<li><code>Description</code> - <code>string</code> - Optional - Provides a description of the parameter. </li>
	 * 			<li><code>Source</code> - <code>string</code> - Optional - Indicates the source of the parameter value. </li>
	 * 			<li><code>ApplyType</code> - <code>string</code> - Optional - Specifies the engine specific parameters type. </li>
	 * 			<li><code>DataType</code> - <code>string</code> - Optional - Specifies the valid data type for the parameter. </li>
	 * 			<li><code>AllowedValues</code> - <code>string</code> - Optional - Specifies the valid range of values for the parameter. </li>
	 * 			<li><code>IsModifiable</code> - <code>boolean</code> - Optional - Indicates whether (<code>true</code>) or not (<code>false</code>) the parameter can be modified. Some parameters have security or operational implications that prevent them from being changed. </li>
	 * 			<li><code>MinimumEngineVersion</code> - <code>string</code> - Optional - The earliest engine version to which the parameter can apply. </li>
	 * 			<li><code>ApplyMethod</code> - <code>string</code> - Optional - Indicates when to apply parameter updates. [Allowed values: <code>immediate</code>, <code>pending-reboot</code>]</li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function reset_db_parameter_group($db_parameter_group_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DBParameterGroupName'] = $db_parameter_group_name;

		// Optional parameter
		if (isset($opt['Parameters']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Parameters' => $opt['Parameters']
			), 'member'));
			unset($opt['Parameters']);
		}

		return $this->authenticate('ResetDBParameterGroup', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a new DB Instance from a point-in-time system snapshot. The target database is created from the source database restore point with
	 * the same configuration as the original source database, except that the new RDS instance is created with the default security group.
	 *
	 * @param string $source_db_instance_identifier (Required) The identifier of the source DB Instance from which to restore. Constraints: <ul> <li>Must be the identifier of an existing database instance</li><li>Must contain from 1 to 63 alphanumeric characters or hyphens</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul>
	 * @param string $target_db_instance_identifier (Required) The name of the new database instance to be created. Constraints: <ul> <li>Must contain from 1 to 63 alphanumeric characters or hyphens</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>RestoreTime</code> - <code>string</code> - Optional - The date and time from to restore from. Valid Values: Value must be a UTC time Constraints: <ul> <li>Must be after the latest restorable time for the DB Instance</li><li>Cannot be specified if UseLatestRestorableTime parameter is true</li> </ul> Example: <code>2009-09-07T23:45:00Z</code> May be passed as a number of seconds since UNIX Epoch, or any string compatible with <php:strtotime()>.</li>
	 * 	<li><code>UseLatestRestorableTime</code> - <code>boolean</code> - Optional - Specifies whether (<code>true</code>) or not (<code>false</code>) the DB Instance is restored from the latest backup time. Default: <code>false</code> Constraints: Cannot be specified if RestoreTime parameter is provided. </li>
	 * 	<li><code>DBInstanceClass</code> - <code>string</code> - Optional - The compute and memory capacity of the Amazon RDS DB instance. Valid Values: <code>db.m1.small | db.m1.large | db.m1.xlarge | db.m2.2xlarge | db.m2.4xlarge</code> Default: The same DBInstanceClass as the original DB Instance. </li>
	 * 	<li><code>Port</code> - <code>integer</code> - Optional - The port number on which the database accepts connections. Constraints: Value must be <code>1115-65535</code> Default: The same port as the original DB Instance. </li>
	 * 	<li><code>AvailabilityZone</code> - <code>string</code> - Optional - The EC2 Availability Zone that the database instance will be created in. Default: A random, system-chosen Availability Zone. Constraint: You cannot specify the AvailabilityZone parameter if the MultiAZ parameter is set to true. Example: <code>us-east-1a</code> </li>
	 * 	<li><code>MultiAZ</code> - <code>boolean</code> - Optional - Specifies if the DB Instance is a Multi-AZ deployment. Constraint: You cannot specify the AvailabilityZone parameter if the MultiAZ parameter is set to <code>true</code>. </li>
	 * 	<li><code>AutoMinorVersionUpgrade</code> - <code>boolean</code> - Optional - Indicates that minor version upgrades will be applied automatically to the DB Instance during the maintenance window. </li>
	 * 	<li><code>LicenseModel</code> - <code>string</code> - Optional - License model information for the restored DB Instance. Default: Same as source. Valid values: <code>license-included</code> | <code>bring-your-own-license</code> | <code>general-public-license</code> </li>
	 * 	<li><code>DBName</code> - <code>string</code> - Optional - The database name for the restored DB Instance. This parameter is not used for the MySQL engine. </li>
	 * 	<li><code>Engine</code> - <code>string</code> - Optional - The database engine to use for the new instance. Default: The same as source Constraint: Must be compatible with the engine of the source Example: <code>oracle-ee</code> </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function restore_db_instance_to_point_in_time($source_db_instance_identifier, $target_db_instance_identifier, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['SourceDBInstanceIdentifier'] = $source_db_instance_identifier;
		$opt['TargetDBInstanceIdentifier'] = $target_db_instance_identifier;

		// Optional parameter
		if (isset($opt['RestoreTime']))
		{
			$opt['RestoreTime'] = $this->util->convert_date_to_iso8601($opt['RestoreTime']);
		}

		return $this->authenticate('RestoreDBInstanceToPointInTime', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns a list of the available DB engines.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Engine</code> - <code>string</code> - Optional - The database engine to return. </li>
	 * 	<li><code>EngineVersion</code> - <code>string</code> - Optional - The database engine version to return. Example: <code>5.1.49</code> </li>
	 * 	<li><code>DBParameterGroupFamily</code> - <code>string</code> - Optional - The name of a specific database parameter group family to return details for. Constraints: <ul> <li>Must be 1 to 255 alphanumeric characters</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul> </li>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of records to include in the response. If more than the <code>MaxRecords</code> value is available, a marker is included in the response so that the following results can be retrieved. Default: 100 Constraints: minimum 20, maximum 100 </li>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - The marker provided in the previous request. If this parameter is specified, the response includes records beyond the marker only, up to <code>MaxRecords</code>. </li>
	 * 	<li><code>DefaultOnly</code> - <code>boolean</code> - Optional - Indicates that only the default version of the specified engine or engine and major version combination is returned. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_db_engine_versions($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('DescribeDBEngineVersions', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a new database parameter group.
	 *
	 * @param string $db_parameter_group_name (Required) The name of the DB Parameter Group. Constraints: <ul> <li>Must be 1 to 255 alphanumeric characters</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul> This value is stored as a lower-case string.
	 * @param string $db_parameter_group_family (Required) The DB parameter group family name. A DB parameter group can be associated with one and only one DB parameter group family, and can be applied only to a DB instance running a database engine compatible with that DB parameter group family and version.
	 * @param string $description (Required) The description for the DB Parameter Group.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_db_parameter_group($db_parameter_group_name, $db_parameter_group_family, $description, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DBParameterGroupName'] = $db_parameter_group_name;
		$opt['DBParameterGroupFamily'] = $db_parameter_group_family;
		$opt['Description'] = $description;

		return $this->authenticate('CreateDBParameterGroup', $opt, $this->hostname);
	}

	/**
	 *
	 * Modify settings for a DB Instance. You can change one or more database configuration parameters by specifying these parameters and the new
	 * values in the request.
	 *
	 * @param string $db_instance_identifier (Required) The DB Instance identifier. This value is stored as a lowercase string. Constraints: <ul> <li>Must be the identifier for an existing DB Instance</li><li>Must contain from 1 to 63 alphanumeric characters or hyphens</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul> Example: <copy>mydbinstance</copy>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>AllocatedStorage</code> - <code>integer</code> - Optional - The new storage capacity of the RDS instance. This change does not result in an outage and is applied during the next maintenance window unless the <code>ApplyImmediately</code> parameter is specified as <code>true</code> for this request. <b>MySQL</b> Default: Uses existing setting Valid Values: 5-1024 Constraints: Value supplied must be at least 10% greater than the current value. Values that are not at least 10% greater than the existing value are rounded up so that they are 10% greater than the current value. Type: Integer <b>MySQL</b> Default: Uses existing setting Valid Values: 10-1024 Constraints: Value supplied must be at least 10% greater than the current value. Values that are not at least 10% greater than the existing value are rounded up so that they are 10% greater than the current value. </li>
	 * 	<li><code>DBInstanceClass</code> - <code>string</code> - Optional - The new compute and memory capacity of the DB Instance. Passing a value for this parameter causes an outage during the change and is applied during the next maintenance window, unless the <code>ApplyImmediately</code> parameter is specified as <code>true</code> for this request. Default: Uses existing setting Valid Values: <code>db.m1.small | db.m1.large | db.m1.xlarge | db.m2.xlarge | db.m2.2xlarge | db.m2.4xlarge</code> </li>
	 * 	<li><code>DBSecurityGroups</code> - <code>string|array</code> - Optional - A list of DB Security Groups to authorize on this DB Instance. This change is asynchronously applied as soon as possible. Constraints: <ul> <li>Must be 1 to 255 alphanumeric characters</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul>  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>ApplyImmediately</code> - <code>boolean</code> - Optional - Specifies whether or not the modifications in this request and any pending modifications are asynchronously applied as soon as possible, regardless of the <code>PreferredMaintenanceWindow</code> setting for the DB Instance. If this parameter is passed as <code>false</code>, changes to the DB Instance are applied on the next call to RebootDBInstance, the next maintenance reboot, or the next failure reboot, whichever occurs first. Default: <code>false</code> </li>
	 * 	<li><code>MasterUserPassword</code> - <code>string</code> - Optional - The new password for the DB Instance master user. This change is asynchronously applied as soon as possible. Between the time of the request and the completion of the request, the <code>MasterUserPassword</code> element exists in the <code>PendingModifiedValues</code> element of the operation response. Default: Uses existing setting Constraints: Must be 4 to 41 alphanumeric characters (engine specific) Amazon RDS APIs never return the password, so this API provides a way to regain access to a master instance user if the password is lost. </li>
	 * 	<li><code>DBParameterGroupName</code> - <code>string</code> - Optional - The name of the DB Parameter Group to apply to this DB Instance. This change is asynchronously applied as soon as possible for parameters when the <i>ApplyImmediately</i> parameter is specified as <code>true</code> for this request. Default: Uses existing setting Constraints: The DB Parameter Group must be in the same DB Parameter Group family as this DB Instance. </li>
	 * 	<li><code>BackupRetentionPeriod</code> - <code>integer</code> - Optional - The number of days to retain automated backups. Setting this parameter to a positive number enables backups. Setting this parameter to 0 disables automated backups. Default: Uses existing setting Constraints: <ul> <li>Must be a value from 0 to 8</li><li>Cannot be set to 0 if the DB Instance is a master instance with read replicas or of the DB Instance is a read replica</li> </ul> </li>
	 * 	<li><code>PreferredBackupWindow</code> - <code>string</code> - Optional - The daily time range during which automated backups are created if automated backups are enabled, as determined by the <code>BackupRetentionPeriod</code>. Constraints: <ul> <li>Must be in the format hh24:mi-hh24:mi</li><li>Times should be Universal Time Coordinated (UTC)</li><li>Must not conflict with the preferred maintenance window</li><li>Must be at least 30 minutes</li> </ul> </li>
	 * 	<li><code>PreferredMaintenanceWindow</code> - <code>string</code> - Optional - The weekly time range (in UTC) during which system maintenance can occur, which may result in an outage. This change is made immediately. If moving this window to the current time, there must be at least 120 minutes between the current time and end of the window to ensure pending changes are applied. Default: Uses existing setting Format: ddd:hh24:mi-ddd:hh24:mi Valid Days: Mon | Tue | Wed | Thu | Fri | Sat | Sun Constraints: Must be at least 30 minutes </li>
	 * 	<li><code>MultiAZ</code> - <code>boolean</code> - Optional - Specifies if the DB Instance is a Multi-AZ deployment. Constraints: Cannot be specified if the DB Instance is a read replica. </li>
	 * 	<li><code>EngineVersion</code> - <code>string</code> - Optional - The version number of the database engine to upgrade to. For major version upgrades, if a nondefault DB Parameter Group is currently in use, a new DB Parameter Group in the DB Parameter Group Family for the new engine version must be specified. The new DB Parameter Group can be the default for that DB Parameter Group Family. Example: <code>5.1.42</code> </li>
	 * 	<li><code>AllowMajorVersionUpgrade</code> - <code>boolean</code> - Optional - Indicates that major version upgrades are allowed. Constraints: This parameter must be set to true when specifying a value for the EngineVersion parameter that is a different major version than the DB Instance's current version. </li>
	 * 	<li><code>AutoMinorVersionUpgrade</code> - <code>boolean</code> - Optional - Indicates that minor version upgrades will be applied automatically to the DB Instance during the maintenance window. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function modify_db_instance($db_instance_identifier, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DBInstanceIdentifier'] = $db_instance_identifier;

		// Optional parameter
		if (isset($opt['DBSecurityGroups']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'DBSecurityGroups' => (is_array($opt['DBSecurityGroups']) ? $opt['DBSecurityGroups'] : array($opt['DBSecurityGroups']))
			), 'member'));
			unset($opt['DBSecurityGroups']);
		}

		return $this->authenticate('ModifyDBInstance', $opt, $this->hostname);
	}

	/**
	 *
	 * Restores a DB Instance to an arbitrary point-in-time. Users can restore to any point in time before the latestRestorableTime for up to
	 * backupRetentionPeriod days. The target database is created from the source database with the same configuration as the original database
	 * except that the DB instance is created with the default DB security group.
	 *
	 * @param string $db_instance_identifier (Required) The identifier for the DB Snapshot to restore from. Constraints: <ul> <li>Must contain from 1 to 63 alphanumeric characters or hyphens</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul>
	 * @param string $db_snapshot_identifier (Required) Name of the DB Instance to create from the DB Snapshot. This parameter isn't case sensitive. Constraints: <ul> <li>Must contain from 1 to 255 alphanumeric characters or hyphens</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul> Example: <code>my-snapshot-id</code>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>DBInstanceClass</code> - <code>string</code> - Optional - The compute and memory capacity of the Amazon RDS DB instance. Valid Values: <code>db.m1.small | db.m1.large | db.m1.xlarge | db.m2.2xlarge | db.m2.4xlarge</code> </li>
	 * 	<li><code>Port</code> - <code>integer</code> - Optional - The port number on which the database accepts connections. Default: The same port as the original DB Instance Constraints: Value must be <code>1115-65535</code> </li>
	 * 	<li><code>AvailabilityZone</code> - <code>string</code> - Optional - The EC2 Availability Zone that the database instance will be created in. Default: A random, system-chosen Availability Zone. Constraint: You cannot specify the AvailabilityZone parameter if the MultiAZ parameter is set to <code>true</code>. Example: <code>us-east-1a</code> </li>
	 * 	<li><code>MultiAZ</code> - <code>boolean</code> - Optional - Specifies if the DB Instance is a Multi-AZ deployment. Constraint: You cannot specify the AvailabilityZone parameter if the MultiAZ parameter is set to <code>true</code>. </li>
	 * 	<li><code>AutoMinorVersionUpgrade</code> - <code>boolean</code> - Optional - Indicates that minor version upgrades will be applied automatically to the DB Instance during the maintenance window. </li>
	 * 	<li><code>LicenseModel</code> - <code>string</code> - Optional - License model information for the restored DB Instance. Default: Same as source. Valid values: <code>license-included</code> | <code>bring-your-own-license</code> | <code>general-public-license</code> </li>
	 * 	<li><code>DBName</code> - <code>string</code> - Optional - The database name for the restored DB Instance. This parameter doesn't apply to the MySQL engine. </li>
	 * 	<li><code>Engine</code> - <code>string</code> - Optional - The database engine to use for the new instance. Default: The same as source Constraint: Must be compatible with the engine of the source Example: <code>oracle-ee</code> </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function restore_db_instance_from_db_snapshot($db_instance_identifier, $db_snapshot_identifier, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DBInstanceIdentifier'] = $db_instance_identifier;
		$opt['DBSnapshotIdentifier'] = $db_snapshot_identifier;

		return $this->authenticate('RestoreDBInstanceFromDBSnapshot', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a new database security group. Database Security groups control access to a database instance.
	 *
	 * @param string $db_security_group_name (Required) The name for the DB Security Group. This value is stored as a lowercase string. Constraints: Must contain no more than 255 alphanumeric characters or hyphens. Must not be "Default". Example: <code>mysecuritygroup</code>
	 * @param string $db_security_group_description (Required) The description for the DB Security Group.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_db_security_group($db_security_group_name, $db_security_group_description, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DBSecurityGroupName'] = $db_security_group_name;
		$opt['DBSecurityGroupDescription'] = $db_security_group_description;

		return $this->authenticate('CreateDBSecurityGroup', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes a database security group.
	 *
	 * The specified database security group must not be associated with any DB instances.
	 *
	 * @param string $db_security_group_name (Required) The name of the database security group to delete. You cannot delete the default security group. Constraints: <ul> <li>Must be 1 to 255 alphanumeric characters</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_db_security_group($db_security_group_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DBSecurityGroupName'] = $db_security_group_name;

		return $this->authenticate('DeleteDBSecurityGroup', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns a list of orderable DB Instance options for the specified engine.
	 *
	 * @param string $engine (Required) The name of the engine to retrieve DB Instance options for.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>EngineVersion</code> - <code>string</code> - Optional - The engine version filter value. Specify this parameter to show only the available offerings matching the specified engine version. </li>
	 * 	<li><code>DBInstanceClass</code> - <code>string</code> - Optional - The DB Instance class filter value. Specify this parameter to show only the available offerings matching the specified DB Instance class. </li>
	 * 	<li><code>LicenseModel</code> - <code>string</code> - Optional - The license model filter value. Specify this parameter to show only the available offerings matching the specified license model. </li>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of records to include in the response. If more records exist than the specified <code>MaxRecords</code> value, a marker is included in the response so that the remaining results may be retrieved. Default: 100 Constraints: minimum 20, maximum 100 </li>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - An optional marker provided in the previous DescribeOrderableDBInstanceOptions request. If this parameter is specified, the response includes only records beyond the marker, up to the value specified by <code>MaxRecords</code> . </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_orderable_db_instance_options($engine, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['Engine'] = $engine;

		return $this->authenticate('DescribeOrderableDBInstanceOptions', $opt, $this->hostname);
	}

	/**
	 *
	 * Lists available reserved DB Instance offerings.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>ReservedDBInstancesOfferingId</code> - <code>string</code> - Optional - The offering identifier filter value. Specify this parameter to show only the available offering that matches the specified reservation identifier. Example: <code>438012d3-4052-4cc7-b2e3-8d3372e0e706</code> </li>
	 * 	<li><code>DBInstanceClass</code> - <code>string</code> - Optional - The DB Instance class filter value. Specify this parameter to show only the available offerings matching the specified DB Instance class. </li>
	 * 	<li><code>Duration</code> - <code>string</code> - Optional - Duration filter value, specified in years or seconds. Specify this parameter to show only reservations for this duration. Valid Values: <code>1 | 3 | 31536000 | 94608000</code> </li>
	 * 	<li><code>ProductDescription</code> - <code>string</code> - Optional - Product description filter value. Specify this parameter to show only the available offerings matching the specified product description. </li>
	 * 	<li><code>MultiAZ</code> - <code>boolean</code> - Optional - The Multi-AZ filter value. Specify this parameter to show only the available offerings matching the specified Multi-AZ parameter. </li>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of records to include in the response. If more than the <code>MaxRecords</code> value is available, a marker is included in the response so that the following results can be retrieved. Default: 100 Constraints: minimum 20, maximum 100 </li>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - The marker provided in the previous request. If this parameter is specified, the response includes records beyond the marker only, up to <code>MaxRecords</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_reserved_db_instances_offerings($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('DescribeReservedDBInstancesOfferings', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a DB Instance that acts as a Read Replica of a source DB Instance.
	 *
	 * All Read Replica DB Instances are created as Single-AZ deployments with backups disabled. All other DB Instance attributes (including DB
	 * Security Groups and DB Parameter Groups) are inherited from the source DB Instance, except as specified below.
	 *
	 * The source DB Instance must have backup retention enabled.
	 *
	 * @param string $db_instance_identifier (Required) The DB Instance identifier of the Read Replica. This is the unique key that identifies a DB Instance. This parameter is stored as a lowercase string.
	 * @param string $source_db_instance_identifier (Required) The identifier of the DB Instance that will act as the source for the Read Replica. Each DB Instance can have up to five Read Replicas. Constraints: Must be the identifier of an existing DB Instance that is not already a Read Replica DB Instance.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>DBInstanceClass</code> - <code>string</code> - Optional - The compute and memory capacity of the Read Replica. Valid Values: <code>db.m1.small | db.m1.large | db.m1.xlarge | db.m2.xlarge |db.m2.2xlarge | db.m2.4xlarge</code> Default: Inherits from the source DB Instance. </li>
	 * 	<li><code>AvailabilityZone</code> - <code>string</code> - Optional - The Amazon EC2 Availability Zone that the Read Replica will be created in. Default: A random, system-chosen Availability Zone in the endpoint's region. Example: <code>us-east-1d</code> </li>
	 * 	<li><code>Port</code> - <code>integer</code> - Optional - The port number that the DB Instance uses for connections. Default: Inherits from the source DB Instance Valid Values: <code>1150-65535</code> </li>
	 * 	<li><code>AutoMinorVersionUpgrade</code> - <code>boolean</code> - Optional - Indicates that minor engine upgrades will be applied automatically to the Read Replica during the maintenance window. Default: Inherits from the source DB Instance </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_db_instance_read_replica($db_instance_identifier, $source_db_instance_identifier, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DBInstanceIdentifier'] = $db_instance_identifier;
		$opt['SourceDBInstanceIdentifier'] = $source_db_instance_identifier;

		return $this->authenticate('CreateDBInstanceReadReplica', $opt, $this->hostname);
	}

	/**
	 *
	 * Revokes ingress from a DBSecurityGroup for previously authorized IP ranges or EC2 Security Groups. Required parameters for this API are one
	 * of CIDRIP or (EC2SecurityGroupName AND EC2SecurityGroupOwnerId).
	 *
	 * @param string $db_security_group_name (Required) The name of the DB Security Group to revoke ingress from.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>CIDRIP</code> - <code>string</code> - Optional - The IP range to revoke access from. Must be a valid CIDR range. If <code>CIDRIP</code> is specified, <code>EC2SecurityGroupName</code> and <code>EC2SecurityGroupOwnerId</code> cannot be provided. </li>
	 * 	<li><code>EC2SecurityGroupName</code> - <code>string</code> - Optional - The name of the EC2 Security Group to revoke access from. If <code>EC2SecurityGroupName</code> is specified, <code>EC2SecurityGroupOwnerId</code> must also be provided and <code>CIDRIP</code> cannot be provided. </li>
	 * 	<li><code>EC2SecurityGroupOwnerId</code> - <code>string</code> - Optional - The AWS Account Number of the owner of the security group specified in the <code>EC2SecurityGroupName</code> parameter. The AWS Access Key ID is not an acceptable value. If <code>EC2SecurityGroupOwnerId</code> is specified <code>EC2SecurityGroupName</code> must also be provided and <code>CIDRIP</code> cannot be provided. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function revoke_db_security_group_ingress($db_security_group_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DBSecurityGroupName'] = $db_security_group_name;

		return $this->authenticate('RevokeDBSecurityGroupIngress', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a DBSnapshot. The source DBInstance must be in "available" state.
	 *
	 * @param string $db_snapshot_identifier (Required) The identifier for the DB Snapshot. Constraints: <ul> <li>Cannot be null, empty, or blank</li><li>Must contain from 1 to 255 alphanumeric characters or hyphens</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul> Example: <code>my-snapshot-id</code>
	 * @param string $db_instance_identifier (Required) The DB Instance identifier. This is the unique key that identifies a DB Instance. This parameter isn't case sensitive. Constraints: <ul> <li>Must contain from 1 to 63 alphanumeric characters or hyphens</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_db_snapshot($db_snapshot_identifier, $db_instance_identifier, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DBSnapshotIdentifier'] = $db_snapshot_identifier;
		$opt['DBInstanceIdentifier'] = $db_instance_identifier;

		return $this->authenticate('CreateDBSnapshot', $opt, $this->hostname);
	}

	/**
	 *
	 * Reboots a previously provisioned RDS instance. This API results in the application of modified DBParameterGroup parameters with ApplyStatus
	 * of pending-reboot to the RDS instance. This action is taken as soon as possible, and results in a momentary outage to the RDS instance
	 * during which the RDS instance status is set to rebooting. A DBInstance event is created when the reboot is completed.
	 *
	 * @param string $db_instance_identifier (Required) The DB Instance identifier. This parameter is stored as a lowercase string. Constraints: <ul> <li>Must contain from 1 to 63 alphanumeric characters or hyphens</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function reboot_db_instance($db_instance_identifier, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DBInstanceIdentifier'] = $db_instance_identifier;

		return $this->authenticate('RebootDBInstance', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns a list of DBParameterGroup descriptions. If a DBParameterGroupName is specified, the list will contain only the descriptions of the
	 * specified DBParameterGroup.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>DBParameterGroupName</code> - <code>string</code> - Optional - The name of a specific database parameter group to return details for. Constraints: <ul> <li>Must be 1 to 255 alphanumeric characters</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul> </li>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of records to include in the response. If more records exist than the specified <code>MaxRecords</code> value, a marker is included in the response so that the remaining results may be retrieved. Default: 100 Constraints: minimum 20, maximum 100 </li>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - An optional marker provided in the previous DescribeDBInstances request. If this parameter is specified, the response includes only records beyond the marker, up to the value specified by <code>MaxRecords</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_db_parameter_groups($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('DescribeDBParameterGroups', $opt, $this->hostname);
	}

	/**
	 *
	 * Creates a new DB instance.
	 *
	 * @param string $db_instance_identifier (Required) The DB Instance identifier. This parameter is stored as a lowercase string. Constraints: <ul> <li>Must contain from 1 to 63 alphanumeric characters or hyphens.</li><li>First character must be a letter.</li><li>Cannot end with a hyphen or contain two consecutive hyphens.</li> </ul> Example: <code>mydbinstance</code>
	 * @param integer $allocated_storage (Required) The amount of storage (in gigabytes) to be initially allocated for the database instance. <b>MySQL</b> Constraints: Must be an integer from 5 to 1024. Type: Integer <b>Oracle</b> Constraints: Must be an integer from 10 to 1024.
	 * @param string $db_instance_class (Required) The compute and memory capacity of the DB Instance. Valid Values: <code>db.m1.small | db.m1.large | db.m1.xlarge | db.m2.xlarge |db.m2.2xlarge | db.m2.4xlarge</code>
	 * @param string $engine (Required) The name of the database engine to be used for this instance. Valid Values: <code>MySQL</code> | <code>oracle-se1</code> | <code>oracle-se</code> | <code>oracle-ee</code>
	 * @param string $master_username (Required) The name of master user for the client DB Instance. <b>MySQL</b> Constraints: <ul> <li>Must be 1 to 16 alphanumeric characters.</li><li>First character must be a letter.</li><li>Cannot be a reserved word for the chosen database engine.</li> </ul> Type: String <b>Oracle</b> Constraints: <ul> <li>Must be 1 to 30 alphanumeric characters.</li><li>First character must be a letter.</li><li>Cannot be a reserved word for the chosen database engine.</li> </ul>
	 * @param string $master_user_password (Required) The password for the master DB Instance user. <b>MySQL</b> Constraints: Cannot contain more than 41 alphanumeric characters. Type: String <b>Oracle</b> Constraints: Cannot contain more than 30 alphanumeric characters.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>DBName</code> - <code>string</code> - Optional - The meaning of this parameter differs according to the database engine you use. <b>MySQL</b> The name of the database to create when the DB Instance is created. If this parameter is not specified, no database is created in the DB Instance. Constraints: <ul> <li>Must contain 1 to 64 alphanumeric characters</li><li>Cannot be a word reserved by the specified database engine</li> </ul> Type: String <b>Oracle</b> The Oracle System ID (SID) of the created DB Instance. Default: <code>ORACL</code> Constraints: <ul> <li>Cannot be longer than 8 characters</li> </ul> </li>
	 * 	<li><code>DBSecurityGroups</code> - <code>string|array</code> - Optional - A list of DB Security Groups to associate with this DB Instance. Default: The default DB Security Group for the database engine.  Pass a string for a single value, or an indexed array for multiple values. </li>
	 * 	<li><code>AvailabilityZone</code> - <code>string</code> - Optional - The EC2 Availability Zone that the database instance will be created in. Default: A random, system-chosen Availability Zone in the endpoint's region. Example: <code>us-east-1d</code> Constraint: The AvailabilityZone parameter cannot be specified if the MultiAZ parameter is set to <code>true</code>. The specified Availability Zone must be in the same region as the current endpoint. </li>
	 * 	<li><code>PreferredMaintenanceWindow</code> - <code>string</code> - Optional - The weekly time range (in UTC) during which system maintenance can occur. Format: <code>ddd:hh24:mi-ddd:hh24:mi</code> Default: A 30-minute window selected at random from an 8-hour block of time per region, occurring on a random day of the week. The following list shows the time blocks for each region from which the default maintenance windows are assigned. <ul> <li><b>US-East (Northern Virginia) Region:</b> 03:00-11:00 UTC</li><li><b>US-West (Northern California) Region:</b> 06:00-14:00 UTC</li><li><b>EU (Ireland) Region:</b> 22:00-06:00 UTC</li><li><b>Asia Pacific (Singapore) Region:</b> 14:00-22:00 UTC</li><li><b>Asia Pacific (Tokyo) Region: </b> 17:00-03:00 UTC</li> </ul> Valid Days: Mon, Tue, Wed, Thu, Fri, Sat, Sun Constraints: Minimum 30-minute window. </li>
	 * 	<li><code>DBParameterGroupName</code> - <code>string</code> - Optional - The name of the database parameter group to associate with this DB instance. If this argument is omitted, the default DBParameterGroup for the specified engine will be used. Constraints: <ul> <li>Must be 1 to 255 alphanumeric characters</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul> </li>
	 * 	<li><code>BackupRetentionPeriod</code> - <code>integer</code> - Optional - The number of days for which automated backups are retained. Setting this parameter to a positive number enables backups. Setting this parameter to 0 disables automated backups. Default: 1 Constraints: <ul> <li>Must be a value from 0 to 8</li><li>Cannot be set to 0 if the DB Instance is a master instance with read replicas</li> </ul> </li>
	 * 	<li><code>PreferredBackupWindow</code> - <code>string</code> - Optional - The daily time range during which automated backups are created if automated backups are enabled, using the <code>BackupRetentionPeriod</code> parameter. Default: A 30-minute window selected at random from an 8-hour block of time per region. The following list shows the time blocks for each region from which the default backup windows are assigned. <ul> <li><b>US-East (Northern Virginia) Region:</b> 03:00-11:00 UTC</li><li><b>US-West (Northern California) Region:</b> 06:00-14:00 UTC</li><li><b>EU (Ireland) Region:</b> 22:00-06:00 UTC</li><li><b>Asia Pacific (Singapore) Region:</b> 14:00-22:00 UTC</li><li><b>Asia Pacific (Tokyo) Region: </b> 17:00-03:00 UTC</li> </ul> Constraints: Must be in the format <code>hh24:mi-hh24:mi</code>. Times should be Universal Time Coordinated (UTC). Must not conflict with the preferred maintenance window. Must be at least 30 minutes. </li>
	 * 	<li><code>Port</code> - <code>integer</code> - Optional - The port number on which the database accepts connections. <b>MySQL</b> Default: <code>3306</code> Valid Values: <code>1150-65535</code> Type: Integer <b>Oracle</b> Default: <code>1521</code> Valid Values: <code>1150-65535</code> </li>
	 * 	<li><code>MultiAZ</code> - <code>boolean</code> - Optional - Specifies if the DB Instance is a Multi-AZ deployment. You cannot set the AvailabilityZone parameter if the MultiAZ parameter is set to true. </li>
	 * 	<li><code>EngineVersion</code> - <code>string</code> - Optional - The version number of the database engine to use. <b>MySQL</b> Example: <code>5.1.42</code> Type: String <b>Oracle</b> Example: <code>11.2.0.2.v2</code> </li>
	 * 	<li><code>AutoMinorVersionUpgrade</code> - <code>boolean</code> - Optional - Indicates that minor engine upgrades will be applied automatically to the DB Instance during the maintenance window. Default: <code>true</code> </li>
	 * 	<li><code>LicenseModel</code> - <code>string</code> - Optional - License model information for this DB Instance. Valid values: <code>license-included</code> | <code>bring-your-own-license</code> | <code>general-public-license</code> </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_db_instance($db_instance_identifier, $allocated_storage, $db_instance_class, $engine, $master_username, $master_user_password, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DBInstanceIdentifier'] = $db_instance_identifier;
		$opt['AllocatedStorage'] = $allocated_storage;
		$opt['DBInstanceClass'] = $db_instance_class;
		$opt['Engine'] = $engine;
		$opt['MasterUsername'] = $master_username;
		$opt['MasterUserPassword'] = $master_user_password;

		// Optional parameter
		if (isset($opt['DBSecurityGroups']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'DBSecurityGroups' => (is_array($opt['DBSecurityGroups']) ? $opt['DBSecurityGroups'] : array($opt['DBSecurityGroups']))
			), 'member'));
			unset($opt['DBSecurityGroups']);
		}

		return $this->authenticate('CreateDBInstance', $opt, $this->hostname);
	}

	/**
	 *
	 * The DeleteDBInstance API deletes a previously provisioned RDS instance. A successful response from the web service indicates the request
	 * was received correctly. If a final DBSnapshot is requested the status of the RDS instance will be "deleting" until the DBSnapshot is
	 * created. DescribeDBInstance is used to monitor the status of this operation. This cannot be canceled or reverted once submitted.
	 *
	 * @param string $db_instance_identifier (Required) The DB Instance identifier for the DB Instance to be deleted. This parameter isn't case sensitive. Constraints: <ul> <li>Must contain from 1 to 63 alphanumeric characters or hyphens</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>SkipFinalSnapshot</code> - <code>boolean</code> - Optional - Determines whether a final DB Snapshot is created before the DB Instance is deleted. If <code>true</code> is specified, no DBSnapshot is created. If false is specified, a DB Snapshot is created before the DB Instance is deleted. The FinalDBSnapshotIdentifier parameter must be specified if SkipFinalSnapshot is <code>false</code>. Default: <code>false</code> </li>
	 * 	<li><code>FinalDBSnapshotIdentifier</code> - <code>string</code> - Optional - The DBSnapshotIdentifier of the new DBSnapshot created when SkipFinalSnapshot is set to <code>false</code>. Specifying this parameter and also setting the SkipFinalShapshot parameter to true results in an error. Constraints: <ul> <li>Must be 1 to 255 alphanumeric characters</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul> </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_db_instance($db_instance_identifier, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DBInstanceIdentifier'] = $db_instance_identifier;

		return $this->authenticate('DeleteDBInstance', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes a specified DBParameterGroup. The DBParameterGroup cannot be associated with any RDS instances to be deleted.
	 *
	 * The specified database parameter group cannot be associated with any DB Instances.
	 *
	 * @param string $db_parameter_group_name (Required) The name of the DB Parameter Group. Constraints: <ul> <li>Must be the name of an existing DB Parameter Group</li><li>You cannot delete a default DB Parameter Group</li> </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_db_parameter_group($db_parameter_group_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DBParameterGroupName'] = $db_parameter_group_name;

		return $this->authenticate('DeleteDBParameterGroup', $opt, $this->hostname);
	}

	/**
	 *
	 * Modifies the parameters of a DBParameterGroup. To modify more than one parameter submit a list of the following: ParameterName,
	 * ParameterValue, and ApplyMethod. A maximum of 20 parameters can be modified in a single request.
	 *
	 * @param string $db_parameter_group_name (Required) The name of the database parameter group. Constraints: <ul> <li>Must be the name of an existing database parameter group</li><li>Must be 1 to 255 alphanumeric characters</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul>
	 * @param array $parameters (Required) An array of parameter names, values, and the apply method for the parameter update. At least one parameter name, value, and apply method must be supplied; subsequent arguments are optional. A maximum of 20 parameters may be modified in a single request. Valid Values (for the application method): <code>immediate | pending-reboot</code> You can use the immediate value with dynamic parameters only. You can use the pending-reboot value for both dynamic and static parameters, and changes are applied when DB Instance reboots. <ul>
	 * 	<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 		<li><code>ParameterName</code> - <code>string</code> - Optional - Specifies the name of the parameter. </li>
	 * 		<li><code>ParameterValue</code> - <code>string</code> - Optional - Specifies the value of the parameter. </li>
	 * 		<li><code>Description</code> - <code>string</code> - Optional - Provides a description of the parameter. </li>
	 * 		<li><code>Source</code> - <code>string</code> - Optional - Indicates the source of the parameter value. </li>
	 * 		<li><code>ApplyType</code> - <code>string</code> - Optional - Specifies the engine specific parameters type. </li>
	 * 		<li><code>DataType</code> - <code>string</code> - Optional - Specifies the valid data type for the parameter. </li>
	 * 		<li><code>AllowedValues</code> - <code>string</code> - Optional - Specifies the valid range of values for the parameter. </li>
	 * 		<li><code>IsModifiable</code> - <code>boolean</code> - Optional - Indicates whether (<code>true</code>) or not (<code>false</code>) the parameter can be modified. Some parameters have security or operational implications that prevent them from being changed. </li>
	 * 		<li><code>MinimumEngineVersion</code> - <code>string</code> - Optional - The earliest engine version to which the parameter can apply. </li>
	 * 		<li><code>ApplyMethod</code> - <code>string</code> - Optional - Indicates when to apply parameter updates. [Allowed values: <code>immediate</code>, <code>pending-reboot</code>]</li>
	 * 	</ul></li>
	 * </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function modify_db_parameter_group($db_parameter_group_name, $parameters, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DBParameterGroupName'] = $db_parameter_group_name;

		// Required parameter
		$opt = array_merge($opt, CFComplexType::map(array(
			'Parameters' => (is_array($parameters) ? $parameters : array($parameters))
		), 'member'));

		return $this->authenticate('ModifyDBParameterGroup', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns information about DBSnapshots. This API supports pagination.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>DBInstanceIdentifier</code> - <code>string</code> - Optional - The unique identifier for the Amazon RDS DB snapshot. This value is stored as a lowercase string. Constraints: <ul> <li>Must contain from 1 to 63 alphanumeric characters or hyphens</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul> </li>
	 * 	<li><code>DBSnapshotIdentifier</code> - <code>string</code> - Optional - The DB Instance identifier. This parameter isn't case sensitive. Constraints: <ul> <li>Must be 1 to 255 alphanumeric characters</li><li>First character must be a letter</li><li>Cannot end with a hyphen or contain two consecutive hyphens</li> </ul> </li>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of records to include in the response. If more records exist than the specified <code>MaxRecords</code> value, a marker is included in the response so that the remaining results may be retrieved. Default: 100 Constraints: minimum 20, maximum 100 </li>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - An optional marker provided in the previous DescribeDBInstances request. If this parameter is specified, the response includes only records beyond the marker, up to the value specified by <code>MaxRecords</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_db_snapshots($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('DescribeDBSnapshots', $opt, $this->hostname);
	}

	/**
	 *
	 * Purchases a reserved DB Instance offering.
	 *
	 * @param string $reserved_db_instances_offering_id (Required) The ID of the Reserved DB Instance offering to purchase. Example: 438012d3-4052-4cc7-b2e3-8d3372e0e706
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>ReservedDBInstanceId</code> - <code>string</code> - Optional - Customer-specified identifier to track this reservation. Example: myreservationID </li>
	 * 	<li><code>DBInstanceCount</code> - <code>integer</code> - Optional - The number of instances to reserve. Default: <code>1</code> </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function purchase_reserved_db_instances_offering($reserved_db_instances_offering_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['ReservedDBInstancesOfferingId'] = $reserved_db_instances_offering_id;

		return $this->authenticate('PurchaseReservedDBInstancesOffering', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns the default engine and system parameter information for the specified database engine.
	 *
	 * @param string $db_parameter_group_family (Required) The name of the DB Parameter Group Family.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of records to include in the response. If more records exist than the specified <code>MaxRecords</code> value, a marker is included in the response so that the remaining results may be retrieved. Default: 100 Constraints: minimum 20, maximum 100 </li>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - An optional marker provided in the previous DescribeDBInstances request. If this parameter is specified, the response includes only records beyond the marker, up to the value specified by <code>MaxRecords</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_engine_default_parameters($db_parameter_group_family, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DBParameterGroupFamily'] = $db_parameter_group_family;

		return $this->authenticate('DescribeEngineDefaultParameters', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns information about reserved DB Instances for this account, or about a specified reserved DB Instance.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>ReservedDBInstanceId</code> - <code>string</code> - Optional - The reserved DB Instance identifier filter value. Specify this parameter to show only the reservation that matches the specified reservation ID. </li>
	 * 	<li><code>ReservedDBInstancesOfferingId</code> - <code>string</code> - Optional - The offering identifier filter value. Specify this parameter to show only purchased reservations matching the specified offering identifier. </li>
	 * 	<li><code>DBInstanceClass</code> - <code>string</code> - Optional - The DB Instance class filter value. Specify this parameter to show only those reservations matching the specified DB Instances class. </li>
	 * 	<li><code>Duration</code> - <code>string</code> - Optional - The duration filter value, specified in years or seconds. Specify this parameter to show only reservations for this duration. Valid Values: <code>1 | 3 | 31536000 | 94608000</code> </li>
	 * 	<li><code>ProductDescription</code> - <code>string</code> - Optional - The product description filter value. Specify this parameter to show only those reservations matching the specified product description. </li>
	 * 	<li><code>MultiAZ</code> - <code>boolean</code> - Optional - The Multi-AZ filter value. Specify this parameter to show only those reservations matching the specified Multi-AZ parameter. </li>
	 * 	<li><code>MaxRecords</code> - <code>integer</code> - Optional - The maximum number of records to include in the response. If more than the <code>MaxRecords</code> value is available, a marker is included in the response so that the following results can be retrieved. Default: 100 Constraints: minimum 20, maximum 100 </li>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - The marker provided in the previous request. If this parameter is specified, the response includes records beyond the marker only, up to <code>MaxRecords</code>. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function describe_reserved_db_instances($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('DescribeReservedDBInstances', $opt, $this->hostname);
	}

	/**
	 *
	 * Deletes a DBSnapshot.
	 *
	 * The DBSnapshot must be in the <code>available</code> state to be deleted.
	 *
	 * @param string $db_snapshot_identifier (Required) The DBSnapshot identifier. Constraints: Must be the name of an existing DB Snapshot in the <code>available</code> state.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_db_snapshot($db_snapshot_identifier, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DBSnapshotIdentifier'] = $db_snapshot_identifier;

		return $this->authenticate('DeleteDBSnapshot', $opt, $this->hostname);
	}
}


/*%******************************************************************************************%*/
// EXCEPTIONS

/**
 * Default RDS Exception.
 */
class RDS_Exception extends Exception {}