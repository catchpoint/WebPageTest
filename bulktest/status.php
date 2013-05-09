<?php
include './settings.inc';

$results = array();
$errors = array();
$urlErrors = array();

// see if there is an existing test we are working with
if (LoadResults($results)) {
    // count the number of tests that don't have status yet
    $testCount = 0;
    foreach ($results as &$result) {
        if (array_key_exists('id', $result) && 
            strlen($result['id']) && 
            (!array_key_exists('result', $result) || !strlen($result['result'])))
            $testCount++;
    }
            
    if ($testCount) {
        echo "Updating the status for $testCount tests...\r\n";
        UpdateResults($results, $testCount);
    }
        
    // go through and provide a summary of the results
    $testCount = count($results);
    $failedSubmit = 0;
    $complete = 0;
    $stillTesting = 0;
    $failed = 0;
    foreach ($results as &$result) {
        if (array_key_exists('id', $result) && strlen($result['id'])) {
            if (array_key_exists('result', $result) && strlen($result['result'])) {
                $complete++;
                $result['resubmit'] = false;
                $stddev = 0;
                if (array_key_exists('docTime', $result) &&
                    array_key_exists('docTime.stddev', $result) &&
                    $result['docTime'] > 0)
                    $stddev = ($result['docTime.stddev'] / $result['docTime']) * 100;
                if (($result['result'] != 0 && $result['result'] != 99999 ) ||
                    !$result['bytesInDoc'] ||
                    !$result['docTime'] ||
                    !$result['TTFB'] ||
                    $result['TTFB'] > $result['docTime'] ||
                    $stddev > $maxVariancePct || // > 10% variation in results
                    (isset($maxBandwidth) && $maxBandwidth && (($result['bytesInDoc'] * 8) / $result['docTime']) > $maxBandwidth)) {
                    if (!array_key_exists($result['label'], $errors))
                        $errors[$result['label']] = 1;
                    else
                        $errors[$result['label']]++;
                    if (!array_key_exists($result['url'], $urlErrors))
                        $urlErrors[$result['url']] = 1;
                    else
                        $urlErrors[$result['url']]++;
                    $failed++;
                    $result['resubmit'] = true;
                }
            } else {
                $stillTesting++;
            }
        } else {
            $failedSubmit++;
        }
    }
    
    if( $failed ) {
        echo "Errors by location:\r\n";
        foreach ($errors as $label => $count)
            echo "  $label: $count\r\n";
        echo "\r\n\r\nErrors by URL:\r\n";
        foreach ($urlErrors as $url => $count)
            echo "  $url: $count\r\n";
    }
    echo "\r\nUpdate complete (and the results are in results.txt):\r\n";
    echo "\t$testCount tests in total (each url across all locations)\r\n";
    echo "\t$complete tests have completed\r\n";
    if( $failedSubmit )
        echo "\t$failedSubmit were not submitted successfully and need to be re-submitted\r\n";
    if( $stillTesting )
        echo "\t$stillTesting are still waiting to be tested\r\n";
    if( $failed )
        echo "\t$failed returned an error while testing (page timeot, test error, etc)\r\n\r\n";

    StoreResults($results);
} else {
    echo "No tests found in results.txt\r\n";  
}

/**
* Go through and update the status of all of the tests
* 
* @param mixed $results
*/
function UpdateResults(&$results, $testCount) {
    global $server;

    $count = 0;
    $changed = false;
    foreach ($results as &$result) {
        if (array_key_exists('id', $result) && 
            strlen($result['id']) && 
            (!array_key_exists('result', $result) || !strlen($result['result']))) {
            $count++;
            echo "\rUpdating the status of test $count of $testCount...                  ";

            $doc = new MyDOMDocument();
            if ($doc) {
                $url = "{$server}xmlResult/{$result['id']}/";
                $response = file_get_contents($url);
                if (strlen($response)) {
                    $response = preg_replace('/[^(\x20-\x7F)]*/','', $response);
                    $doc->loadXML($response);
                    $data = $doc->toArray();
                    $status = (int)$data['response']['statusCode'];
                    
                    if ($status == 200) {
                        $changed = true;
                        
                        // test is complete, get the actual result
                        GetTestResult($data['response']['data'], $result);
                    }

                    unset( $doc );
                }
            }
        }
    }

    // clear the progress text
    echo "\r                                                     \r";
}

/**
* Parse the results for the given test
* 
* @param mixed $result
*/
function GetTestResult(&$data, &$result) {
    global $metrics;
    if (array_key_exists('median', $data) && array_key_exists('firstView', $data['median'])) {
        $result['result'] = (int)$data['median']['firstView']['result'];
        $result['successfulRuns'] =(int)$data['successfulFVRuns'];
        foreach ($metrics as $metric) {
            if (array_key_exists($metric, $data['median']['firstView']))
              $result[$metric] = (int)$data['median']['firstView'][$metric];
            if (array_key_exists('standardDeviation', $data) &&
                is_array($data['standardDeviation']) &&
                array_key_exists('firstView', $data['standardDeviation']) &&
                is_array($data['standardDeviation']['firstView']) &&
                array_key_exists($metric, $data['standardDeviation']['firstView']))
                $result["$metric.stddev"] = (int)$data['standardDeviation']['firstView'][$metric];
        }
        
        if (array_key_exists('repeatView', $data['median'])) {
            $result['rv_result'] = (int)$data['median']['repeatView']['result'];
            foreach ($metrics as $metric) {
                $result["rv_$metric"] = (int)$data['median']['repeatView'][$metric];
                if (array_key_exists('standardDeviation', $data) &&
                    is_array($data['standardDeviation']) &&
                    array_key_exists('repeatView', $data['standardDeviation']) &&
                    is_array($data['standardDeviation']['repeatView']) &&
                    array_key_exists($metric, $data['standardDeviation']['repeatView']))
                    $result["rv_$metric.stddev"] = (int)$data['standardDeviation']['repeatView'][$metric];
            }
            $result['rv_successfulRuns'] =(int)$data['successfulRVRuns'];
        }
    }
}

class MyDOMDocument extends DOMDocument
{
    public function toArray(DOMNode $oDomNode = null)
    {
        // return empty array if dom is blank
        if (is_null($oDomNode) && !$this->hasChildNodes()) {
            return array();
        }
        $oDomNode = (is_null($oDomNode)) ? $this->documentElement : $oDomNode;
        if (!$oDomNode->hasChildNodes()) {
            $mResult = $oDomNode->nodeValue;
        } else {
            $mResult = array();
            foreach ($oDomNode->childNodes as $oChildNode) {
                // how many of these child nodes do we have?
                // this will give us a clue as to what the result structure should be
                $oChildNodeList = $oDomNode->getElementsByTagName($oChildNode->nodeName); 
                $iChildCount = 0;
                // there are x number of childs in this node that have the same tag name
                // however, we are only interested in the # of siblings with the same tag name
                foreach ($oChildNodeList as $oNode) {
                    if ($oNode->parentNode->isSameNode($oChildNode->parentNode)) {
                        $iChildCount++;
                    }
                }
                $mValue = $this->toArray($oChildNode);
                $sKey   = ($oChildNode->nodeName{0} == '#') ? 0 : $oChildNode->nodeName;
                $mValue = is_array($mValue) ? $mValue[$oChildNode->nodeName] : $mValue;
                // how many of thse child nodes do we have?
                if ($iChildCount > 1) {  // more than 1 child - make numeric array
                    $mResult[$sKey][] = $mValue;
                } else {
                    $mResult[$sKey] = $mValue;
                }
            }
            // if the child is <foo>bar</foo>, the result will be array(bar)
            // make the result just 'bar'
            if (count($mResult) == 1 && isset($mResult[0]) && !is_array($mResult[0])) {
                $mResult = $mResult[0];
            }
        }
        // get our attributes if we have any
        $arAttributes = array();
        if ($oDomNode->hasAttributes()) {
            foreach ($oDomNode->attributes as $sAttrName=>$oAttrNode) {
                // retain namespace prefixes
                $arAttributes["@{$oAttrNode->nodeName}"] = $oAttrNode->nodeValue;
            }
        }
        // check for namespace attribute - Namespaces will not show up in the attributes list
        if ($oDomNode instanceof DOMElement && $oDomNode->getAttribute('xmlns')) {
            $arAttributes["@xmlns"] = $oDomNode->getAttribute('xmlns');
        }
        if (count($arAttributes)) {
            if (!is_array($mResult)) {
                $mResult = (trim($mResult)) ? array($mResult) : array();
            }
            $mResult = array_merge($mResult, $arAttributes);
        }
        $arResult = array($oDomNode->nodeName=>$mResult);
        return $arResult;
    }
}
?>

