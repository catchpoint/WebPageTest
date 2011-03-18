<?php /* Smarty version Smarty-3.0.6, created on 2011-01-30 12:25:18
         compiled from "templates\report/flashGraph.tpl" */ ?>
<?php /*%%SmartyHeaderCode:295134d45ad0ec16fb5-09352924%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    '12304aa902f3e2625eb6891d1e3bde44206faf87' => 
    array (
      0 => 'templates\\report/flashGraph.tpl',
      1 => 1296411916,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '295134d45ad0ec16fb5-09352924',
  'function' => 
  array (
  ),
  'has_nocache_code' => false,
)); /*/%%SmartyHeaderCode%%*/?>
<?php if (!is_callable('smarty_function_html_select_tree')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\function.html_select_tree.php';
if (!is_callable('smarty_function_html_options')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\function.html_options.php';
if (!is_callable('smarty_function_html_select_date')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\function.html_select_date.php';
if (!is_callable('smarty_function_html_select_time')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\function.html_select_time.php';
if (!is_callable('smarty_function_html_checkboxes')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\function.html_checkboxes.php';
?><!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<?php $_template = new Smarty_Internal_Template("headIncludes.tpl", $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>

<style>
  label {
    width: 15em;
    float: none;
    font-weight: normal;
  }
</style>
<script type="text/javascript">
$(document).ready(function() {
  $("#updateForm").validate();
});
function onloadInit() {
  checkInterval();
  adjustTimeFrame();
}
function adjustTimeFrame(){
  timeFrameElement = document.getElementById('timeFrame');
  timeFrameValue = timeFrameElement[timeFrameElement.selectedIndex].value;

  startSelectElement = document.getElementById('startTimeSelect');
  endSelectElement = document.getElementById('endTimeSelect');

  if ( timeFrameValue > 0 ){
    startSelectElement.style.visibility='hidden';
    endSelectElement.style.visibility='hidden';
  } else {
    startSelectElement.style.visibility='visible';
    endSelectElement.style.visibility='visible';

  }

  currentInterval = intervalElement.options[intervalElement.selectedIndex].value;
  intervalElement = document.getElementById('interval');

  ival = timeFrameValue / 150;
  interval = 0;
  if (ival > 300)  interval = 300;
  if (ival > 900)  interval = 900;
  if (ival > 1800) interval = 1800;
  if (ival > 3600) interval = 3600;
  if (ival > 10800)interval = 10800;
  if (ival > 21600)interval = 21600;
  if (ival > 43200)interval = 43200;
  if (ival > 86400)interval = 86400;
  if (currentInterval < interval) {
    intervalElement.value = interval;
  }

  disableIntervalOptionsBelow(interval);
}
function checkInterval() {
  intervalElement = document.getElementById('interval');
  currentInterval = intervalElement.options[intervalElement.selectedIndex].value;
  startMonthElement = document.getElementsByName('startMonth')[0];
  startMonth = startMonthElement.options[startMonthElement.selectedIndex].value;
  startDayElement = document.getElementsByName('startDay')[0];
  startDay = startDayElement.options[startDayElement.selectedIndex].value;
  startYearElement = document.getElementsByName('startYear')[0];
  startYear = startYearElement.options[startYearElement.selectedIndex].value;
  startHourElement = document.getElementsByName('startHour')[0];
  startHour = startHourElement.options[startHourElement.selectedIndex].value;
  start = ((new Date(startYear, startMonth, startDay, startHour)).getTime()) / 1000;

  endMonthElement = document.getElementsByName('endMonth')[0];
  endMonth = endMonthElement.options[endMonthElement.selectedIndex].value;
  endDayElement = document.getElementsByName('endDay')[0];
  endDay = endDayElement.options[endDayElement.selectedIndex].value;
  endYearElement = document.getElementsByName('endYear')[0];
  endYear = endYearElement.options[endYearElement.selectedIndex].value;
  endHourElement = document.getElementsByName('endHour')[0];
  endHour = endHourElement.options[endHourElement.selectedIndex].value;
  end = ((new Date(endYear, endMonth, endDay, endHour)).getTime()) / 1000;

  span = end - start;

  ival = span / 150;
  interval = 0;
  if (ival > 300)  interval = 300;
  if (ival > 900)  interval = 900;
  if (ival > 1800) interval = 1800;
  if (ival > 3600) interval = 3600;
  if (ival > 10800)interval = 10800;
  if (ival > 21600)interval = 21600;
  if (ival > 43200)interval = 43200;
  if (ival > 86400)interval = 86400;

  if (currentInterval < interval) {
    intervalElement.value = interval;
  }

  disableIntervalOptionsBelow(interval);

}
function disableIntervalOptionsBelow(value) {
  // First reenable all of them
  intervalElement = document.getElementById('interval');
  for (i = intervalElement.length - 1; i >= 1; i--) {
    intervalElement.options[i].disabled = false;
  }
  for (i = intervalElement.length - 1; i >= 1; i--) {
    if (intervalElement.options[i].value < value) {
      intervalElement.options[i].disabled = true;
    }
  }
}
function validateForm() {

  return checkJobCount();
}
// Limit number of jobs to select
function checkJobCount() {

  if ($('#jobs').val() == null) {
    alert('Please select job(s)');
    return false;
  } else  if ($('#jobs').val().length > 3) {
    alert('Please Select 3 or less jobs');
    return false;
  } else {
    return true;
  }
}

function updateReport() {
  if (!validateForm()) {
    return false;
  }
  document.updateForm.act.value="report";
  document.updateForm.submit();
}
function downloadData() {
  if (!validateForm()) {
    return false;
  }
  document.updateForm.act.value="download";
  document.updateForm.submit();
}
function updateGraph() {
  if (!validateForm()) {
    return false;
  }
  document.getElementById('graphButton').disabled = true;
  document.updateForm.act.value="graph";
  document.updateForm.submit();
}
</script>

</head>
<body onload="onloadInit();">
<div class="page">
<?php $_template = new Smarty_Internal_Template('header.tpl', $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
<?php $_template = new Smarty_Internal_Template('navbar.tpl', $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
<div id="main">
<div class="level_2">
<div class="content-wrap">
<div class="content">
  <form name="folderForm" action="">
    <a href="listFolders.php?folder=Job"><b>Folder:</b></a> <select name="folderId"
                                                                    onchange="document.folderForm.submit();">
      <?php echo smarty_function_html_select_tree(array('permission'=>@PERMISSION_READ,'shares'=>$_smarty_tpl->getVariable('shares')->value,'tree'=>$_smarty_tpl->getVariable('folderTree')->value,'selected'=>$_smarty_tpl->getVariable('folderId')->value),$_smarty_tpl);?>

  </select>
  </form>
  <form name="updateForm" class="cmxform" action="flashGraph.php" id="updateForm" onsubmit="validateForm();">
    <input type="hidden" value="<?php echo $_smarty_tpl->getVariable('cacheKey')->value;?>
" name="cacheKey">
    <input type="hidden" name="act" value="">
    <table width="100%" border=0>
      <tr>
        <td align="left" valign="top">
          <select onmouseup="checkJobCount();" id="jobs" multiple="true"
                  name="job_id[]"
                  size="7"
                  style="width:330px;"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->getVariable('jobs')->value,'selected'=>$_smarty_tpl->getVariable('job_ids')->value),$_smarty_tpl);?>
</select>

          <div style="font-size:x-small;">Select up to 3 jobs</div>
        </td>
        <td valign="top" align="left">
          <input id="startTime" type="hidden" name="startTime">
          <input id="endTime" type="hidden" name="endTime">
          <table>
            <tr>
              <td align="right">Time Frame:</td>
              <td>
                <select id="timeFrame" name="timeFrame" onchange="adjustTimeFrame();">
                <option <?php if ($_smarty_tpl->getVariable('timeFrame')->value==0){?>selected="true"<?php }?> value="0">Manual</option>
                <option <?php if ($_smarty_tpl->getVariable('timeFrame')->value==900){?>selected="true"<?php }?> value="900">15 Minutes</option>
                <option <?php if ($_smarty_tpl->getVariable('timeFrame')->value==1800){?>selected="true"<?php }?> value="1800">30 Minutes</option>
                <option <?php if ($_smarty_tpl->getVariable('timeFrame')->value==3600){?>selected="true"<?php }?> value="3600">1 Hour</option>
                <option <?php if ($_smarty_tpl->getVariable('timeFrame')->value==10800){?>selected="true"<?php }?> value="10800">3 Hours</option>
                <option <?php if ($_smarty_tpl->getVariable('timeFrame')->value==21600){?>selected="true"<?php }?> value="21600">6 Hours</option>
                <option <?php if ($_smarty_tpl->getVariable('timeFrame')->value==43200){?>selected="true"<?php }?> value="43200">12 Hours</option>
                <option <?php if ($_smarty_tpl->getVariable('timeFrame')->value==86400){?>selected="true"<?php }?> value="86400">Day</option>
                <option <?php if ($_smarty_tpl->getVariable('timeFrame')->value==604800){?>selected="true"<?php }?> value="604800">Week</option>
                <option <?php if ($_smarty_tpl->getVariable('timeFrame')->value==1209600){?>selected="true"<?php }?> value="1209600">2 Weeks</option>
                <option <?php if ($_smarty_tpl->getVariable('timeFrame')->value==2419200){?>selected="true"<?php }?> value="2419200">4 weeks</option>
                </select>
              </td>
            </tr>

            <tr id="startTimeSelect">
              <td align="right">Start:</td>
              <td><?php echo smarty_function_html_select_date(array('start_year'=>'2010','onchange'=>'checkInterval();','prefix'=>'start','time'=>$_smarty_tpl->getVariable('startTime')->value),$_smarty_tpl);?>
 <?php echo smarty_function_html_select_time(array('prefix'=>'start','time'=>$_smarty_tpl->getVariable('startTime')->value,'display_minutes'=>false,'display_seconds'=>false),$_smarty_tpl);?>
</td>
            </tr>
            <tr id="endTimeSelect">
              <td align="right">End:</td>
              <td nowrap="true"><?php echo smarty_function_html_select_date(array('start_year'=>'2010','onchange'=>'checkInterval();','prefix'=>'end','time'=>$_smarty_tpl->getVariable('endTime')->value),$_smarty_tpl);?>
 <?php echo smarty_function_html_select_time(array('prefix'=>'end','time'=>$_smarty_tpl->getVariable('endTime')->value,'display_minutes'=>false,'display_seconds'=>false),$_smarty_tpl);?>
</td>
            </tr>
            <tr>
              <td align="right" valign="middle">Interval:</td>
              <td valign="top"><select id="interval" name="interval" onchange="checkInterval();">
                <option <?php if ($_smarty_tpl->getVariable('interval')->value==0){?>selected="true"<?php }?> value="0">Auto</option>
                <option <?php if ($_smarty_tpl->getVariable('interval')->value==1){?>selected="true"<?php }?> value="1">Max</option>
                <option <?php if ($_smarty_tpl->getVariable('interval')->value==300){?>selected="true"<?php }?> value="300">5 Minutes</option>
                <option <?php if ($_smarty_tpl->getVariable('interval')->value==900){?>selected="true"<?php }?> value="900">15 Minutes</option>
                <option <?php if ($_smarty_tpl->getVariable('interval')->value==1800){?>selected="true"<?php }?> value="1800">30 Minutes</option>
                <option <?php if ($_smarty_tpl->getVariable('interval')->value==3600){?>selected="true"<?php }?> value="3600">1 Hour</option>
                <option <?php if ($_smarty_tpl->getVariable('interval')->value==10800){?>selected="true"<?php }?> value="10800">3 Hours</option>
                <option <?php if ($_smarty_tpl->getVariable('interval')->value==21600){?>selected="true"<?php }?> value="21600">6 Hours</option>
                <option <?php if ($_smarty_tpl->getVariable('interval')->value==43200){?>selected="true"<?php }?> value="43200">12 Hours</option>
                <option <?php if ($_smarty_tpl->getVariable('interval')->value==86400){?>selected="true"<?php }?> value="86400">Daily</option>
                <option <?php if ($_smarty_tpl->getVariable('interval')->value==604800){?>selected="true"<?php }?> value="604800">Weekly</option>
              </select>&nbsp;<?php if ($_smarty_tpl->getVariable('intervalAuto')->value){?><?php echo $_smarty_tpl->getVariable('intervalAuto')->value;?>
<?php }?>
              </td>
            </tr>
            <tr>
              <td colspan="1" align="right">
                Chart type:
              </td>
              <td>
                <select id="chartType" name="chartType" >
                  <option <?php if ($_smarty_tpl->getVariable('chartType')->value=="Line"){?>selected="true"<?php }?> value="line">Line</option>
                  <option <?php if ($_smarty_tpl->getVariable('chartType')->value=="scatter"){?>selected="true" <?php }?> value="scatter">Scatter</option>
                </select>
              </td>
            </tr>
          </table>
        </td>
        <td valign="top" align="right" nowrap="true" style="padding:0%;">
          <table width=100% cellpadding="0" cellspacing="0">
            <tr>
              <td colspan="1" align="right">
                Filter Using:
              </td>
              <td><select name="adjustUsing">
                <option value="AvgFirstViewFirstByte"
                        <?php if ($_smarty_tpl->getVariable('adjustUsing')->value=='AvgFirstViewFirstByte'){?>selected="true"<?php }?>>Time to first byte
                </option>
                <option value="AvgFirstViewStartRender"
                        <?php if ($_smarty_tpl->getVariable('adjustUsing')->value=='AvgFirstViewStartRender'){?>selected="true"<?php }?>>Start Render
                </option>
                <option value="AvgFirstViewDocCompleteTime"
                        <?php if ($_smarty_tpl->getVariable('adjustUsing')->value=='AvgFirstViewDocCompleteTime'){?>selected="true"<?php }?>>Doc Time
                </option>
                <option value="AvgFirstViewDomTime"
                        <?php if ($_smarty_tpl->getVariable('adjustUsing')->value=='AvgFirstViewDomTime'){?>selected="true"<?php }?>>Dom
                  Time
                </option>
                <option value="AvgFirstViewFullyLoadedTime"
                        <?php if ($_smarty_tpl->getVariable('adjustUsing')->value=='AvgFirstViewFullyLoadedTime'){?>selected="true"<?php }?>>Fully Loaded
                </option>
              </select></td>
            </tr>
            <tr>
              <td align="right">
                Percentile:
              </td>
              <td><select name="percentile">
                <option <?php if ($_smarty_tpl->getVariable('percentile')->value=="1"){?>selected="true"<?php }?> value="1">Max</option>
                <option <?php if ($_smarty_tpl->getVariable('percentile')->value=="0.95"){?>selected="true"<?php }?> value="0.95">95th</option>
                <option <?php if ($_smarty_tpl->getVariable('percentile')->value=="0.9"){?>selected="true"<?php }?> value="0.9">90th</option>
                <option <?php if ($_smarty_tpl->getVariable('percentile')->value=="0.8"){?>selected="true"<?php }?> value="0.8">80th</option>
                <option <?php if ($_smarty_tpl->getVariable('percentile')->value=="0.7"){?>selected="true"<?php }?> value="0.7">70th</option>
                <option <?php if ($_smarty_tpl->getVariable('percentile')->value=="0.6"){?>selected="true"<?php }?> value="0.6">60th</option>
                <option <?php if ($_smarty_tpl->getVariable('percentile')->value=="0.5"){?>selected="true"<?php }?> value="0.5">50th</option>
              </select>
              </td>
            </tr>
            <tr>
              <td align="right">Trim above:</td>
              <td><input class="number" id="trimAbove" type="text"
                         name="trimAbove" size="6" value="<?php echo $_smarty_tpl->getVariable('trimAbove')->value;?>
">
              </td>
            </tr>
            <tr>
              <td align="right">Trim below:</td>
              <td><input class="number" id="trimBelow" type="text"
                         name="trimBelow" size="6" value="<?php echo $_smarty_tpl->getVariable('trimBelow')->value;?>
">
              </td>
            </tr>
            <tr>
              <td align="right" colspan="2">
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td colspan="2" nowrap="true">
          <div align="left" style="font-size:x-small;">
            <?php echo smarty_function_html_checkboxes(array('name'=>"fields",'options'=>$_smarty_tpl->getVariable('availFieldKeysFV')->value,'selected'=>$_smarty_tpl->getVariable('fieldsToDisplay')->value,'separator'=>" "),$_smarty_tpl);?>
<br>
            <?php echo smarty_function_html_checkboxes(array('name'=>"fields",'options'=>$_smarty_tpl->getVariable('availFieldKeysRV')->value,'selected'=>$_smarty_tpl->getVariable('fieldsToDisplay')->value,'separator'=>" "),$_smarty_tpl);?>

          </div>
        </td>
        <td colspan="2">
          <table style="cellpadding:0px;cellspacing:0px;margin:0px;border-spacing:0px">
            <tr>
              <td align="right" valign="top"><input id="graphButton" type="button" name="action"
                                                    onclick="updateGraph();" value="Graph"
                                                    style="margin:0px;margin-right:3px;"></td>
              <td align="right" valign="top"><input id="reportButton" type="button" name="action"
                                                    onclick="updateReport();" value="Report"
                                                    style="margin:0px;margin-right:3px;"></td>
              <td align="center" valign="top"><input type="button" name="action" onclick="downloadData();" value="Download""></td>
              <td align="left" valign="top"><input type="reset" value="Reset" style="margin:0px;"></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
<?php if ($_smarty_tpl->getVariable('action')->value=='report'){?>
<?php $_template = new Smarty_Internal_Template('report/report.tpl', $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
<br>
<div style="padding:15px;background-color:#f5f5f5;">
  <h4>Share URL:</h4> <textarea onClick="javascript:this.focus();this.select();" readonly="true" id="shareUrl" style="width:100%;height:75px"></textarea>
</div><br>
<script>
  loc = document.location.toString();
  base = loc.substring(0,loc.indexOf(".php")+4);

  document.getElementById('shareUrl').value=base+'?___k=<?php echo $_smarty_tpl->getVariable('cryptQueryString')->value;?>
'</script>
<?php }?>
<?php if ($_smarty_tpl->getVariable('action')->value=='graph'){?>
    <?php if ($_smarty_tpl->getVariable('graphDataFile')->value){?>
    <?php if ($_smarty_tpl->getVariable('chartType')->value=="scatter"){?>
    
      <script type="text/javascript" src="lib/amcharts/amxy/swfobject.js"></script>
      <div style="width:auto;" align="center" id="flashcontent"><strong>You need to upgrade your Flash
        Player</strong></div>

    <script type="text/javascript">
    // <![CDATA[
    var so = new SWFObject("lib/amcharts/amxy/amxy.swf", "amchart", "100%", "600", "8", "#E2E2E2");
    so.addVariable("chart_id", "amchart"); // if you have more then one chart in one page, set different chart_id for each chart
    so.addVariable("path", "lib/amcharts/amxy");
    so.addVariable("settings_file", escape('<?php echo $_smarty_tpl->getVariable('graphDataFile')->value;?>
'),escape('<?php echo $_smarty_tpl->getVariable('changeNoteFileName')->value;?>
'));
    so.write("flashcontent");
    // ]]>
    </script>
    
    <?php }else{ ?>
    
      <script type="text/javascript" src="lib/amcharts/amline/swfobject.js"></script>
      <div style="width:auto;" align="center" id="flashcontent"><strong>You need to upgrade your Flash
        Player</strong></div>

    <script type="text/javascript">
    // <![CDATA[
    var so = new SWFObject("lib/amcharts/amline/amline.swf", "amchart", "100%", "600", "8", "#E2E2E2");
    so.addVariable("chart_id", "amchart"); // if you have more then one chart in one page, set different chart_id for each chart
    so.addVariable("path", "lib/amcharts/amline");
    so.addVariable("settings_file", escape('<?php echo $_smarty_tpl->getVariable('graphDataFile')->value;?>
'),escape('<?php echo $_smarty_tpl->getVariable('changeNoteFileName')->value;?>
'));
    so.write("flashcontent");
    // ]]>
    </script>
    
    <?php }?>
      <div align="right"><input type="button" value="Save" onclick="exportGraph();"></div><br>
    <?php }?>
<?php }?>
    <div id="abbreviations" style="visibility:visible;">
      <table class="pretty">
        <tr style="font-size:x-small;">
          <td><strong>FV</strong> - First View</td>
          <td>|</td>
          <td><strong>RV</strong> - Repeat View</td>
          <td>|</td>
          <td><strong>TTFB</strong> - Time to first byte</td>
          <td>|</td>
          <td><strong>Render</strong> - Start rendering</td>
          <td>|</td>
          <td><strong>DOM</strong> - Dom Marker Time</td>
          <td>|</td>
          <td><strong>Doc</strong> - Document loaded</td>
          <td>|</td>
          <td><strong>Fully</strong> - Fully loaded</td>
        </tr>
      </table>
    </div>
  </form>
</div>
</div>
</div>
</div>


</body>
<script type="text/javascript">
  /**
   *Called when the chart inits
   */
  var flashMovie;
  function amChartInited(chart_id) {
    flashMovie = document.getElementById(chart_id);
    document.getElementById("chartfinished").value = chart_id;
  }
  function reloadData() {
    return flashMovie.reloadAll();
  }
  function exportGraph() {
    flashMovie.exportImage();
  }
  endh = document.getElementsByName("endHour")[0];
  starth = document.getElementsByName("startHour")[0];
  endh.addEventListener('change',checkInterval, false);
  starth.addEventListener('change',checkInterval, false);
</script>

</html>