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
 * Amazon SimpleDB is a web service providing the core database functions of data indexing and querying in the cloud. By offloading the time
 * and effort associated with building and operating a web-scale database, SimpleDB provides developers the freedom to focus on application
 * development.
 *
 *
 *
 * A traditional, clustered relational database requires a sizable upfront capital outlay, is complex to design, and often requires extensive
 * and repetitive database administration. Amazon SimpleDB is dramatically simpler, requiring no schema, automatically indexing your data and
 * providing a simple API for storage and access. This approach eliminates the administrative burden of data modeling, index maintenance, and
 * performance tuning. Developers gain access to this functionality within Amazon's proven computing environment, are able to scale instantly,
 * and pay only for what they use.
 *
 * Visit <a href="http://aws.amazon.com/simpledb/">http://aws.amazon.com/simpledb/</a> for more information.
 *
 * @version Wed Jul 20 13:20:46 PDT 2011
 * @license See the included NOTICE.md file for complete information.
 * @copyright See the included NOTICE.md file for complete information.
 * @link http://aws.amazon.com/simpledb/Amazon SimpleDB
 * @link http://aws.amazon.com/documentation/simpledb/Amazon SimpleDB documentation
 */
class AmazonSDB extends CFRuntime
{

	/*%******************************************************************************************%*/
	// CLASS CONSTANTS

	/**
	 * Specify the default queue URL.
	 */
	const DEFAULT_URL = 'sdb.amazonaws.com';

	/**
	 * Specify the queue URL for the US-East (Northern Virginia) Region.
	 */
	const REGION_US_E1 = self::DEFAULT_URL;

	/**
	 * Specify the queue URL for the US-West (Northern California) Region.
	 */
	const REGION_US_W1 = 'sdb.us-west-1.amazonaws.com';

	/**
	 * Specify the queue URL for the EU (Ireland) Region.
	 */
	const REGION_EU_W1 = 'sdb.eu-west-1.amazonaws.com';

	/**
	 * Specify the queue URL for the Asia Pacific (Singapore) Region.
	 */
	const REGION_APAC_SE1 = 'sdb.ap-southeast-1.amazonaws.com';

	/**
	 * Specify the queue URL for the Asia Pacific (Japan) Region.
	 */
	const REGION_APAC_NE1 = 'sdb.ap-northeast-1.amazonaws.com';


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
	// CONVENIENCE METHODS

	/**
	 * ONLY lists the domains, as an array, on the SimpleDB account.
	 *
	 * @param string $pcre (Optional) A Perl-Compatible Regular Expression (PCRE) to filter the names against.
	 * @return array The list of matching queue names. If there are no results, the method will return an empty array.
	 * @link http://php.net/pcre Perl-Compatible Regular Expression (PCRE) Docs
	 */
	public function get_domain_list($pcre = null)
	{
		if ($this->use_batch_flow)
		{
			throw new SDB_Exception(__FUNCTION__ . '() cannot be batch requested');
		}

		// Get a list of domains.
		$list = $this->list_domains();
		if ($list = $list->body->DomainName())
		{
			$list = $list->map_string($pcre);
			return $list;
		}

		return array();
	}

	/**
	 * Remaps the custom item-key-value format used by Batch* operations to the more common ComplexList
	 * format. Internal use only.
	 *
	 * @param array $items (Required) The item-key-value format passed by <batch_put_attributes()> and <batch_delete_attributes()>.
	 * @param boolean|array $replace (Optional) The `$replace` value passed by <batch_put_attributes()> and <batch_delete_attributes()>.
	 * @return array A <CFComplexType>-compatible mapping of parameters.
	 */
	public static function remap_batch_items_for_complextype($items, $replace = false)
	{
		$map = array(
			'Item' => array()
		);

		foreach ($items as $key => $value)
		{
			$node = array();
			$node['ItemName'] = $key;

			if (is_array($value))
			{
				$node['Attribute'] = array();

				foreach ($value as $k => $v)
				{
					$v = is_array($v) ? $v : array($v);

					foreach ($v as $vv)
					{
						$n = array();
						$n['Name'] = $k;
						$n['Value'] = $vv;

						if (
							$replace === (boolean) true ||
							(isset($replace[$key]) && array_search($k, $replace[$key], true) !== false)
						)
						{
							$n['Replace'] = 'true';
						}

						$node['Attribute'][] = $n;
					}
				}
			}

			$map['Item'][] = $node;
		}

		return $map;
	}

	/**
	 * Remaps the custom item-key-value format used by Batch* operations to the more common ComplexList
	 * format. Internal use only.
	 *
	 * @param array $keys (Required) The key-value format passed by <put_attributes()>.
	 * @param boolean|array $replace (Optional) The `$replace` value passed by <batch_put_attributes()> and <batch_delete_attributes()>.
	 * @return array A <CFComplexType>-compatible mapping of parameters.
	 */
	public static function remap_attribute_items_for_complextype($keys, $replace = false)
	{
		$map = array(
			'Attribute' => array()
		);

		foreach ($keys as $k => $v)
		{
			$v = is_array($v) ? $v : array($v);

			foreach ($v as $vv)
			{
				$n = array();
				$n['Name'] = $k;
				$n['Value'] = $vv;

				if (
					$replace === (boolean) true ||
					(is_array($replace) && array_search($k, $replace, true) !== false)
				)
				{
					$n['Replace'] = 'true';
				}

				$map['Attribute'][] = $n;
			}
		}

		return $map;
	}


	/*%******************************************************************************************%*/
	// CONSTRUCTOR

	/**
	 * Constructs a new instance of <AmazonSDB>.
	 *
	 * @param string $key (Optional) Your Amazon API Key. If blank, it will look for the <code>AWS_KEY</code> constant.
	 * @param string $secret_key (Optional) Your Amazon API Secret Key. If blank, it will look for the <code>AWS_SECRET_KEY</code> constant.
	 * @return boolean false if no valid values are set, otherwise true.
	 */
	public function __construct($key = null, $secret_key = null)
	{
		$this->api_version = '2009-04-15';
		$this->hostname = self::DEFAULT_URL;

		if (!$key && !defined('AWS_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new SDB_Exception('No account key was passed into the constructor, nor was it set in the AWS_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		if (!$secret_key && !defined('AWS_SECRET_KEY'))
		{
			// @codeCoverageIgnoreStart
			throw new SDB_Exception('No account secret was passed into the constructor, nor was it set in the AWS_SECRET_KEY constant.');
			// @codeCoverageIgnoreEnd
		}

		return parent::__construct($key, $secret_key);
	}


	/*%******************************************************************************************%*/
	// SERVICE METHODS

	/**
	 *
	 * The <code>Select</code> operation returns a set of attributes for <code>ItemNames</code> that match the select expression.
	 * <code>Select</code> is similar to the standard SQL SELECT statement.
	 *
	 * The total size of the response cannot exceed 1 MB in total size. Amazon SimpleDB automatically adjusts the number of items returned per
	 * page to enforce this limit. For example, if the client asks to retrieve 2500 items, but each individual item is 10 kB in size, the system
	 * returns 100 items and an appropriate <code>NextToken</code> so the client can access the next page of results.
	 *
	 * For information on how to construct select expressions, see Using Select to Create Amazon SimpleDB Queries in the Developer Guide.
	 *
	 * @param string $select_expression (Required) The expression used to query the domain.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>NextToken</code> - <code>string</code> - Optional - A string informing Amazon SimpleDB where to start the next list of <code>ItemNames</code>. </li>
	 * 	<li><code>ConsistentRead</code> - <code>boolean</code> - Optional - Determines whether or not strong consistency should be enforced when data is read from SimpleDB. If <code>true</code>, any data previously written to SimpleDB will be returned. Otherwise, results will be consistent eventually, and the client may not see data that was written immediately before your read. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function select($select_expression, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['SelectExpression'] = $select_expression;

		return $this->authenticate('Select', $opt, $this->hostname);
	}

	/**
	 * The PutAttributes operation creates or replaces attributes in an item.
	 *
	 * A single item can have the attributes <code>{ "first_name", "first_value" }</code> and
	 * <code>{ "first_name", "second_value" }</code>. However, it cannot have two attribute instances where
	 * both the attribute name and attribute value are the same. Optionally, the requestor can supply the
	 * <code>Replace</code> parameter for each individual attribute. Setting this value to true causes the
	 * new attribute value to replace the existing attribute value(s).
	 *
	 * For example, if an item has the attributes <code>{ 'a', '1' }, { 'b', '2'}</code> and <code>{ 'b', '3' }</code>
	 * and the requestor calls <code>PutAttributes</code> using the attributes <code>{ 'b', '4' }</code> with
	 * the <code>Replace</code> parameter set to <code>true</code>, the final attributes of the item are changed
	 * to <code>{ 'a', '1' }</code> and <code>{ 'b', '4' }</code>, which replaces the previous values of the 'b'
	 * attribute with the new value.
	 *
	 * Using PutAttributes to replace attribute values that do not exist will not result in an error
	 * response.
	 *
	 * You cannot specify an empty string as an attribute name.
	 *
	 * Because Amazon SimpleDB makes multiple copies of your data and uses an eventual consistency update
	 * model, an immediate GetAttributes or Select request (read) immediately after a DeleteAttributes
	 * request (write) might not return the updated data.
	 *
	 * The following limitations are enforced for this operation:
	 *
	 * <ul>
	 * 	<li>256 attribute name-value pairs per item</li>
	 * 	<li>1 billion attributes per domain</li>
	 * 	<li>10 GB of total user data storage per domain</li>
	 * </ul>
	 *
	 * @param string $domain_name (Required) The name of the domain in which the attributes are being deleted.
	 * @param string $item_name (Required) The name of the base item which will contain the series of keypairs.
	 * @param array $keypairs (Required) Associative array of parameters which are treated as key-value and key-multivalue pairs (i.e. a key can have one or more values; think tags). <ul>
	 * 	<li><code>[key]</code> - <code>array</code> - Set the custom key name as the key for this value. For the value, pass a string for a single value, or an indexed array for multiple values.</li>
	 * </ul>
	 * @param boolean|array $replace (Optional) Whether to replace a key-value pair if a matching key already exists. Supports either a boolean (which affects ALL key-value pairs) or an indexed array of key names (which affects only the keys specified). Defaults to boolean <code>false</code>.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Expected</code> - <code>array</code> - Optional - The update condition which, if specified, determines if the specified attributes will be updated or not. The update condition must be satisfied in order for this request to be processed and the attributes to be updated. <ul>
	 * 		<li><code>Name</code> - <code>string</code> - Optional - The name of the attribute involved in the condition.</li>
	 * 		<li><code>Value</code> - <code>string</code> - Optional - The value of an attribute. This value can only be specified when the exists parameter is equal to true.</li>
	 * 		<li><code>Exists</code> - <code>string</code> - Optional - True if the specified attribute must exist with the specified value in order for this update condition to be satisfied, otherwise false if the specified attribute should not exist in order for this update condition to be satisfied.</li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 *  <li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This is useful for manually-managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function put_attributes($domain_name, $item_name, $keypairs, $replace = null, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DomainName'] = $domain_name;
		$opt['ItemName'] = $item_name;

		$opt = array_merge($opt, CFComplexType::map(
			self::remap_attribute_items_for_complextype($keypairs, $replace)
		));

		if (isset($opt['Expected']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Expected' => $opt['Expected']
			)));
			unset($opt['Expected']);
		}

		return $this->authenticate('PutAttributes', $opt, $this->hostname);
	}

	/**
	 * Performs multiple DeleteAttributes operations in a single call, which reduces round trips and latencies.
	 * This enables Amazon SimpleDB to optimize requests, which generally yields better throughput.
	 *
	 * If you specify BatchDeleteAttributes without attributes or values, all the attributes for the item are
	 * deleted. BatchDeleteAttributes is an idempotent operation; running it multiple times on the same item
	 * or attribute doesn't result in an error. The BatchDeleteAttributes operation succeeds or fails in its
	 * entirety. There are no partial deletes.
	 *
	 * You can execute multiple BatchDeleteAttributes operations and other operations in parallel. However,
	 * large numbers of concurrent BatchDeleteAttributes calls can result in Service Unavailable (503) responses.
	 * This operation does not support conditions using <code>Expected.X.Name</code>, <code>Expected.X.Value</code>,
	 * or <code>Expected.X.Exists</code>.
	 *
	 * The following limitations are enforced for this operation:
	 *
	 * <ul>
	 * 	<li>1 MB request size</li>
	 * 	<li>25 item limit per BatchDeleteAttributes operation</li>
	 * </ul>
	 *
	 * @param string $domain_name (Required) The name of the domain in which the attributes are being deleted.
	 * @param array $item_keypairs (Required) Associative array of parameters which are treated as item-key-value and item-key-multivalue pairs (i.e. a key can have one or more values; think tags). <ul>
	 * 	<li><code>[item]</code> - <code>array</code> - Set the custom item name as the key for this value.<ul>
	 * 		<li><code>[key]</code> - <code>array</code> - Set the custom key name as the key for this value. For the value, pass a string for a single value, or an indexed array for multiple values.</li>
	 * 	</ul></li>
	 * </ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Item</code> - <code>array</code> - Optional - A list of items on which to perform the operation. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>ItemName</code> - <code>string</code> - Optional - This is the parameter format supported by the web service API. This is the item name to use.</li>
	 * 			<li><code>Attribute</code> - <code>array</code> - Optional -  This is the parameter format supported by the web service API. This is the attribute node. <ul>
	 * 				<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 					<li><code>Name</code> - <code>string</code> - Required - The name of the attribute. </li>
	 * 					<li><code>AlternateNameEncoding</code> - <code>string</code> - Optional - This is the parameter format supported by the web service API. This is the alternate name encoding to use.</li>
	 * 					<li><code>Value</code> - <code>string</code> - Required - The value of the attribute. </li>
	 * 					<li><code>AlternateValueEncoding</code> - <code>string</code> - Optional - This is the parameter format supported by the web service API. This is the alternate value encoding to use.</li>
	 * 				</ul></li>
	 * 			</ul></li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 *  <li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This is useful for manually-managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function batch_delete_attributes($domain_name, $item_keypairs, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DomainName'] = $domain_name;

		$opt = array_merge($opt, CFComplexType::map(
			self::remap_batch_items_for_complextype($item_keypairs)
		));

		if (isset($opt['Item']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Item' => $opt['Item']
			)));
			unset($opt['Item']);
		}

		return $this->authenticate('BatchDeleteAttributes', $opt, $this->hostname);
	}

	/**
	 *
	 * The <code>DeleteDomain</code> operation deletes a domain. Any items (and their attributes) in the domain are deleted as well. The
	 * <code>DeleteDomain</code> operation might take 10 or more seconds to complete.
	 *
	 * Running <code>DeleteDomain</code> on a domain that does not exist or running the function multiple times using the same domain name will
	 * not result in an error response.
	 *
	 * @param string $domain_name (Required) The name of the domain to delete.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_domain($domain_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DomainName'] = $domain_name;

		return $this->authenticate('DeleteDomain', $opt, $this->hostname);
	}

	/**
	 *
	 * The <code>CreateDomain</code> operation creates a new domain. The domain name should be unique among the domains associated with the Access
	 * Key ID provided in the request. The <code>CreateDomain</code> operation may take 10 or more seconds to complete.
	 *
	 * CreateDomain is an idempotent operation; running it multiple times using the same domain name will not result in an error response.
	 *
	 * The client can create up to 100 domains per account.
	 *
	 * If the client requires additional domains, go to <a
	 * href="http://aws.amazon.com/contact-us/simpledb-limit-request/">http://aws.amazon.com/contact-us/simpledb-limit-request/</a>.
	 *
	 * @param string $domain_name (Required) The name of the domain to create. The name can range between 3 and 255 characters and can contain the following characters: a-z, A-Z, 0-9, '_', '-', and '.'.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function create_domain($domain_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DomainName'] = $domain_name;

		return $this->authenticate('CreateDomain', $opt, $this->hostname);
	}

	/**
	 * Deletes one or more attributes associated with the item. If all attributes of an item are deleted,
	 * the item is deleted.
	 *
	 * If you specify DeleteAttributes without attributes or values, all the attributes for the item are
	 * deleted.
	 *
	 * DeleteAttributes is an idempotent operation; running it multiple times on the same item or
	 * attribute does not result in an error response.
	 *
	 * Because Amazon SimpleDB makes multiple copies of your data and uses an eventual consistency update
	 * model, performing a GetAttributes or Select request (read) immediately after a DeleteAttributes or
	 * PutAttributes request (write) might not return the updated data.
	 *
	 * @param string $domain_name (Required) The name of the domain in which the attributes are being deleted.
	 * @param string $item_name (Required) The name of the base item which will contain the series of keypairs.
	 * @param array $attributes (Optional) Similar to columns on a spreadsheet, attributes represent categories of data that can be assigned to items. Takes an associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Attribute</code> - <code>array</code> - Optional -  This is the parameter format supported by the web service API. This is the attribute node.<ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>Name</code> - <code>string</code> - Required - The name of the attribute. </li>
	 * 			<li><code>AlternateNameEncoding</code> - <code>string</code> - Optional - This is the parameter format supported by the web service API. This is the alternate name encoding to use.</li>
	 * 			<li><code>Value</code> - <code>string</code> - Required - The value of the attribute. </li>
	 * 			<li><code>AlternateValueEncoding</code> - <code>string</code> - Optional - This is the parameter format supported by the web service API. This is the alternate value encoding to use.</li>
	 * 		</ul></li>
	 * 	</ul></li></ul>
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Expected</code> - <code>array</code> - Optional - The update condition which, if specified, determines if the specified attributes will be updated or not. The update condition must be satisfied in order for this request to be processed and the attributes to be updated. <ul>
	 * 		<li><code>Name</code> - <code>string</code> - Optional - The name of the attribute involved in the condition.</li>
	 * 		<li><code>Value</code> - <code>string</code> - Optional - The value of an attribute. This value can only be specified when the exists parameter is equal to true.</li>
	 * 		<li><code>Exists</code> - <code>string</code> - Optional - True if the specified attribute must exist with the specified value in order for this update condition to be satisfied, otherwise false if the specified attribute should not exist in order for this update condition to be satisfied.</li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 *  <li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This is useful for manually-managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function delete_attributes($domain_name, $item_name, $attributes = null, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DomainName'] = $domain_name;
		$opt['ItemName'] = $item_name;

		if ($attributes)
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Attribute' => (is_array($attributes) ? $attributes : array($attributes))
			)));
		}

		if (isset($opt['Expected']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Expected' => $opt['Expected']
			)));
			unset($opt['Expected']);
		}

		return $this->authenticate('DeleteAttributes', $opt, $this->hostname);
	}

	/**
	 *
	 * The <code>ListDomains</code> operation lists all domains associated with the Access Key ID. It returns domain names up to the limit set by
	 * <a href="#MaxNumberOfDomains">MaxNumberOfDomains</a>. A <a href="#NextToken">NextToken</a> is returned if there are more than
	 * <code>MaxNumberOfDomains</code> domains. Calling <code>ListDomains</code> successive times with the <code>NextToken</code> provided by the
	 * operation returns up to <code>MaxNumberOfDomains</code> more domain names with each successive operation call.
	 *
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>MaxNumberOfDomains</code> - <code>integer</code> - Optional - The maximum number of domain names you want returned. The range is 1 to 100. The default setting is 100. </li>
	 * 	<li><code>NextToken</code> - <code>string</code> - Optional - A string informing Amazon SimpleDB where to start the next list of domain names. </li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function list_domains($opt = null)
	{
		if (!$opt) $opt = array();

		return $this->authenticate('ListDomains', $opt, $this->hostname);
	}

	/**
	 * Returns all of the attributes associated with the item. Optionally, the attributes returned can be
	 * limited to one or more specified attribute name parameters.
	 *
	 * If the item does not exist on the replica that was accessed for this operation, an empty set is
	 * returned. The system does not return an error as it cannot guarantee the item does not exist on
	 * other replicas.
	 *
	 * If you specify GetAttributes without any attribute names, all the attributes for the item are
	 * returned.
	 *
	 * @param string $domain_name (Required) The name of the domain in which to perform the operation.
	 * @param string $item_name (Required) The name of the base item which will contain the series of keypairs.
	 * @param string|array $attribute_name (Optional) The names of the attributes. Pass a string for a single value, or an indexed array for multiple values.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>ConsistentRead</code> - <code>boolean</code> - Optional - True if strong consistency should be enforced when data is read from SimpleDB, meaning that any data previously written to SimpleDB will be returned. Without specifying this parameter, results will be eventually consistent, and you may not see data that was written immediately before your read.</li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 *  <li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This is useful for manually-managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function get_attributes($domain_name, $item_name, $attribute_name = null, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DomainName'] = $domain_name;
		$opt['ItemName'] = $item_name;

		if ($attribute_name)
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'AttributeName' => (is_array($attribute_name) ? $attribute_name : array($attribute_name))
			)));
		}

		return $this->authenticate('GetAttributes', $opt, $this->hostname);
	}

	/**
	 * The BatchPutAttributes operation creates or replaces attributes within one or more items.
	 *
	 * Attributes are uniquely identified within an item by their name/value combination. For example, a single item can
	 * have the attributes <code>{ "first_name", "first_value" }</code> and <code>{"first_name", "second_value" }</code>.
	 * However, it cannot have two attribute instances where both the item attribute name and item attribute value are
	 * the same.
	 *
	 * Optionally, the requester can supply the <code>Replace</code> parameter for each individual value. Setting this value to
	 * true will cause the new attribute value to replace the existing attribute value(s). For example, if an item I has the
	 * attributes <code>{ 'a', '1' }, { 'b', '2'}</code> and <code>{ 'b', '3' }</code> and the requester does a
	 * <code>BatchPutAttributes</code> of <code>{'I', 'b', '4' }</code> with the <code>Replace</code> parameter set to true,
	 * the final attributes of the item will be { 'a', '1' } and { 'b', '4' }, replacing the previous values of the 'b'
	 * attribute with the new value. You cannot specify an empty string as an item or attribute name.
	 *
	 * The BatchPutAttributes operation succeeds or fails in its entirety. There are no partial puts. You can execute multiple
	 * BatchPutAttributes operations and other operations in parallel. However, large numbers of concurrent BatchPutAttributes
	 * calls can result in Service Unavailable (503) responses. The following limitations are enforced for this operation:
	 *
	 * <ul>
	 * 	<li>256 attribute name-value pairs per item</li>
	 * 	<li>1 MB request size</li>
	 * 	<li>1 billion attributes per domain</li>
	 * 	<li>10 GB of total user data storage per domain</li>
	 * 	<li>25 item limit per BatchPutAttributes operation</li>
	 * </ul>
	 *
	 * @param string $domain_name (Required) The name of the domain in which the attributes are being deleted.
	 * @param array $item_keypairs (Required) Associative array of parameters which are treated as item-key-value and item-key-multivalue pairs (i.e. a key can have one or more values; think tags). <ul>
	 * 	<li><code>[item]</code> - <code>array</code> - Set the custom item name as the key for this value. <ul>
	 * 		<li><code>[key]</code> - <code>array</code> - Set the custom key name as the key for this value. For the value, pass a string for a single value, or an indexed array for multiple values.</li>
	 * 	</ul></li>
	 * </ul>
	 * @param boolean|array $replace (Optional) Whether to replace a key-value pair if a matching key already exists. Supports either a boolean (which affects ALL key-value pairs) or an indexed array of key names (which affects only the keys specified). Defaults to boolean <code>false</code>.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>Item</code> - <code>array</code> - Optional - A list of items on which to perform the operation. <ul>
	 * 		<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 			<li><code>ItemName</code> - <code>string</code> - Optional - This is the parameter format supported by the web service API. This is the item name to use.</li>
	 * 			<li><code>Attribute</code> - <code>array</code> - Optional -  This is the parameter format supported by the web service API. This is the attribute node. <ul>
	 * 				<li><code>x</code> - <code>array</code> - This represents a simple array index. <ul>
	 * 					<li><code>Name</code> - <code>string</code> - Required - The name of the attribute. </li>
	 * 					<li><code>AlternateNameEncoding</code> - <code>string</code> - Optional - This is the parameter format supported by the web service API. This is the alternate name encoding to use.</li>
	 * 					<li><code>Value</code> - <code>string</code> - Required - The value of the attribute. </li>
	 * 					<li><code>AlternateValueEncoding</code> - <code>string</code> - Optional - This is the parameter format supported by the web service API. This is the alternate value encoding to use.</li>
	 * 				</ul></li>
	 * 			</ul></li>
	 * 		</ul></li>
	 * 	</ul></li>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 *  <li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This is useful for manually-managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function batch_put_attributes($domain_name, $item_keypairs, $replace = null, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DomainName'] = $domain_name;

		$opt = array_merge($opt, CFComplexType::map(
			self::remap_batch_items_for_complextype($item_keypairs, $replace)
		));

		if (isset($opt['Item']))
		{
			$opt = array_merge($opt, CFComplexType::map(array(
				'Item' => $opt['Item']
			)));
			unset($opt['Item']);
		}

		return $this->authenticate('BatchPutAttributes', $opt, $this->hostname);
	}

	/**
	 *
	 * Returns information about the domain, including when the domain was created, the number of items and attributes in the domain, and the size
	 * of the attribute names and values.
	 *
	 * @param string $domain_name (Required) The name of the domain for which to display the metadata of.
	 * @param array $opt (Optional) An associative array of parameters that can have the following keys: <ul>
	 * 	<li><code>curlopts</code> - <code>array</code> - Optional - A set of values to pass directly into <code>curl_setopt()</code>, where the key is a pre-defined <code>CURLOPT_*</code> constant.</li>
	 * 	<li><code>returnCurlHandle</code> - <code>boolean</code> - Optional - A private toggle specifying that the cURL handle be returned rather than actually completing the request. This toggle is useful for manually managed batch requests.</li></ul>
	 * @return CFResponse A <CFResponse> object containing a parsed HTTP response.
	 */
	public function domain_metadata($domain_name, $opt = null)
	{
		if (!$opt) $opt = array();
		$opt['DomainName'] = $domain_name;

		return $this->authenticate('DomainMetadata', $opt, $this->hostname);
	}
}


/*%******************************************************************************************%*/
// EXCEPTIONS

/**
 * Default SDB Exception.
 */
class SDB_Exception extends Exception {}