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
 * AWS Import/Export accelerates transferring large amounts of data between the AWS cloud and portable storage devices that you mail to us.
 * AWS Import/Export transfers data directly onto and off of your storage devices using Amazon's high-speed internal network and bypassing the
 * Internet. For large data sets, AWS Import/Export is often faster than Internet transfer and more cost effective than upgrading your
 * connectivity.
 *
 * @version Thu Sep 01 21:22:26 PDT 2011
 * @license See the included NOTICE.md file for complete information.
 * @copyright See the included NOTICE.md file for complete information.
 * @link http://aws.amazon.com/importexport/Amazon Import/Export Service
 * @link http://aws.amazon.com/documentation/importexport/Amazon Import/Export Service documentation
 */
class AmazonImportExport extends CFRuntime
{

	/*%******************************************************************************************%*/
	// CLASS CONSTANTS

	/**
	 * Specify the default queue URL.
	 */
	const DEFAULT_URL = 'importexport.amazonaws.com';



	/*%******************************************************************************************%*/
	// CONSTRUCTOR

	/**
	 * Constructs a new instance of <AmazonImportExport>.
	 *
	 * @param string $key (Optional) Your Amazon API Key. If blank, it will look for the <code>AWS_KEY</code> constant.
	 * @param string $secret_key (Optional) Your Amazon API Secret Key. If blank, it will look for the <code>AWS_SECRET_KEY</code> constant.
	 * @return boolean false if no valid values are set, otherwise true.
	 */
	public function __construct($key = null, $secret_key = null)
	{
		$this->api_version = '2010-06-01';
		$this->hostname = self::DEFAULT_URL;

		if (!$key && !defined('AWS_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new ImportExport_Exception('No account key was passed into the constructor, nor was it set in the AWS_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		if (!$secret_key && !defined('AWS_SECRET_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new ImportExport_Exception('No account secret was passed into the constructor, nor was it set in the AWS_SECRET_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		return parent::__construct($key, $secret_key);
	}


	/*%******************************************************************************************%*/
	// SERVICE METHODS

	/**
	 *
	 * This operation initiates the process of scheduling an upload or download of your data. You include in the request a manifest that describes
	 * the data transfer specifics. The response to the request includes a job ID, which you can use in other operations, a signature that you use
	 * to identify your storage device, and the address where you should ship your storage device.
	 *
	 * @param string $job_type (Required) Specifies whether the job to initiate is an import or export job. [Allowed values: <code>Import</code>, <code>Export</code>]
	 * @param string $manifest (Required) The UTF-8 encoded text of the manifest file.
	 * @param boolean $validate_only (Required) Validate the manifest and parameter values in the request but do not actually create a job.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>ManifestAddendum</code> - <code>string</code> - Optional - For internal use only. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_job($job_type, $manifest, $validate_only, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['JobType'] = $job_type;
		$opt['Manifest'] = $manifest;
		$opt['ValidateOnly'] = $validate_only;

		return $this->authenticate('CreateJob', $opt, $this->hostname);
	}

	/**
	 *
	 * This operation cancels a specified job. Only the job owner can cancel it. The operation fails if the job has already started or is
	 * complete.
	 *
	 * @param string $job_id (Required) A unique identifier which refers to a particular job.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function cancel_job($job_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['JobId'] = $job_id;

		return $this->authenticate('CancelJob', $opt, $this->hostname);
	}

	/**
	 *
	 * This operation returns information about a job, including where the job is in the processing pipeline, the status of the results, and the
	 * signature value associated with the job. You can only return information about jobs you own.
	 *
	 * @param string $job_id (Required) A unique identifier which refers to a particular job.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function get_status($job_id, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['JobId'] = $job_id;

		return $this->authenticate('GetStatus', $opt, $this->hostname);
	}

	/**
	 *
	 * This operation returns the jobs associated with the requester. AWS Import/Export lists the jobs in reverse chronological order based on the
	 * date of creation. For example if Job Test1 was created 2009Dec30 and Test2 was created 2010Feb05, the ListJobs operation would return Test2
	 * followed by Test1.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>MaxJobs</code> - <code>integer</code> - Optional - Sets the maximum number of jobs returned in the response. If there are additional jobs that were not returned because MaxJobs was exceeded, the response contains <IsTruncated>true</IsTruncated>. To return the additional jobs, see Marker. </li>
	 * 	<li><code>Marker</code> - <code>string</code> - Optional - Specifies the JOBID to start after when listing the jobs created with your account. AWS Import/Export lists your jobs in reverse chronological order. See MaxJobs. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function list_jobs($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('ListJobs', $opt, $this->hostname);
	}

	/**
	 *
	 * You use this operation to change the parameters specified in the original manifest file by supplying a new manifest file. The manifest file
	 * attached to this request replaces the original manifest file. You can only use the operation after a CreateJob request but before the data
	 * transfer starts and you can only use it on jobs you own.
	 *
	 * @param string $job_id (Required) A unique identifier which refers to a particular job.
	 * @param string $manifest (Required) The UTF-8 encoded text of the manifest file.
	 * @param string $job_type (Required) Specifies whether the job to initiate is an import or export job. [Allowed values: <code>Import</code>, <code>Export</code>]
	 * @param boolean $validate_only (Required) Validate the manifest and parameter values in the request but do not actually create a job.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function update_job($job_id, $manifest, $job_type, $validate_only, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['JobId'] = $job_id;
		$opt['Manifest'] = $manifest;
		$opt['JobType'] = $job_type;
		$opt['ValidateOnly'] = $validate_only;

		return $this->authenticate('UpdateJob', $opt, $this->hostname);
	}
}


/*%******************************************************************************************%*/
// EXCEPTIONS

/**
 * Default ImportExport Exception.
 */
class ImportExport_Exception extends Exception {}