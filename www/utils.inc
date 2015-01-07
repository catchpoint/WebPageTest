<?php 

	/**
	 * Delivers the full eventname from jobname, event string and line number
	 * @param string $jobLabel
	 * 		name of the job
	 * @param string $eventString
	 * 		string describing the event (from wptdriver files)
	 * @param int $eventNumber
	 * 		number of current page (just needed if setEventName hasn't been used)
	 */
	function getFullEventName($jobLabel, $eventString, $eventNumber){		
		if(trim($eventString) == ""){
			if(trim($jobLabel) == ""){				
				$job = "Unnamed Job";
			} else {
				$job = $jobLabel;
			}			
			$event = $job . ' ' . ($eventNumber + 1);
		} else {
			$event = $eventString;
		}
		
		return $event;
	}
	
	/**
	 * array to cache event name ids
	 */ 
	global $eventNameIDs;
	
	/**
	 * Delivers an ID for the given event name
	 * @param unknown $eventName
	 * 		event name
	 * @return mixed|string
	 * 		calculated id
	 */	
	function getEventNameID($eventName){
		if($eventName != null){
			if(isset($eventNameIDs[$eventName])){
				return $eventNameIDs[$eventName];
			}
			$eventNameID = str_replace(" ", "_", $eventName);
			$eventNameID = preg_replace("/[^a-zA-Z_0-9_-]/", "", $eventNameID);	
			$eventNameIDs[$eventName] = $eventNameID;
			return $eventNameID;
		}
		return "";
	}

	/**
	 * array to cache short event names
	 */ 
	global $shortEventNames;
	
	/**
	 * Delivers an short name for the given event name (first characters of every word)
	 * @param unknown $eventName
	 * 		event name
	 * @return mixed|string
	 * 		calculated short name
	 */
	function getShortEventName($eventName){
		if($eventName != null){		
			if(isset($shortEventNames[$eventName])){
				return $shortEventNames[$eventName];
			}
			$wordArray = explode(" ", $eventName);
			foreach($wordArray as $word){
				// html special char?
				if($word[0] == "&"){
					$html = explode(";", $word);
					$eventShortName .= ($html[0].";");
				} else {
					$eventShortName .= $word[0];
				}
			}
			$shortEventNames[$eventName] = $eventShortName;
			return $eventShortName;
		}
		return "";
	}
	
	/**
	 * Function to check a condition for every event name (e.g. exists an event which has a domTime)
	 * 
	 * 		Checks the following array elements (according to set parameters):
	 * 			$array
	 * 				[<All event names>]
	 * 					[$subEventArray][<All event names>] (optional)
	 *              	[$subArray1] (optional)
	 *              	[$subArray2] (optional)
	 *              [$key]
	 *          
	 *      Checks for each event element in $array:
	 *      
	 *      (array_key_exists(	$key, 
	 *      					$array[$eventName]
	 *      						[$subEventArray][<All event names>]
	 *              				[$subArray1]
	 *              				[$subArray2]
	 *              			[$key]) &&
	 *      ($cast) (optional)
	 *      ($array[$eventName]
	 *      	[$subEventArray][<All event names>]
	 *          [$subArray1]
	 *          [$subArray2]
	 *       [$key]) $operator $compare
	 *     
	 *	e.g.: 	checkForAllEventNames($pageDataArray, 'domTime', '>', 0.0, "float", -1, $fvMedian, 0):
	 *		
	 *			$result = true;
	 *			For all events as $eventName
	 *				$result |= (array_key_exists('domTime', $pageDataArray[<All event names>][$fvMedian][0]) && 
	 *							(float)$pageDataArray[$eventName][$fvMedian][0] > 0.0)
	 *      	
	 * 
	 * @param array $array
	 * 		array containing all event data
	 * @param string $key
	 * 		key that should be compared for each event
	 * @param string $operator
	 * 		operator to compare as string
	 * @param mixed $compare
	 * 		value to compare with
	 * @param string $cast
	 * 		casts the array value to a specific type if defined (optional, as string)
	 * @param string $subEventArray
	 * 		array key to reach access subArray which also contains event names keys (optional)
	  * @param string $subArray1
	 * 		array key to reach access to subArray (optional)
	 * @return boolean
	 * 		returns if in one event the condition is fulfilled
	 */
	function checkForAllEventNames($array, $key, $operator, $compare, $cast=null, $subEventArray=-1, $subArray1=-1, $subArray2=-1){
		$result = false;
		$code = '$result |= (array_key_exists($key, $array[$eventName]';
		if($subEventArray != -1){
			$code .= '[$subEventArray][$eventName]';
		}
		if($subArray1 != -1){
			$code .= '[$subArray1]';
		}
		if($subArray2 != -1){
			$code .= '[$subArray2]';
		}
		$code .= ') && (';
		if($cast != null){
			$code .= '('.$cast.')';
		}
		$code .= '$array[$eventName]';
		if($subEventArray != -1){
			$code .= '[$subEventArray][$eventName]';
		}
		if($subArray1 != -1){
			$code .= '[$subArray1]';
		}
		if($subArray2 != -1){
			$code .= '[$subArray2]';
		}
		$code .= '[$key]';		
		$code .=') '.$operator.' $compare);';
		foreach(array_keys($array) as $eventName){
			eval($code);
		}
		return $result;
	}
	
	/**
	 * Function to convert umlauts back to readable umlauts
	 * @param unknown $string
	 * 		string to convert umlauts in
	 * @return mixed
	 * 		string with converted umlauts
	 */
	function readableUmlauts($string){
		$string = str_replace ("&amp;", "&", $string);
		$string = str_replace ("&auml;", "ä", $string);
		$string = str_replace ("&Auml;", "Ä", $string);
		$string = str_replace ("&ouml;", "ö", $string);
		$string = str_replace ("&Ouml;", "Ö", $string);
		$string = str_replace ("&uuml;", "ü", $string);
		$string = str_replace ("&Uuml;", "Ü", $string);
		$string = str_replace ("&szlig;", "ß", $string);
		return $string;
	}
	
	/**
	 * Checks the key for an option of the option array.
	 * Returns false if option is null or key isn't set.
	 * Otherwise the value of the option is returned.
	 * @param unknown $key
	 * 		key for the option
	 * @param unknown $options
	 * 		option array
	 * @return
	 * 		false or option value
	 */
	function checkOptionKeyAndGetValue($key, $options){
		$result = isset($options) && array_key_exists($key, $options);
		if($result){
			$result = $options[$key];
		}
		return $result;
	}
	
	/**
	 * Checks option with name $name of the option array and sets the default value $default if no value is set
	 * @param unknown $name
	 * 		name of the value
	 * @param unknown $default
	 * 		default value if no value is set
	 * @param unknown $options
	 * 		options array to check and for adding default value
	 */
	function setDefaultForUnusedOption($name, $default, &$options){
		if(!isset($options[$name])){
			$options[$name] = $default;
		}
	}

?>