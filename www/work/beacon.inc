<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
/**
* Send the test result beacon (to Show Slow instance)
*/
function SendBeacon($beaconUrl, $id, $testPath, &$testInfo, &$pageData)
{
    if( !$testInfo['private'] )
    {
        $medianMetric = isset($testInfo['medianMetric']) ? $testInfo['medianMetric'] : GetSetting('medianMetric', 'loadTime');
        $fvMedian = GetMedianRun($pageData, 0, $medianMetric);
        if( $fvMedian )
        {
            $data = array(  'version' => VER_WEBPAGETEST, 
                            'url' => FixUrlSlash($testInfo['url']), 
                            'id' => $id, 
                            'completed' => $testInfo['completed'], 
                            'location' => $testInfo['location']);
            if( @strlen($testInfo['connectivity']) )
            {
                $data['connectivity'] = $testInfo['connectivity'];
                if( $testInfo['bwIn'] && $testInfo['bwOut'] )
                {
                    $data['bwDown'] = $testInfo['bwIn'];
                    $data['bwUp'] = $testInfo['bwOut'];
                    $data['latency'] = $testInfo['latency'];
                    $data['plr'] = $testInfo['plr'];
                }
            }
            if( @strlen($testInfo['label']) )
                $data['label'] = $testInfo['label'];
            
            $data['first'] = $pageData[$fvMedian][0];

            $rvMedian = GetMedianRun($pageData, 1, $medianMetric);
            if( $rvMedian )
                $data['repeat'] = $pageData[$rvMedian][1];
                
            // send the actual http POST
            $postData = json_encode($data);
            $data_len = strlen($postData);
            $params = array('http' => array(
                      'method' => 'POST',
                      'header'=>"Connection: close\r\nContent-Length: $data_len\r\n",
                      'content' => $postData,
                      'timeout' => 10,
                    ));
            $ctx = stream_context_create($params);
            @file_get_contents($beaconUrl, 0, $ctx);
        }
    }
}  
?>