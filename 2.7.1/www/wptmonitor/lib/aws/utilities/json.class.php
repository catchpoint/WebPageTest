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


/*%******************************************************************************************%*/
// CLASS

/**
 * Handles the conversion of data from JSON to other formats.
 *
 * @version 2011.03.25
 * @license See the included NOTICE.md file for more information.
 * @copyright See the included NOTICE.md file for more information.
 * @link http://aws.amazon.com/php/ PHP Developer Center
 */
class CFJSON
{
	/**
	 * Converts a JSON string to a CFSimpleXML object.
	 *
	 * @param string|array $json (Required) Pass either a valid JSON-formatted string, or an associative array.
	 * @param SimpleXMLElement $xml (Optional) An XML object to add nodes to. Must be an object that is an <code>instanceof</code> a <code>SimpleXMLElement</code> object. If an object is not passed, a new one will be generated using the classname defined for <code>$parser</code>.
	 * @param string $parser (Optional) The name of the class to use to parse the XML. This class should extend <code>SimpleXMLElement</code>. Has a default value of <code>CFSimpleXML</code>.
	 * @return CFSimpleXML An XML representation of the data.
	 */
	public static function to_xml($json, SimpleXMLElement $xml = null, $parser = 'CFSimpleXML')
	{
		// If there isn't an XML object, create one
		if (!$xml)
		{
			$xml = simplexml_load_string('<?xml version="1.0" encoding="UTF-8"?><rootElement/>', $parser);
		}

		// If we haven't parsed the JSON, do it
		if (!is_array($json))
		{
			$json = json_decode($json, true);

			if (function_exists('json_last_error'))
			{
				// Did we encounter an error?
				switch (json_last_error())
				{
					case JSON_ERROR_DEPTH:
						throw new JSON_Exception('Maximum stack depth exceeded.');

					case JSON_ERROR_CTRL_CHAR:
						throw new JSON_Exception('Unexpected control character found.');

					case JSON_ERROR_SYNTAX:
						throw new JSON_Exception('Syntax error; Malformed JSON.');

					case JSON_ERROR_STATE_MISMATCH:
						throw new JSON_Exception('Invalid or malformed JSON.');
				}
			}
			else
			{
				throw new JSON_Exception('Unknown JSON error. Be sure to validate your JSON and read the notes on http://php.net/json_decode.');
			}
		}

		// Hand off for the recursive work
		self::process_json($json, $xml, $parser);

		return $xml;
	}

	/**
	 * Converts a JSON string to a CFSimpleXML object.
	 *
	 * @param string|array $json (Required) Pass either a valid JSON-formatted string, or an associative array.
	 * @param SimpleXMLElement $xml (Optional) An XML object to add nodes to. Must be an object that is an <code>instanceof</code> a <code>SimpleXMLElement</code> object. If an object is not passed, a new one will be generated using the classname defined for <code>$parser</code>.
	 * @param string $parser (Optional) The name of the class to use to parse the XML. This class should extend <code>SimpleXMLElement</code>. Has a default value of <code>CFSimpleXML</code>.
	 * @return CFSimpleXML An XML representation of the data.
	 */
	protected static function process_json($json, SimpleXMLElement $xml = null, $parser = 'CFSimpleXML')
	{
		foreach ($json as $k => $v)
		{
			if (is_array($v))
			{
				$node = $xml->addChild($k);
				self::process_json($v, $node, $parser);
			}
			else
			{
				$xml->addChild($k, $v);
			}
		}
	}
}


/**
 * Default JSON Exception.
 */
class JSON_Exception extends Exception {}
