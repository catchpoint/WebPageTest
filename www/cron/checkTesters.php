<?php
ignore_user_abort(true);
set_time_limit(36000);
chdir('..');
header ("Content-type: text/plain");
if (is_file('./settings/checkTesters.inc')) {
    if (include('./settings/checkTesters.inc')) {
        if( isset($agents) && is_array($agents)) {
            foreach($agents as $url => &$locations) {
                echo "Checking $url\n";
                CheckLocation($url, $locations);
            }
        }
    }
}

function CheckLocation($url, &$locations) {
    $doc = new MyDOMDocument();
    if( $doc ) {
        $response = file_get_contents($url);
        if( strlen($response) ) {
            $response = preg_replace('/[^(\x20-\x7F)]*/','', $response);
            $doc->loadXML($response);
            $data = $doc->toArray();
            $status = (int)$data['response']['statusCode'];
            if( $status == 200 ) {
                foreach($locations as $location => &$testers) {
                    foreach ($testers as $tester => &$cmd) {
                        CheckTester($data, $location, $tester, $cmd);
                    }
                }
            }
        }
    }
}

Function CheckTester(&$data, $location, $tester, $cmd) {
    echo "Checking $location/$tester...";
    $found = false;
    $elapsed = 0;
    // find the matching location
    foreach($data['response']['data']['location'] as &$locInfo) {
        if ($locInfo['id'] == $location) {
            foreach ($locInfo['testers']['tester'] as &$testerInfo) {
                if ($testerInfo['pc'] == $tester) {
                    $found = true;
                    $elapsed = $testerInfo['elapsed'];
                }
            }
            break;
        }
    }
    if ($found && $elapsed < 10) {
        echo "OK\n";
    } else {
        echo "Restarting - $cmd\n";
        passthru($cmd);
    }
}

//    echo passthru("ssh root@vm1.themeenans.com 'vim-cmd vmsvc/power.reset 24'");

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
