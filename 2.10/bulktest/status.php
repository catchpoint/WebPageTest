<?php
include './settings.inc';

$results = array();
$errors = array();

// see if there is an existing test we are working with
if (LoadResults($results)) {
    // count the number of tests that don't have status yet
    $testCount = 0;
    foreach ($results as &$result) {
        if (array_key_exists('id', $result) && 
            strlen($result['id']) && 
            (!array_key_exists('result', $result) || !strlen($result['result']))) {
//            true) {
            $testCount++;
        }
    }
            
    if ($testCount) {
        echo "Updating the status for $testCount tests...\r\n";
        
        UpdateResults($results, $testCount);
        
        // store the results
        StoreResults($results);
        
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
                    if (($result['result'] != 0 && $result['result'] != 99999 ) ||
                        !$result['bytes'] ||
                        !$result['docComplete'] ||
                        !$result['ttfb'] ||
                        $result['ttfb'] > $result['docComplete'] ||
                        (isset($maxBandwidth) && $maxBandwidth && (($result['bytes'] * 8) / $result['docComplete']) > $maxBandwidth)) {
                        if (!array_key_exists($result['location'], $errors))
                            $errors[$result['location']] = 1;
                        else
                            $errors[$result['location']]++;
                        $failed++;
                    }
                } else {
                    $stillTesting++;
                }
            } else {
                $failedSubmit++;
            }
        }
        
        echo "Update complete (and the results are in results.txt):\r\n";
        echo "\t$testCount tests in total (each url across all locations)\r\n";
        echo "\t$complete tests have completed\r\n";
        if( $failedSubmit )
            echo "\t$failedSubmit were not submitted successfully and need to be re-submitted\r\n";
        if( $stillTesting )
            echo "\t$stillTesting are still waiting to be tested\r\n";
        if( $failed ) {
            echo "\t$failed returned an error while testing (page timeot, test error, etc)\r\n\n\n";
            echo "Errors by location:\r\n";
            foreach ($errors as $location => $count)
                echo "  $location: $count\r\n";
        }
    } else {
        echo "All tests have results available\r\n";
    }
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
//            true) {
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
    if (array_key_exists('median', $data) && array_key_exists('firstView', $data['median'])) {
        $result['result'] = (int)$data['median']['firstView']['result'];
        $result['ttfb'] = (int)$data['median']['firstView']['TTFB'];
        $result['startRender'] = (int)$data['median']['firstView']['render'];
        $result['docComplete'] = (int)$data['median']['firstView']['docTime'];
        $result['fullyLoaded'] =(int)$data['median']['firstView']['fullyLoaded'];
        $result['speedIndex'] =(int)$data['median']['firstView']['SpeedIndex'];
        $result['bytes'] =(int)$data['median']['firstView']['bytesInDoc'];
        $result['requests'] =(int)$data['median']['firstView']['requestsDoc'];
        $result['domContentReady'] = (int)$data['median']['firstView']['domContentLoadedEventStart'];
        $result['visualComplete'] = (int)$data['median']['firstView']['visualComplete'];
        $result['successfulRuns'] =(int)$data['successfulFVRuns'];
        
        if (array_key_exists('repeatView', $data['median'])) {
            $result['rv_ttfb'] = (int)$data['median']['repeatView']['TTFB'];
            $result['rv_startRender'] = (int)$data['median']['repeatView']['render'];
            $result['rv_docComplete'] = (int)$data['median']['repeatView']['docTime'];
            $result['rv_fullyLoaded'] =(int)$data['median']['repeatView']['fullyLoaded'];
            $result['rv_speedIndex'] =(int)$data['median']['repeatView']['SpeedIndex'];
            $result['rv_bytes'] =(int)$data['median']['repeatView']['bytesInDoc'];
            $result['rv_requests'] =(int)$data['median']['repeatView']['requestsDoc'];
            $result['domContentReady'] = (int)$data['median']['repeatView']['domContentLoadedEventStart'];
            $result['visualComplete'] = (int)$data['median']['repeatView']['visualComplete'];
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

