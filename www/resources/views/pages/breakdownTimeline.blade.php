@extends('default')

@section('content')


<div class="results_main_contain">
    <div class="results_main">
       <div class="results_and_command">
          <div class="results_header">
             <h2>Main-thread Processing</h2>
             <p>Where the browser's main thread was busy, not including idle time waiting for resources
                <a href={{ $timeline_url }} title="View Chrome Dev Tools Timeline">view timeline</a>
                .
             </p>
          </div>
       </div>
       <div id="result" class="results_body">
          <h3 class="hed_sub">Processing Breakdown</h3>
          <div class="breakdownFrame">
             <div class="breakdownFrame_item">
                <div id="pieGroups" ></div>
                <div class="table visualization_table" id="tableGroups" ></div>
             </div>
             <div class="breakdownFrame_item">
                <div id="pieEvents" ></div>
                <div class="table visualization_table" id="tableEvents"></div>
             </div>
          </div>
          <h3 class="hed_sub">Timing Breakdown</h3>
          <p>All of the main-thread activity including idle (waiting for resources usually)
             <a href={{ $timeline_url }} title="View Chrome Dev Tools Timeline">view timeline</a>
          </p>
          <div class="breakdownFrame">
             <div class="breakdownFrame_item">
                <div id="pieGroupsIdle" ></div>
                <div class="table visualization_table" id="tableGroupsIdle"></div>
             </div>
             <div class="breakdownFrame_item">
                <div id="pieEventsIdle"></div>
                <div class="table visualization_table" id="tableEventsIdle"></div>
             </div>
          </div>
       </div>
    </div>
 </div>

<!--Load the AJAX API-->
<script src="//www.google.com/jsapi"></script>
<script>
    var processing = {{ Illuminate\Support\Js::from($processing) }};
    var Mapping = {
        'EvaluateScript' : 'Scripting',
        'v8.compile' : 'Scripting',
        'FunctionCall' : 'Scripting',
        'GCEvent' : 'Scripting',
        'TimerFire' : 'Scripting',
        'EventDispatch' : 'Scripting',
        'TimerInstall' : 'Scripting',
        'TimerRemove' : 'Scripting',
        'XHRLoad' : 'Scripting',
        'XHRReadyStateChange' : 'Scripting',
        'MinorGC' : 'Scripting',
        'MajorGC' : 'Scripting',
        'FireAnimationFrame' : 'Scripting',
        'ThreadState::completeSweep' : 'Scripting',
        'Heap::collectGarbage' : 'Scripting',
        'ThreadState::performIdleLazySweep' : 'Scripting',

        'Layout' : 'Layout',
        'UpdateLayoutTree' : 'Layout',
        'RecalculateStyles' : 'Layout',
        'ParseAuthorStyleSheet' : 'Layout',
        'ScheduleStyleRecalculation' : 'Layout',
        'InvalidateLayout' : 'Layout',

        'Paint' : 'Painting',
        'DecodeImage' : 'Painting',
        'Decode Image' : 'Painting',
        'ResizeImage' : 'Painting',
        'CompositeLayers' : 'Painting',
        'Rasterize' : 'Painting',
        'PaintImage' : 'Painting',
        'PaintSetup' : 'Painting',
        'ImageDecodeTask' : 'Painting',
        'GPUTask' : 'Painting',
        'SetLayerTreeId' : 'Painting',
        'layerId' : 'Painting',
        'UpdateLayer' : 'Painting',
        'UpdateLayerTree' : 'Painting',
        'Draw LazyPixelRef' : 'Painting',
        'Decode LazyPixelRef' : 'Painting',

        'ParseHTML' : 'Loading',
        'ResourceReceivedData' : 'Loading',
        'ResourceReceiveResponse' : 'Loading',
        'ResourceSendRequest' : 'Loading',
        'ResourceFinish' : 'Loading',
        'CommitLoad' : 'Loading',

        'Idle' : 'Idle'
    }
    var Groups = {'Scripting' : 0, 'Layout' : 0, 'Painting' : 0, 'Loading' : 0, 'Other' : 0, 'Idle' : 0}
    var GroupColors = {'Scripting' :'#f1c453', 'Layout':'#9a7ee6', 'Painting':'#71b363', 'Loading':'#70a2e3', 'Other':'#f16161', 'Idle':'#cbd1d9'
    }

function TableRowDataNoIdle(serverData, needMapping){
    data = [];
    colors = [];

    for (var [type, time] of Object.entries(serverData)) {
        if (type === 'Idle'){continue}
        data.push([type , time]);
        if (needMapping == false){
            colors.push(GroupColors[type]);
        }else if(type in Mapping){
            colors.push(GroupColors[Mapping[type]]);
        }else{
            colors.push(GroupColors['Other']);
        }
    }
    
    return { data, colors };
}
// Load the Visualization API and the table package.
google.load('visualization', '1', {'packages':['table', 'corechart']});
google.setOnLoadCallback(drawTable);
function drawTable() {
    if (processing === null || processing.length == 0){
        return;
    }
    if (!"Idle" in processing){
        processing.push("Idle", 0)
    }
    for (const [key, value] of Object.entries(processing)) {
        var group = 'Other';
        if (key in Mapping){
            group = Mapping[key]
        }
        Groups[group] += value
    }
    var i = 0
    var groupTable = TableRowDataNoIdle(Groups, false);
    var groups = new google.visualization.DataTable();
    groups.addColumn('string', 'Category');
    groups.addColumn('number', 'Time (ms)');
    groups.addRows(groupTable['data']);

    var eventsTable = TableRowDataNoIdle(processing, true);
    var events = new google.visualization.DataTable();
    events.addColumn('string', 'Event');
    events.addColumn('number', 'Time (ms)');
    events.addRows(eventsTable['data']);
    
    var viewGroups = new google.visualization.DataView(groups);
    viewGroups.setColumns([0, 1]);

    var tableGroups = new google.visualization.Table(document.getElementById('tableGroups'));
    tableGroups.draw(viewGroups, {showRowNumber: false, sortColumn: 1, sortAscending: false});

    var pieGroups = new google.visualization.PieChart(document.getElementById('pieGroups'));
    pieGroups.draw(viewGroups, {width: 450, height: 300, title: 'Processing Categories', colors: groupTable['colors']});


    var viewEvents = new google.visualization.DataView(events);
    viewEvents.setColumns([0, 1]);

    var tableEvents = new google.visualization.Table(document.getElementById('tableEvents'));
    tableEvents.draw(viewEvents, {showRowNumber: false, sortColumn: 1, sortAscending: false});

    var pieEvents = new google.visualization.PieChart(document.getElementById('pieEvents'));
    pieEvents.draw(viewEvents, {width: 450, height: 300, title: 'Processing Events', colors: eventsTable['colors']});

    // Add Idle Data to group Table
    groupTable['data'].push(['Idle' , Groups['Idle']]);
    groupTable['colors'].push(GroupColors['Idle']);

    var groupsIdle = new google.visualization.DataTable();
    groupsIdle.addColumn('string', 'Category');
    groupsIdle.addColumn('number', 'Time (ms)');
    groupsIdle.addRows(groupTable['data']);
    var groupColors = new Array();

    // Add Idle Data to eventsTable
    eventsTable['data'].push(['Idle' , processing['Idle']]);
    eventsTable['colors'].push(GroupColors['Idle']);

    var eventsIdle = new google.visualization.DataTable();
    eventsIdle.addColumn('string', 'Event');
    eventsIdle.addColumn('number', 'Time (ms)');
    eventsIdle.addRows( eventsTable['data']);
    
    var viewGroupsIdle = new google.visualization.DataView(groupsIdle);
    viewGroupsIdle.setColumns([0, 1]);

    var tableGroupsIdle = new google.visualization.Table(document.getElementById('tableGroupsIdle'));
    tableGroupsIdle.draw(viewGroupsIdle, {showRowNumber: false, sortColumn: 1, sortAscending: false});

    var pieGroupsIdle = new google.visualization.PieChart(document.getElementById('pieGroupsIdle'));
    pieGroupsIdle.draw(viewGroupsIdle, {width: 450, height: 300, title: 'Processing Categories', colors: groupTable['colors']});


    var viewEventsIdle = new google.visualization.DataView(eventsIdle);
    viewEventsIdle.setColumns([0, 1]);

    var tableEventsIdle = new google.visualization.Table(document.getElementById('tableEventsIdle'));
    tableEventsIdle.draw(viewEventsIdle, {showRowNumber: false, sortColumn: 1, sortAscending: false});

    var pieEventsIdle = new google.visualization.PieChart(document.getElementById('pieEventsIdle'));
    pieEventsIdle.draw(viewEventsIdle, {width: 450, height: 300, title: 'Processing Events', colors: eventsTable['colors']});
}
</script>

@endsection