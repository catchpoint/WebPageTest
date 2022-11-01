<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

include 'common.inc';


//region HEADER 
ob_start();
define('NOBANNER', true); // otherwise Twitch banner shows 2x
$tab = 'Test Result';
$subtab = 'Processing';
include_once 'header.inc';
$results_header = ob_get_contents();
ob_end_clean();
//endregion

//region SETUP
$processing = GetDevToolsCPUTime($testPath, $run, $cached);

if (isset($processing)) {
    arsort($processing);
    $mapping = array('EvaluateScript' => 'Scripting',
                    'v8.compile' => 'Scripting',
                    'FunctionCall' => 'Scripting',
                    'GCEvent' => 'Scripting',
                    'TimerFire' => 'Scripting',
                    'EventDispatch' => 'Scripting',
                    'TimerInstall' => 'Scripting',
                    'TimerRemove' => 'Scripting',
                    'XHRLoad' => 'Scripting',
                    'XHRReadyStateChange' => 'Scripting',
                    'MinorGC' => 'Scripting',
                    'MajorGC' => 'Scripting',
                    'FireAnimationFrame' => 'Scripting',
                    'ThreadState::completeSweep' => 'Scripting',
                    'Heap::collectGarbage' => 'Scripting',
                    'ThreadState::performIdleLazySweep' => 'Scripting',

                    'Layout' => 'Layout',
                    'UpdateLayoutTree' => 'Layout',
                    'RecalculateStyles' => 'Layout',
                    'ParseAuthorStyleSheet' => 'Layout',
                    'ScheduleStyleRecalculation' => 'Layout',
                    'InvalidateLayout' => 'Layout',

                    'Paint' => 'Painting',
                    'DecodeImage' => 'Painting',
                    'Decode Image' => 'Painting',
                    'ResizeImage' => 'Painting',
                    'CompositeLayers' => 'Painting',
                    'Rasterize' => 'Painting',
                    'PaintImage' => 'Painting',
                    'PaintSetup' => 'Painting',
                    'ImageDecodeTask' => 'Painting',
                    'GPUTask' => 'Painting',
                    'SetLayerTreeId' => 'Painting',
                    'layerId' => 'Painting',
                    'UpdateLayer' => 'Painting',
                    'UpdateLayerTree' => 'Painting',
                    'Draw LazyPixelRef' => 'Painting',
                    'Decode LazyPixelRef' => 'Painting',

                    'ParseHTML' => 'Loading',
                    'ResourceReceivedData' => 'Loading',
                    'ResourceReceiveResponse' => 'Loading',
                    'ResourceSendRequest' => 'Loading',
                    'ResourceFinish' => 'Loading',
                    'CommitLoad' => 'Loading',

                    'Idle' => 'Idle');

    $groups = array('Scripting' => 0, 
                    'Layout' => 0, 
                    'Painting' => 0, 
                    'Loading' => 0, 
                    'Other' => 0, 
                    'Idle' => 0);

    $groupColors = array('Scripting' => '#f1c453',
                        'Layout' => '#9a7ee6',
                        'Painting' => '#71b363',
                        'Loading' => '#70a2e3',
                        'Other' => '#f16161',
                        'Idle' => '#cbd1d9');
                       
                        
    if (!array_key_exists('Idle', $processing)) {
        $processing['Idle'] = 0;
    }

    foreach ($processing as $type => $time) {
        $group = 'Other';
        if (array_key_exists($type, $mapping)) {
            $group = $mapping[$type];
        }
        $groups[$group] += $time;
    }
}
//endregion

//region template
require_once __DIR__ . '/resources/view.php';
echo view('pages.breakdownTimeline', [
    'test_results_view' => true,
    'body_class' => 'result',
    'results_header' => $results_header,
    'processing' => $processing,
    'mapping' => $mapping,
    'group' => $group,
    'groups' => $groups,
    'groupColors' => $groupColors,
    'timeline_url' => "/timeline/" . VER_TIMELINE . "timeline.php?test=$id&run=$run&cached=$cached" // Slight testing problem with this on my docker image
]);
//endregion
?>