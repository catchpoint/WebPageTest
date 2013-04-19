<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  {literal}
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
  {/literal}
  <title>Results</title>
</head>
<body>
<div class="page">
{include file='header.tpl'}
{include file='navbar.tpl'}
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
              <input type="hidden" name="currentPage" value="{$currentPage}">
              Filter: <select id="filterField" name="filterField">
              <option></option>
              <option {if $resultsFilterField eq 'WPTJob.Label'} selected="true"{/if} value="WPTJob.Label">Job
                Label
              </option>
              <option {if $resultsFilterField eq 'WPTJob.Id'} selected="true"{/if} value="WPTJob.Id">Job Id
              </option>
              <option {if $resultsFilterField eq 'RunLabel'} selected="true"{/if}>RunLabel</option>
              <option {if $resultsFilterField eq 'Status'} selected="true"{/if} value="Status">Status Code
              </option>
              <option {if $resultsFilterField eq 'WPTHost'} selected="true"{/if} value="WPTHost">Host</option>
              <option {if $resultsFilterField eq 'Id'} selected="true"{/if} value="Id">Id</option>
              <option {if $resultsFilterField eq 'DialerId'} selected="true"{/if} value="DialerId">DialerId
              </option>
              <option {if $resultsFilterField eq 'ValidationState'} selected="true"{/if}
                                                                    value="ValidationState">Validation State (
                0 - 3 )
              </option>
            </select>
              <input type="text" name="filterValue" value="{$resultsFilterValue}">
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
                <td>{html_select_date start_year="2010" prefix='start' time=$startTime}
                  Time: {html_select_time prefix='start' time=$startTime display_minutes=true display_seconds=false}</td>
              </tr>
              <tr>
                <td align="right">End:</td>
                <td nowrap="true">{html_select_date start_year="2010" prefix='end' time=$endTime}
                  Time: {html_select_time prefix='end' time=$endTime display_minutes=true  display_seconds=false}</td>
              </tr>
            </table>
            </form>
          </td>
        </tr>
      </table>
    </td>
    <td align="right" valign="top" nowrap="true">{include file='pager.tpl'}</td>
    <td align="right" valign="top">
      <form name="showWaterFallForm" action="listResults.php">
        Waterfalls <select name="showWaterfallThumbs" onchange="document.showWaterFallForm.submit()">
        <option value="true" {if $showWaterfallThumbs  eq 'true'} selected="true" {/if} >Yes</option>
        <option value="false" {if $showWaterfallThumbs  eq 'false' || !showWaterfallThumbs}
                selected="true" {/if} >No
        </option>
      </select>
      </form>
      <form name="showThumbsForm" action="listResults.php">
        Thumbs <select name="showResultsThumbs" onchange="document.showThumbsForm.submit()">
        <option value="true" {if $showResultsThumbs eq 'true'} selected="true" {/if} >Yes</option>
        <option value="false" {if $showResultsThumbs eq 'false' || !$showResultsThumbs}selected="true" {/if} >
          No
        </option>
      </select>
      </form>
    </td>
  </tr>
</table>
<table id="monitoringJobList" class="pretty" width="100%">
<tr>
  <th colspan="5"></th>
  <th align="right" style="padding-bottom:0%;vertical-align:bottom;">
    BWDown<br>BWUp
  </th>
  <th align="right" style="padding-bottom:0%;vertical-align:bottom;">
    Sequence
  </th>

  <th align="left" style="padding-bottom:0%;vertical-align:bottom;">
    <a href="?orderBy=RunLabel">{if $orderResultsBy eq "RunLabel"}<b>{/if}
      RunLabel</a>{if $orderResultsBy eq "RunLabel"}</b><a
      href="?orderBy=RunLabel&orderByDir={$orderResultsByDirectionInv}">{if $orderResultsByDirection eq "ASC"}
    <img width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
  </a>{/if}<br>
    <a href="?orderBy=Date">{if $orderResultsBy eq "Date"}<b>{/if}Date</a>{if $orderResultsBy eq "Date"}</b>
    <a href="?orderBy=Date&orderByDir={$orderResultsByDirectionInv}">{if $orderResultsByDirection eq "ASC"}
      <img width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10"
                                                              src='img/Down.png'>{/if}</a>{/if}</th>
  <th align="left" colspan="4" style="padding-bottom:0%;vertical-align:bottom;">
    <a href="?orderBy=WPTJob.Label">{if $orderResultsBy eq "WPTJob.Label"}<b>{/if}
      Job</a>{if $orderResultsBy eq "WPTJob.Label"}</b><a
      href="?orderBy=WPTJob.Label&orderByDir={$orderResultsByDirectionInv}">{if $orderResultsByDirection eq "ASC"}
    <img width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
  </a>{/if}<br>
    <a href="?orderBy=WPTHost">{if $orderResultsBy eq "WPTHost"}<b>{/if}
      WPTHost</a>{if $orderResultsBy eq "WPTHost"}</b><a
      href="?orderBy=WPTHost&orderByDir={$orderResultsByDirectionInv}">{if $orderResultsByDirection eq "ASC"}
    <img width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
  </a>{/if}</th>
  <th style="opacity:0.7;background-color:#fdf5e6;padding-bottom:0%;vertical-align:bottom;" align="right"
      colspan="3">Doc Complete
  </th>
  <th style="opacity:0.7;background-color:#dcdcdc;padding-bottom:0%;vertical-align:bottom;" align="right"
      colspan="3">Fully Loaded
  </th>
</tr>
<tr>
  <th align="left" colspan="4"></th>
  <th align="left"><input type="checkbox" id="toggleAllDisplayedResults"></th>
  <th align="right">
    <a title="WPT Remote Agent Dialer ID" href="?orderBy=DialerId">{if $orderResultsBy eq "DialerId"}
    <b>{/if}Agent</a>{if $orderResultsBy eq "DialerId"}</b><a
      href="?orderBy=DialerId&orderByDir={$orderResultsByDirectionInv}">{if $orderResultsByDirection eq "ASC"}
    <img width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
  </a>{/if}
  </th>
  <th align="right">Valid</th>
  <th align="left">
    <a href="?orderBy=Status">{if $orderResultsBy eq "Status"}<b>{/if}
      Status</a>{if $orderResultsBy eq "Status"}</b><a
      href="?orderBy=Status&orderByDir={$orderResultsByDirectionInv}">{if $orderResultsByDirection eq "ASC"}
    <img width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
  </a>{/if}
  </th>
  <th align="left">
    <a title="WPT Runs exectued">Runs</a> ( <a title="Run used for average">Selected</a> )
  </th>
  <th><a href="?orderBy=AvgFirstViewFirstByte">{if $orderResultsBy eq "AvgFirstViewFirstByte"}<b>{/if}
    TTFB</a>{if $orderResultsBy eq "AvgFirstViewFirstByte"}</b><a
      href="?orderBy=AvgFirstViewFirstByte&orderByDir={$orderResultsByDirectionInv}">{if $orderResultsByDirection eq "ASC"}
    <img width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
  </a>{/if}</th>
  {*<th align="right">TTFB</th>*}
  <th align="right">Render</th>
  <th align="right">DomTime</th>
  <th style="opacity:0.7;background-color:#fdf5e6;" align="right"><a
      href="?orderBy=AvgFirstViewDocCompleteTime">{if $orderResultsBy eq "AvgFirstViewDocCompleteTime"}
  <b>{/if}Time</a>{if $orderResultsBy eq "AvgFirstViewDocCompleteTime"}</b><a
      href="?orderBy=AvgFirstViewDocCompleteTime&orderByDir={$orderResultsByDirectionInv}">{if $orderResultsByDirection eq "ASC"}
    <img width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
  </a>{/if}</th>
  <th style="opacity:0.7;background-color:#fdf5e6;" align="right"><a
      href="?orderBy=AvgFirstViewDocCompleteRequests">{if $orderResultsBy eq "AvgFirstViewDocCompleteRequests"}
  <b>{/if}Req</a>{if $orderResultsBy eq "AvgFirstViewDocCompleteRequests"}</b><a
      href="?orderBy=AvgFirstViewDocCompleteRequests&orderByDir={$orderResultsByDirectionInv}">{if $orderResultsByDirection eq "ASC"}
    <img width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
  </a>{/if}</th>
  <th style="opacity:0.7;background-color:#fdf5e6;" align="right"><a
      href="?orderBy=AvgFirstViewDocCompleteBytesIn">{if $orderResultsBy eq "AvgFirstViewDocCompleteBytesIn"}
  <b>{/if}Bytes</a>{if $orderResultsBy eq "AvgFirstViewDocCompleteBytesIn"}</b><a
      href="?orderBy=AvgFirstViewDocCompleteBytesIn&orderByDir={$orderResultsByDirectionInv}">{if $orderResultsByDirection eq "ASC"}
    <img width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
  </a>{/if}</th>
  <th style="opacity:0.7;background-color:#dcdcdc;" align="right"><a
      href="?orderBy=AvgFirstViewFullyLoadedTime">{if $orderResultsBy eq "AvgFirstViewFullyLoadedTime"}
  <b>{/if}Time</a>{if $orderResultsBy eq "AvgFirstViewFullyLoadedTime"}</b><a
      href="?orderBy=AvgFirstViewFullyLoadedTime&orderByDir={$orderResultsByDirectionInv}">{if $orderResultsByDirection eq "ASC"}
    <img width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
  </a>{/if}</th>
  <th style="opacity:0.7;background-color:#dcdcdc;" align="right"><a
      href="?orderBy=AvgFirstViewFullyLoadedRequests">{if $orderResultsBy eq "AvgFirstViewFullyLoadedRequests"}
  <b>{/if}Req</a>{if $orderResultsBy eq "AvgFirstViewFullyLoadedRequests"}</b><a
      href="?orderBy=AvgFirstViewFullyLoadedRequests&orderByDir={$orderResultsByDirectionInv}">{if $orderResultsByDirection eq "ASC"}
    <img width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
  </a>{/if}</th>
  <th style="opacity:0.7;background-color:#dcdcdc;" align="right"><a
      href="?orderBy=AvgFirstViewFullyLoadedBytesIn">{if $orderResultsBy eq "AvgFirstViewFullyLoadedBytesIn"}
  <b>{/if}Bytes</a>{if $orderResultsBy eq "AvgFirstViewFullyLoadedBytesIn"}</b><a
      href="?orderBy=AvgFirstViewFullyLoadedBytesIn&orderByDir={$orderResultsByDirectionInv}">{if $orderResultsByDirection eq "ASC"}
    <img width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
  </a>{/if}</th>

</tr>
{assign var="eo" value="odd"}
{foreach from=$result item=res}
{if $res.SequenceNumber eq '0'}{if $eo == "even"} {assign var="eo" value="odd"} {else} {assign var="eo" value= "even"}{/if}{/if}
    {if $res.SequenceNumber > 0}<tr><td colspan="6" style="padding-bottom:1px;padding-top:0%;"></td> <td colspan="100%" style="padding-bottom:1px;padding-top:0%;vertical-align:middle;background-color: #336633;"></td></tr>{/if}
<tr class="monitoringJobRow {$eo}">
    {if $res.SequenceNumber eq '0' || !$res.SequenceNumber}
  {if $res.Status eq '100' || $res.Status eq '910'}
    <td>
      <form action="processJob.php">
        <input type="hidden" name="result_id" value="{$res.WPTResultId}">
        <input type="hidden" name="forward_to" value="listResults.php">
        <input title="Refresh" class="actionIcon" type="image" src="img/refresh_icon.png" width="18">
      </form>
    </td>
  {else}
    <td colspan="1"></td>
  {/if}
  <td>
    <form action="deleteResult.php" onsubmit="return confirm('Confirm Deletion')">
      <input type="hidden" name="result_id" value="{$res.Id}">
        <input type="hidden" name="forward_to" value="listResults.php">
      <input title="Delete Result" class="actionIcon" type="image" src="img/delete_icon.png" width="17">
    </form>
  </td>

  <td style="paddin-left:0em">
    <form target="_blank" title="View log file" action=jobProcessorLog.php>
      <input type=hidden name=wptResultId value={$res.WPTResultId}>
      <input type="hidden" name="timeStamp" value="{$res.Date}">
      <input class="actionIcon" type="image" src="img/Text.gif" width="17"></form>
  </td>
  <td><a target="_blank" title="{$res.WPTResultId}"
         href={$res.WPTHost}{$wptResultURL}{$res.WPTResultId}><img src="img/favicon.ico" width="17"
                                                                   title="Show WPT Result"></a>&nbsp; {if $res.MultiStep}<img src="img/application-cascade-icon.png" width="18" title="Mutli Sequence Job"> {/if}</td>
  <td><input type="checkbox" name="selectedResult" id="selectedResult" value="{$res.Id}"></td>
    {else}
    <td colspan="5"></td>
    {/if}

  <td align="right" style="padding-bottom:0%;vertical-align:top;">{$res.WPTBandwidthDown}<br>{$res.WPTBandwidthUp}<br>{$res.DialerId}</td>
  <td align="right" style="padding-bottom:0%;vertical-align:top;">
      {*{$res.WPTBandwidthLatency}<br>{$res.WPTBandwidthPacketLoss}<br>*}
    {$res.SequenceNumber}<br>
    {if $res.ValidationState eq 1}<img title="{$res.Id} - Valid Result" src=img/Valid.png>
    {elseif $res.ValidationState eq 2}<img title="{$res.Id} - Invalid Result" src=img/Invalid.png>
    {elseif $res.ValidationState eq 3}<img title="{$res.Id} - Needs Review" src=img/NeedsReview.png>
    {/if}
  </td>
  <td align="left" style="padding-bottom:0%;vertical-align:top;">{if $res.SequenceNumber == 0}{$res.RunLabel}<br>{/if}{$res.Date|date_format:"%D %H:%M:%S"}<br>
    {if $res.Status}{if $statusCodes[$res.Status]}{$statusCodes[$res.Status]}{else}{$res.Status}{/if}{/if}<br></td>
  <td align="left"><a title="JOB: {$res.WPTJob.Label} --- SCRIPT: {$res.WPTJob.WPTScript.Label}"
                      href="listResults.php?filterField=WPTJob.Id&filterValue={$res.WPTJob.Id}">{$res.WPTJob.Label|truncate:45}</a><br>{$res.WPTHost|truncate:45}
    <br>{$res.Runs} ( {if $res.RunToUseForAverage eq 0}Average{else}{$res.RunToUseForAverage})
  {/if}</td>
  <td align="right" valign="top">{$res.AvgFirstViewFirstByte/1000}
    <hr>{$res.AvgRepeatViewFirstByte/1000}</td>
  <td align="right" valign="top">{$res.AvgFirstViewStartRender/1000}
    <hr>{$res.AvgRepeatViewStartRender/1000}</td>
  <td align="right" valign="top">{$res.AvgFirstViewDomTime/1000}
    <hr>{$res.AvgRepeatViewDomTime/1000}</td>
  <td style="opacity:0.7;background-color:#fdf5e6;" align="right"
      valign="top">{$res.AvgFirstViewDocCompleteTime/1000}
    <hr>{$res.AvgRepeatViewDocCompleteTime/1000}</td>
  <td style="opacity:0.7;background-color:#fdf5e6;" align="right"
      valign="top">{if $res.AvgFirstViewDocCompleteRequests}{$res.AvgFirstViewDocCompleteRequests}{else}
    0{/if}
    <hr>{if $res.AvgRepeatViewDocCompleteRequests}{$res.AvgRepeatViewDocCompleteRequests}{else}0{/if}</td>
  <td style="opacity:0.7;background-color:#fdf5e6;" align="right"
      valign="top">{($res.AvgFirstViewDocCompleteBytesIn/1000)|string_format:"%d"}K
    <hr>{($res.AvgRepeatViewDocCompleteBytesIn/1000)|string_format:"%d"}K
  </td>
  <td style="opacity:0.7;background-color:#dcdcdc;" align="right"
      valign="top">{$res.AvgFirstViewFullyLoadedTime/1000}
    <hr>{$res.AvgRepeatViewFullyLoadedTime/1000}</td>
  <td style="opacity:0.7;background-color:#dcdcdc;" align="right"
      valign="top">{if $res.AvgFirstViewFullyLoadedRequests}{$res.AvgFirstViewFullyLoadedRequests}{else}
    0{/if}
    <hr>{if $res.AvgRepeatViewFullyLoadedRequests}{$res.AvgRepeatViewFullyLoadedRequests}{else}0{/if}</td>
  <td style="opacity:0.7;background-color:#dcdcdc;" align="right"
      valign="top">{($res.AvgFirstViewFullyLoadedBytesIn/1000)|string_format:"%d"}K
    <hr>{($res.AvgRepeatViewFullyLoadedBytesIn/1000)|string_format:"%d"}K
  </td>
</tr>

{*<tr class="monitoringJobRow {$eo}">*}
{*<td colspan="100%">{$res.WPTResultId}</td></tr>*}
{if ($showResultsThumbs eq 'true' || $showWaterfallThumbs eq 'true') && $res.Status != 100}
<tr class="monitoringJobRow {$eo}">
  <td colspan="19">
    <table>
      <tr>
        {if $showResultsThumbs eq 'true' && $res.Status != 100}
          <td style="vertical-align:top;">
            <a target="_blank" href="{$res.WPTHost}/result/{$res.WPTResultId}"><img align="top"
                                                                                    src={$res.WPTHost}/result/{$res.WPTResultId}/{if $res.RunToUseForAverage eq 0}1{else}{$res.RunToUseForAverage}{/if}_screen_thumb.jpg></a>
          </td>
        {/if}
        {if $showWaterfallThumbs eq 'true' && $res.Status != 100}
          <td style="vertical-align:top;">
            <a target="_blank" href="{$res.WPTHost}/result/{$res.WPTResultId}/1/details/"><img
                src={$res.WPTHost}/result/{$res.WPTResultId}/{if $res.RunToUseForAverage eq 0}1{else}{$res.RunToUseForAverage}{/if}_waterfall_thumb.png></a>
          </td>
        {/if}
        </td></tr>
    </table>
  </td>
</tr>
{/if}
{/foreach}
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

