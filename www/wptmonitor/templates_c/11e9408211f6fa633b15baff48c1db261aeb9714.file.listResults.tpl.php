<?php /* Smarty version Smarty-3.0.6, created on 2011-01-29 16:08:29
         compiled from "templates\job/listResults.tpl" */ ?>
<?php /*%%SmartyHeaderCode:171874d448fdd552930-49108350%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    '11e9408211f6fa633b15baff48c1db261aeb9714' => 
    array (
      0 => 'templates\\job/listResults.tpl',
      1 => 1296338878,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '171874d448fdd552930-49108350',
  'function' => 
  array (
  ),
  'has_nocache_code' => false,
)); /*/%%SmartyHeaderCode%%*/?>
<?php if (!is_callable('smarty_function_html_select_date')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\function.html_select_date.php';
if (!is_callable('smarty_function_html_select_time')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\function.html_select_time.php';
if (!is_callable('smarty_modifier_date_format')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\modifier.date_format.php';
if (!is_callable('smarty_modifier_truncate')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\modifier.truncate.php';
?><!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  <?php $_template = new Smarty_Internal_Template("headIncludes.tpl", $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
  
    <script type="text/javascript">
      <!--
      function confirmRemoval(text) {
        var confirmTXT = text;
        var confirmBOX = confirm(confirmTXT);
        if (confirmBOX == true) {
          return true;
        }
      }
      function deleteResults() {
        var url = "deleteResult.php?forward_to=listResults.php";
        var resultsSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            resultsSelected = true;
            url += "&result_id[]=" + this.value;
          }
        });
        if (!resultsSelected) {
          alert('Please select results to delete');
          return true;
        } else {
          if (confirm('Confirm Deletion')) {
            document.location = url;
          }
        }
      }
      function markResults(state) {
        var url = "toggleResultValidationState.php?forward_to=listResults.php&state=" + state;
        var resultsSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            resultsSelected = true;
            url += "&result_id[]=" + this.value;
          }
        });
        if (!resultsSelected) {
          alert('Please select results to toggle');
          return true;
        } else {
          if (confirm('Confirm Toggle')) {
            document.location = url;
          }
        }
      }

      $(document).ready(function() {
        $('input#toggleAllDisplayedResults').click(function() {
          $('input:checkbox').each(function() {
            if (this.id == "selectedResult") {
              this.checked = !this.checked;
            }
          });
          return false;
        });
      });
      //-->
    </script>
  
  <title>Results</title>
</head>
<body>
<div class="page">
<?php $_template = new Smarty_Internal_Template('header.tpl', $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
<?php $_template = new Smarty_Internal_Template('navbar.tpl', $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
<div id="main">
<div class="level_2">
<div class="content-wrap">
<div class="content">
<table style="border-collapse:collapse" width="100%" border=0>
  <tr>
    <td valign="top"><h2 class="cufon-dincond_black">Results</h2></td>
    <td align="left" valign="top" colspan="2" rowspan="2">
      <table>
        <tr>
          <td>
            <form action="">
              <input type="hidden" name="currentPage" value="<?php echo $_smarty_tpl->getVariable('currentPage')->value;?>
">
              Filter: <select id="filterField" name="filterField">
              <option></option>
              <option <?php if ($_smarty_tpl->getVariable('resultsFilterField')->value=='WPTJob.Label'){?> selected="true"<?php }?> value="WPTJob.Label">Job
                Label
              </option>
              <option <?php if ($_smarty_tpl->getVariable('resultsFilterField')->value=='WPTJob.Id'){?> selected="true"<?php }?> value="WPTJob.Id">Job Id
              </option>
              <option <?php if ($_smarty_tpl->getVariable('resultsFilterField')->value=='RunLabel'){?> selected="true"<?php }?>>RunLabel</option>
              <option <?php if ($_smarty_tpl->getVariable('resultsFilterField')->value=='Status'){?> selected="true"<?php }?> value="Status">Status Code
              </option>
              <option <?php if ($_smarty_tpl->getVariable('resultsFilterField')->value=='WPTHost'){?> selected="true"<?php }?> value="WPTHost">Host</option>
              <option <?php if ($_smarty_tpl->getVariable('resultsFilterField')->value=='Id'){?> selected="true"<?php }?> value="Id">Id</option>
              <option <?php if ($_smarty_tpl->getVariable('resultsFilterField')->value=='DialerId'){?> selected="true"<?php }?> value="DialerId">DialerId
              </option>
              <option <?php if ($_smarty_tpl->getVariable('resultsFilterField')->value=='ValidationState'){?> selected="true"<?php }?>
                                                                    value="ValidationState">Validation State (
                0 - 3 )
              </option>
            </select>
              <input type="text" name="filterValue" value="<?php echo $_smarty_tpl->getVariable('resultsFilterValue')->value;?>
">
              <input type="submit" value="Update">
          </td>
          <td valign="top"><input type="button" value="Clear"
                                  onclick="document.location='listResults.php?clearFilter=true'"></td>
          </td>
        </tr>
        <tr>
          <td valign="top">
            <table>
              <tr>
                <td align="right">Start:</td>
                <td><?php echo smarty_function_html_select_date(array('start_year'=>"2010",'prefix'=>'start','time'=>$_smarty_tpl->getVariable('startTime')->value),$_smarty_tpl);?>

                  Time: <?php echo smarty_function_html_select_time(array('prefix'=>'start','time'=>$_smarty_tpl->getVariable('startTime')->value,'display_minutes'=>true,'display_seconds'=>false),$_smarty_tpl);?>
</td>
              </tr>
              <tr>
                <td align="right">End:</td>
                <td nowrap="true"><?php echo smarty_function_html_select_date(array('start_year'=>"2010",'prefix'=>'end','time'=>$_smarty_tpl->getVariable('endTime')->value),$_smarty_tpl);?>

                  Time: <?php echo smarty_function_html_select_time(array('prefix'=>'end','time'=>$_smarty_tpl->getVariable('endTime')->value,'display_minutes'=>true,'display_seconds'=>false),$_smarty_tpl);?>
</td>
              </tr>
            </table>
            </form>
          </td>
        </tr>
      </table>
    </td>
    <td align="right" valign="top" nowrap="true"><?php $_template = new Smarty_Internal_Template('pager.tpl', $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?></td>
    <td align="right" valign="top">
      <form name="showWaterFallForm" action="listResults.php">
        Waterfalls <select name="showWaterfallThumbs" onchange="document.showWaterFallForm.submit()">
        <option value="true" <?php if ($_smarty_tpl->getVariable('showWaterfallThumbs')->value=='true'){?> selected="true" <?php }?> >Yes</option>
        <option value="false" <?php if ($_smarty_tpl->getVariable('showWaterfallThumbs')->value=='false'||!'showWaterfallThumbs'){?>
                selected="true" <?php }?> >No
        </option>
      </select>
      </form>
      <form name="showThumbsForm" action="listResults.php">
        Thumbs <select name="showResultsThumbs" onchange="document.showThumbsForm.submit()">
        <option value="true" <?php if ($_smarty_tpl->getVariable('showResultsThumbs')->value=='true'){?> selected="true" <?php }?> >Yes</option>
        <option value="false" <?php if ($_smarty_tpl->getVariable('showResultsThumbs')->value=='false'||!$_smarty_tpl->getVariable('showResultsThumbs')->value){?>selected="true" <?php }?> >
          No
        </option>
      </select>
      </form>
    </td>
  </tr>
</table>
<table id="monitoringJobList" class="pretty" width="100%">
<tr>
  <th colspan="7"></th>
  <th align="left" style="padding-bottom:0%;vertical-align:bottom;">
    <a href="?orderBy=RunLabel"><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="RunLabel"){?><b><?php }?>
      RunLabel</a><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="RunLabel"){?></b><a
      href="?orderBy=RunLabel&orderByDir=<?php echo $_smarty_tpl->getVariable('orderResultsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderResultsByDirection')->value=="ASC"){?>
    <img width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
  </a><?php }?><br>
    <a href="?orderBy=Date"><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="Date"){?><b><?php }?>Date</a><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="Date"){?></b>
    <a href="?orderBy=Date&orderByDir=<?php echo $_smarty_tpl->getVariable('orderResultsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderResultsByDirection')->value=="ASC"){?>
      <img width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10"
                                                              src='img/Down.png'><?php }?></a><?php }?></th>
  <th align="left" colspan="4" style="padding-bottom:0%;vertical-align:bottom;">
    <a href="?orderBy=WPTJob.Label"><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="WPTJob.Label"){?><b><?php }?>
      Job</a><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="WPTJob.Label"){?></b><a
      href="?orderBy=WPTJob.Label&orderByDir=<?php echo $_smarty_tpl->getVariable('orderResultsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderResultsByDirection')->value=="ASC"){?>
    <img width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
  </a><?php }?><br>
    <a href="?orderBy=WPTHost"><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="WPTHost"){?><b><?php }?>
      WPTHost</a><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="WPTHost"){?></b><a
      href="?orderBy=WPTHost&orderByDir=<?php echo $_smarty_tpl->getVariable('orderResultsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderResultsByDirection')->value=="ASC"){?>
    <img width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
  </a><?php }?></th>
  <th style="opacity:0.7;background-color:#fdf5e6;padding-bottom:0%;vertical-align:bottom;" align="right"
      colspan="3">Doc Complete
  </th>
  <th style="opacity:0.7;background-color:#dcdcdc;padding-bottom:0%;vertical-align:bottom;" align="right"
      colspan="3">Fully Loaded
  </th>
</tr>
<tr>
  <th align="left" colspan="4"></th>
  <th><input type="checkbox" id="toggleAllDisplayedResults"></th>
  <th>
    <a title="WPT Remote Agent Dialer ID" href="?orderBy=DialerId"><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="DialerId"){?>
    <b><?php }?>Agent</a><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="DialerId"){?></b><a
      href="?orderBy=DialerId&orderByDir=<?php echo $_smarty_tpl->getVariable('orderResultsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderResultsByDirection')->value=="ASC"){?>
    <img width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
  </a><?php }?></th>
  <th>
    Valid
  </th>
  <th align="left">
    <a href="?orderBy=Status"><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="Status"){?><b><?php }?>
      Status</a><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="Status"){?></b><a
      href="?orderBy=Status&orderByDir=<?php echo $_smarty_tpl->getVariable('orderResultsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderResultsByDirection')->value=="ASC"){?>
    <img width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
  </a><?php }?>
  </th>
  <th align="left">
    <a title="WPT Runs exectued">Runs</a> ( <a title="Run used for average">Selected</a> )
  </th>
  <th><a href="?orderBy=AvgFirstViewFirstByte"><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="AvgFirstViewFirstByte"){?><b><?php }?>
    TTFB</a><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="AvgFirstViewFirstByte"){?></b><a
      href="?orderBy=AvgFirstViewFirstByte&orderByDir=<?php echo $_smarty_tpl->getVariable('orderResultsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderResultsByDirection')->value=="ASC"){?>
    <img width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
  </a><?php }?></th>
  <th align="right">Render</th>
  <th align="right">DomTime</th>
  <th style="opacity:0.7;background-color:#fdf5e6;" align="right"><a
      href="?orderBy=AvgFirstViewDocCompleteTime"><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="AvgFirstViewDocCompleteTime"){?>
  <b><?php }?>Time</a><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="AvgFirstViewDocCompleteTime"){?></b><a
      href="?orderBy=AvgFirstViewDocCompleteTime&orderByDir=<?php echo $_smarty_tpl->getVariable('orderResultsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderResultsByDirection')->value=="ASC"){?>
    <img width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
  </a><?php }?></th>
  <th style="opacity:0.7;background-color:#fdf5e6;" align="right"><a
      href="?orderBy=AvgFirstViewDocCompleteRequests"><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="AvgFirstViewDocCompleteRequests"){?>
  <b><?php }?>Req</a><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="AvgFirstViewDocCompleteRequests"){?></b><a
      href="?orderBy=AvgFirstViewDocCompleteRequests&orderByDir=<?php echo $_smarty_tpl->getVariable('orderResultsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderResultsByDirection')->value=="ASC"){?>
    <img width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
  </a><?php }?></th>
  <th style="opacity:0.7;background-color:#fdf5e6;" align="right"><a
      href="?orderBy=AvgFirstViewDocCompleteBytesIn"><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="AvgFirstViewDocCompleteBytesIn"){?>
  <b><?php }?>Bytes</a><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="AvgFirstViewDocCompleteBytesIn"){?></b><a
      href="?orderBy=AvgFirstViewDocCompleteBytesIn&orderByDir=<?php echo $_smarty_tpl->getVariable('orderResultsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderResultsByDirection')->value=="ASC"){?>
    <img width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
  </a><?php }?></th>
  <th style="opacity:0.7;background-color:#dcdcdc;" align="right"><a
      href="?orderBy=AvgFirstViewFullyLoadedTime"><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="AvgFirstViewFullyLoadedTime"){?>
  <b><?php }?>Time</a><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="AvgFirstViewFullyLoadedTime"){?></b><a
      href="?orderBy=AvgFirstViewFullyLoadedTime&orderByDir=<?php echo $_smarty_tpl->getVariable('orderResultsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderResultsByDirection')->value=="ASC"){?>
    <img width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
  </a><?php }?></th>
  <th style="opacity:0.7;background-color:#fdf5e6;" align="right"><a
      href="?orderBy=AvgFirstViewFullyLoadedRequests"><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="AvgFirstViewFullyLoadedRequests"){?>
  <b><?php }?>Req</a><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="AvgFirstViewFullyLoadedRequests"){?></b><a
      href="?orderBy=AvgFirstViewFullyLoadedRequests&orderByDir=<?php echo $_smarty_tpl->getVariable('orderResultsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderResultsByDirection')->value=="ASC"){?>
    <img width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
  </a><?php }?></th>
  <th style="opacity:0.7;background-color:#fdf5e6;" align="right"><a
      href="?orderBy=AvgFirstViewFullyLoadedBytesIn"><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="AvgFirstViewFullyLoadedBytesIn"){?>
  <b><?php }?>Bytes</a><?php if ($_smarty_tpl->getVariable('orderResultsBy')->value=="AvgFirstViewFullyLoadedBytesIn"){?></b><a
      href="?orderBy=AvgFirstViewFullyLoadedBytesIn&orderByDir=<?php echo $_smarty_tpl->getVariable('orderResultsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderResultsByDirection')->value=="ASC"){?>
    <img width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
  </a><?php }?></th>

</tr>
<?php  $_smarty_tpl->tpl_vars['res'] = new Smarty_Variable;
 $_from = $_smarty_tpl->getVariable('result')->value; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array');}
if ($_smarty_tpl->_count($_from) > 0){
    foreach ($_from as $_smarty_tpl->tpl_vars['res']->key => $_smarty_tpl->tpl_vars['res']->value){
?>
<?php if ($_smarty_tpl->getVariable('eo')->value=="even"){?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("odd", null, null);?> <?php }else{ ?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("even", null, null);?><?php }?>
<tr class="monitoringJobRow <?php echo $_smarty_tpl->getVariable('eo')->value;?>
">
  <?php if ($_smarty_tpl->tpl_vars['res']->value['Status']=='100'||$_smarty_tpl->tpl_vars['res']->value['Status']=='910'){?>
    <td>
      <form action="processJob.php">
        <input type="hidden" name="result_id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTResultId'];?>
">
        <input type="hidden" name="forward_to" value="listResults.php">
        <input title="Refresh" class="actionIcon" type="image" src="img/refresh_icon.png" width="18">
      </form>
    </td>
  <?php }else{ ?>
    <td colspan="1"></td>
  <?php }?>
  <td>
    <form action="deleteResult.php" onsubmit="return confirm('Confirm Deletion')">
      <input type="hidden" name="result_id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
      <input type="hidden" name="forward_to"
             value="listResults.php?job_id=<?php echo $_smarty_tpl->getVariable('jobId')->value;?>
&pendingResults=<?php echo $_smarty_tpl->getVariable('pendingResults')->value;?>
">
      <input title="Delete Result" class="actionIcon" type="image" src="img/delete_icon.png" width="17">
    </form>
  </td>

  <td style="paddin-left:0em">
    <form target="_blank" title="View log file" action=jobProcessorLog.php>
      <input type=hidden name=wptResultId value=<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTResultId'];?>
>
      <input type="hidden" name="timeStamp" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Date'];?>
">
      <input class="actionIcon" type="image" src="img/Text.gif" width="17"></form>
  </td>
  <td><a target="_blank" title="<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTResultId'];?>
"
         href=<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTHost'];?>
<?php echo $_smarty_tpl->getVariable('wptResultURL')->value;?>
<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTResultId'];?>
><img src="img/favicon.ico" width="17"
                                                                   title="Show WPT Result"></a></td>
  <td><input type="checkbox" name="selectedResult" id="selectedResult" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
"></td>
  <td><?php echo $_smarty_tpl->tpl_vars['res']->value['DialerId'];?>
</td>
  <td>
    <?php if ($_smarty_tpl->tpl_vars['res']->value['ValidationState']==1){?><img title="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
 - Valid Result" src=img/Valid.png>
    <?php }elseif($_smarty_tpl->tpl_vars['res']->value['ValidationState']==2){?><img title="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
 - Invalid Result" src=img/Invalid.png>
    <?php }elseif($_smarty_tpl->tpl_vars['res']->value['ValidationState']==3){?><img title="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
 - Needs Review" src=img/NeedsReview.png>
    <?php }?>
  </td>
  <td align="left"><?php echo $_smarty_tpl->tpl_vars['res']->value['RunLabel'];?>
<br><?php echo smarty_modifier_date_format($_smarty_tpl->tpl_vars['res']->value['Date'],"%D %H:%M");?>
<br>
    <?php if ($_smarty_tpl->getVariable('statusCodes')->value[$_smarty_tpl->tpl_vars['res']->value['Status']]){?><?php echo $_smarty_tpl->getVariable('statusCodes')->value[$_smarty_tpl->tpl_vars['res']->value['Status']];?>
<?php }else{ ?><?php echo $_smarty_tpl->tpl_vars['res']->value['Status'];?>
<?php }?><br></td>
  <td align="left"><a title="JOB: <?php echo $_smarty_tpl->tpl_vars['res']->value['WPTJob']['Label'];?>
 --- SCRIPT: <?php echo $_smarty_tpl->tpl_vars['res']->value['WPTJob']['WPTScript']['Label'];?>
"
                      href="listResults.php?filterField=WPTJob.Id&filterValue=<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTJob']['Id'];?>
"><?php echo smarty_modifier_truncate($_smarty_tpl->tpl_vars['res']->value['WPTJob']['Label'],45);?>
</a><br><?php echo smarty_modifier_truncate($_smarty_tpl->tpl_vars['res']->value['WPTHost'],45);?>

    <br><?php echo $_smarty_tpl->tpl_vars['res']->value['Runs'];?>
 ( <?php if ($_smarty_tpl->tpl_vars['res']->value['RunToUseForAverage']==0){?>Avgerage<?php }else{ ?><?php echo $_smarty_tpl->tpl_vars['res']->value['RunToUseForAverage'];?>
<?php }?> )
  </td>
  <td align="right" valign="top"><?php echo $_smarty_tpl->tpl_vars['res']->value['AvgFirstViewFirstByte']/1000;?>

    <hr><?php echo $_smarty_tpl->tpl_vars['res']->value['AvgRepeatViewFirstByte']/1000;?>
</td>
  <td align="right" valign="top"><?php echo $_smarty_tpl->tpl_vars['res']->value['AvgFirstViewStartRender']/1000;?>

    <hr><?php echo $_smarty_tpl->tpl_vars['res']->value['AvgRepeatViewStartRender']/1000;?>
</td>
  <td align="right" valign="top"><?php echo $_smarty_tpl->tpl_vars['res']->value['AvgFirstViewDomTime']/1000;?>

    <hr><?php echo $_smarty_tpl->tpl_vars['res']->value['AvgRepeatViewDomTime']/1000;?>
</td>
  <td style="opacity:0.7;background-color:#fdf5e6;" align="right"
      valign="top"><?php echo $_smarty_tpl->tpl_vars['res']->value['AvgFirstViewDocCompleteTime']/1000;?>

    <hr><?php echo $_smarty_tpl->tpl_vars['res']->value['AvgRepeatViewDocCompleteTime']/1000;?>
</td>
  <td style="opacity:0.7;background-color:#fdf5e6;" align="right"
      valign="top"><?php if ($_smarty_tpl->tpl_vars['res']->value['AvgFirstViewDocCompleteRequests']){?><?php echo $_smarty_tpl->tpl_vars['res']->value['AvgFirstViewDocCompleteRequests'];?>
<?php }else{ ?>
    0<?php }?>
    <hr><?php if ($_smarty_tpl->tpl_vars['res']->value['AvgRepeatViewDocCompleteRequests']){?><?php echo $_smarty_tpl->tpl_vars['res']->value['AvgRepeatViewDocCompleteRequests'];?>
<?php }else{ ?>0<?php }?></td>
  <td style="opacity:0.7;background-color:#fdf5e6;" align="right"
      valign="top"><?php echo $_smarty_tpl->tpl_vars['res']->value['AvgFirstViewDocCompleteBytesIn']/number_format(1000);?>
K
    <hr><?php echo $_smarty_tpl->tpl_vars['res']->value['AvgRepeatViewDocCompleteBytesIn']/number_format(1000);?>
K
  </td>
  <td style="opacity:0.7;background-color:#dcdcdc;" align="right"
      valign="top"><?php echo $_smarty_tpl->tpl_vars['res']->value['AvgFirstViewFullyLoadedTime']/1000;?>

    <hr><?php echo $_smarty_tpl->tpl_vars['res']->value['AvgRepeatViewFullyLoadedTime']/1000;?>
</td>
  <td style="opacity:0.7;background-color:#dcdcdc;" align="right"
      valign="top"><?php if ($_smarty_tpl->tpl_vars['res']->value['AvgFirstViewFullyLoadedRequests']){?><?php echo $_smarty_tpl->tpl_vars['res']->value['AvgFirstViewFullyLoadedRequests'];?>
<?php }else{ ?>
    0<?php }?>
    <hr><?php if ($_smarty_tpl->tpl_vars['res']->value['AvgRepeatViewFullyLoadedRequests']){?><?php echo $_smarty_tpl->tpl_vars['res']->value['AvgRepeatViewFullyLoadedRequests'];?>
<?php }else{ ?>0<?php }?></td>
  <td style="opacity:0.7;background-color:#dcdcdc;" align="right"
      valign="top"><?php echo $_smarty_tpl->tpl_vars['res']->value['AvgFirstViewFullyLoadedBytesIn']/number_format(1000);?>
K
    <hr><?php echo $_smarty_tpl->tpl_vars['res']->value['AvgRepeatViewFullyLoadedBytesIn']/number_format(1000);?>
K
  </td>
</tr>
<tr class="monitoringJobRow <?php echo $_smarty_tpl->getVariable('eo')->value;?>
">
  <td colspan="19">
    <table>
      <tr>
        <?php if ($_smarty_tpl->getVariable('showResultsThumbs')->value=='true'&&$_smarty_tpl->tpl_vars['res']->value['Status']!=100){?>
          <td style="vertical-align:top;">
            <a target="_blank" href="<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTHost'];?>
/result/<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTResultId'];?>
"><img align="top"
                                                                                    src=<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTHost'];?>
/result/<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTResultId'];?>
/<?php if ($_smarty_tpl->tpl_vars['res']->value['RunToUseForAverage']==0){?>1<?php }else{ ?><?php echo $_smarty_tpl->tpl_vars['res']->value['RunToUseForAverage'];?>
<?php }?>_screen_thumb.jpg></a>
          </td>
        <?php }?>
        <?php if ($_smarty_tpl->getVariable('showWaterfallThumbs')->value=='true'&&$_smarty_tpl->tpl_vars['res']->value['Status']!=100){?>
          <td style="vertical-align:top;">
            <a target="_blank" href="<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTHost'];?>
/result/<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTResultId'];?>
/1/details/"><img
                src=<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTHost'];?>
/result/<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTResultId'];?>
/<?php if ($_smarty_tpl->tpl_vars['res']->value['RunToUseForAverage']==0){?>1<?php }else{ ?><?php echo $_smarty_tpl->tpl_vars['res']->value['RunToUseForAverage'];?>
<?php }?>_waterfall_thumb.png></a>
          </td>
        <?php }?>
        </td></tr>
    </table>
  </td>
</tr>
<?php }} ?>
<tr>
  <td colspan="25">
    <table style="border-collapse:collapse">
      <tr>
        <td align="left"><input onclick="deleteResults();" type="submit" value="Delete Results"></td>
        <td align="left"><input onclick="markResults(1);" type="submit" value="Mark Result(s) Valid"></td>
        <td align="left"><input onclick="markResults(2);" type="submit" value="Mark Result(s) Invalid"></td>
        <td align="left"><input onclick="markResults(3);" type="submit" value="Mark Result(s) Needs Review">
        </td>
      </tr>
    </table>
  </td>
</tr>
</table>
</div>
</div>
</div>
</div>
</body>
</html>

