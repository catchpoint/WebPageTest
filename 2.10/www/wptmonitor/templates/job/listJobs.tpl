<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  <title>Jobs</title>
  {literal}
    <script type="text/javascript">
      <!--
      function compareFilmstrips() {
        var url = "compareFilmstrips.php?a=b";
        var jobsSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            jobsSelected = true;
            url += "&job_id[]=" + this.value;
          }
        });
        if (!jobsSelected) {
          alert('Please select job(s) to compare');
          return true;
        } else {
          window.open(url);
        }
      }

      function confirmRemoval(text) {
        var confirmTXT = text;
        var confirmBOX = confirm(confirmTXT);
        if (confirmBOX == true) {
          return true;
        }
      }
      function processJobs() {
        var url = "runJobs.php?a=b";
        var jobsSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            jobsSelected = true;
            url += "&job_id[]=" + this.value;
          }
        });
        if (!jobsSelected) {
          alert('Please select job(s) to process');
          return true;
        } else {
          document.location = url;
        }
      }
      function toggleJobActive() {
        var url = "toggleJobActive.php?forward_to=listresults.php";
        var jobsSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            jobsSelected = true;
            url += "&job_id[]=" + this.value;
          }
        });
        if (!jobsSelected) {
          alert('Please select job(s) to process');
          return true;
        } else {
          document.location = url;
        }
      }
      function moveJobsToFolder() {
        var folderId = document.moveJobsToFolderForm.folderId[document.moveJobsToFolderForm.folderId.selectedIndex].value;
        var url = "addToFolder.php?folder=Job&forwardTo=listJobs.php&folderId="+folderId;
        var jobsSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            jobsSelected = true;
            url += "&id[]=" + this.value;
          }
        });
        if (!jobsSelected) {
          alert('Please select job(s) to move');
          return true;
        } else {
          document.location = url;
        }
      }


      $(document).ready(function() {
        $('input#toggleAllDisplayedJobs').click(function() {
          $('input:checkbox').each(function() {
            this.checked = !this.checked;
          });
          return false;
        });
      });
      //-->
    </script>
  {/literal}
</head>
<body>
{assign var="hasUpdatePermission"       value=hasPermission("WPTJob",$folderId, $smarty.const.PERMISSION_UPDATE)}
{assign var="hasExecutePermission"      value=hasPermission("WPTJob",$folderId, $smarty.const.PERMISSION_EXECUTE)}
{assign var="hasCreateDeletePermission" value=hasPermission("WPTJob",$folderId, $smarty.const.PERMISSION_CREATE_DELETE)}
{assign var="hasOwnerPermission"        value=hasPermission("WPTJob",$folderId, $smarty.const.PERMISSION_OWNER)}
{assign var="hasReadPermission"         value=hasPermission("WPTJob",$folderId, $smarty.const.PERMISSION_READ)}

<div class="page">
  {include file='header.tpl'}
  {include file='navbar.tpl'}
  <div id="main">
    <div class="level_2">
      <div class="content-wrap">
        <div class="content">
          <table style="border-collapse:collapse" width="100%" border="0">
            <tr>
              <td><h2 class="cufon-dincond_black">Jobs</h2>
                <form name="folderForm" action="">
                <a href="listFolders.php?folder=Job"><b>Folder:</b></a> <select name="folderId" onchange="document.folderForm.submit();">
                  {html_select_tree permission=$smarty.const.PERMISSION_READ shares=$shares tree=$folderTree selected=$folderId}
                </select>
                </form>
              </td>
              <td align="right" valign="top" nowrap="true">
                <form action="">
                  <input type="hidden" name="currentPage" value="{$currentPage}">
                  Filter: <select name="filterField">
                  <option></option>
                  <option {if $jobsFilterField eq 'Label'} selected="true"{/if}>Label</option>
                  <option {if $jobsFilterField eq 'WPTScript.Label'} selected="true"{/if} value="WPTScript.Label">
                    Scipt
                  </option>
                  {*<option {if $jobsFilterField eq 'Host'} selected="true"{/if}>Host</option>*}
                  {*<option {if $jobsFilterField eq 'Location'} selected="true"{/if}>Location</option>*}
                </select>
                  <input type="text" name="filterValue" value="{$jobsFilterValue}">
                  <input type="submit" value="Filter">
                </form>
              </td>
              <td valign="top">
                <form action=""><input type="hidden" name="clearFilter" value="true"><input type="submit" value="Clear">
                </form>
              </td>
              <td align="right" valign="top">{include file='pager.tpl'}<br>
                {if $showInactiveJobs}<a href="?showInactiveJobs=false">Hide Inactive Jobs</a>{else}<a
                    href="?showInactiveJobs=true">Show Inactive Jobs</a>{/if}
              </td>
            </tr>
          </table>
          <table id="monitoringJobList" class="pretty" width="100%">
            <tr>
              <th>
                <a href="?orderBy=Active">{if $orderJobsBy eq "Active"}<b>{/if}Act</a>{if $orderJobsBy eq "Active"}</b>
                <a href="?orderBy=Active&orderByDir={$orderJobsByDirectionInv}">{if $orderJobsByDirection eq "ASC"}<img
                    width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
                </a>{/if}<br>
              </th>
              <th align="center"><input type="checkbox" id="toggleAllDisplayedJobs" onchange="toggleSelectedJobs();">
              </th>
              <th align="left" colspan="2">
              {if $folderId eq -1}Folder<br>{/if}
                <a href="?orderBy=Label">{if $orderJobsBy eq "Label"}<b>{/if}Label</a>{if $orderJobsBy eq "Label"}</b><a
                  href="?orderBy=Label&orderByDir={$orderJobsByDirectionInv}">{if $orderJobsByDirection eq "ASC"}<img
                  width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
              </a>{/if}<br>
                <a href="?orderBy=WPTScript.Label">{if $orderJobsBy eq "WPTScript.Label"}<b>{/if}
                  Script</a>{if $orderJobsBy eq "WPTScript.Label"}</b><a
                  href="?orderBy=WPTScript.Label&orderByDir={$orderJobsByDirectionInv}">{if $orderJobsByDirection eq "ASC"}
                <img width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
              </a>{/if}
              </th>
              <th align="left">
                {*<a href="?orderBy=Host">{if $orderJobsBy eq "Host"}<b>{/if}Host</a>{if $orderJobsBy eq "Host"}</b><a*}
                  {*href="?orderBy=Host&orderByDir={$orderJobsByDirectionInv}">{if $orderJobsByDirection eq "ASC"}<img*}
                  {*width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}*}
              {*</a>{/if}*}
                {*<a href="?orderBy=Location">{if $orderJobsBy eq "Location"}<b>{/if}*}
                  Location(s)
                  {*</a>{if $orderJobsBy eq "Location"}</b><a*}
                  {*href="?orderBy=Location&orderByDir={$orderJobsByDirectionInv}">{if $orderJobsByDirection eq "ASC"}<img*}
                  {*width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}*}
              {*</a>*}
              {*{/if}*}
              </th>
              <th align="right" style="padding-bottom:0%;vertical-align:top;">
                <a title="Frequency in minutes" href="?orderBy=Frequency">{if $orderJobsBy eq "Frequency"}<b>{/if}
                  Freq</a>{if $orderJobsBy eq "Frequency"}</b><a
                  href="?orderBy=Frequency&orderByDir={$orderJobsByDirectionInv}">{if $orderJobsByDirection eq "ASC"}
                <img width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
              </a>{/if}<br>BWDown
              </th>
              <th align="right">Runs<br>BWUp</th>
              <th align="right">Total<br>Latency</th>
              <th align="right">
                <a title="LastRun in minutes" href="?orderBy=LastRun">{if $orderJobsBy eq "LastRun"}<b>{/if}
                  Last</a>{if $orderJobsBy eq "LastRun"}</b><a
                  href="?orderBy=LastRun&orderByDir={$orderJobsByDirectionInv}">{if $orderJobsByDirection eq "ASC"}<img
                  width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
              </a>{/if}<br>PKT Loss
              </th>
              <th colspan="6" align="center">Actions</th>
            </tr>
            {assign var="eo" value="odd"}
            {foreach from=$result item=res}
            {if $eo == "even"} {assign var="eo" value="odd"} {else} {assign var="eo" value= "even"}{/if}
              <tr class="{$eo}">
                <td style="padding-bottom:0%;vertical-align:top;">
                {if $hasUpdatePermission}
                <a title="Toggle Active/Inactive" href=toggleJobActive.php?job_id[]={$res.Id}&state={$res.Active}>{/if}
                {if $res.Active}
                  <img src="img/playing.png" width="20" height="20">
                {else}
                  <img src="img/paused.png" width="20" height="20">
                {/if}</a>
                </td>
                <td style="padding-bottom:0%;vertical-align:top;"><input type="checkbox" name="selectedJob" id="selectedJob" value="{$res.Id}"></td>
                <td style="padding-bottom:0%;vertical-align:top;" colspan="2" nowrap="true">
                {if $folderId eq -1}<a href=listJobs.php?folderId={$res.WPTJobFolder.id}>{$res.WPTJobFolder.Label}</a> <br>{/if}
                  <a href=listResults.php?folderId={$res.WPTJobFolderId}&filterField=WPTJob.Id&filterValue={$res.Id}>{$res.Label|truncate:60}</a><br>
                  {*{if hasPermission("WPTScript",$res.WPTScript.WPTScriptFolderId, $smarty.const.PERMISSION_UPDATE)}*}
                  <a href=editScript.php?id={$res.WPTScript.Id}>
                  {*{/if}*}
                  {$res.WPTScript.Label|truncate:60}</a></td>
                <td>{foreach $res.WPTJob_WPTLocation as $loc}
                    {$loc.WPTLocation.Label} - {$loc.WPTLocation.Browser}<br>
                    {/foreach}
                </td>
                <td align="right" style="padding-bottom:0%;vertical-align:top;">{$res.Frequency}<br>{$res.WPTBandwidthDown}</td>
                <td align="right" style="padding-bottom:0%;vertical-align:top;">{$res.Runs}{if !$res.FirstViewOnly}R{/if}<br>{$res.WPTBandwidthUp}</td>
                <td align="right" style="padding-bottom:0%;vertical-align:top;">{$res.ResultCount}<br>{$res.WPTBandwidthLatency}</td>
                {*<td>calc</td>*}
                <td align="right" nowrap="true" style="padding-bottom:0%;vertical-align:top;">{$res.Lastrun|date_format:"%D"} {$res.Lastrun|date_format:"%H:%M"}<br>{$res.WPTBandwidthPacketLoss}</td>
                <td align="right" style="padding-bottom:0%;vertical-align:top;">
                  <table>
                    <tr>
                    {if $hasUpdatePermission}
                      <form action="editJob.php">
                        <input type="hidden" name="id" value="{$res.Id}">
                        <input type="hidden" name="folderId" value="{$res.WPTJobFolderId}">
                        <td style="padding:1px">
                          <input class="actionIcon" type="image" src="img/edit_icon.png" title="Edit" alt="Edit" value="Edit">
                        </td>
                      </form>
                    {/if}
                    {if $hasCreateDeletePermission}
                      <form action="deleteJob.php" name="deleteJob" onsubmit="return confirm('Confirm Deletion')">
                        <input type="hidden" name="id" value="{$res.Id}">
                        <td style="padding:1px">
                          <input class="actionIcon" type="image" title="Delete" src="img/delete_icon.png" value="Del">
                        </td>
                      </form>
                    {/if}
                    {if $hasCreateDeletePermission}
                      <form action="copyJob.php" name="copyJob" onsubmit="return confirm('Confirm Copy')">
                        <input type="hidden" name="id" value="{$res.Id}">
                        <input type="hidden" name="folderId" value="{$res.WPTJobFolderId}">
                        <td style="padding:1px">
                          <input class="actionIcon" type="image" src="img/copy_icon.png" title="Copy" value="Copy">
                        </td>
                      </form>
                    {/if}
                      <td style="padding:1px">
                      {if $hasReadPermission}
                        <form action="flashGraph.php">
                          <input class="actionIcon" type="image" src="img/graph_icon.png" title="Graph" value="Graph"/>
                          <input type="hidden" name="fields[]" value=FV_Doc>
                          {*<input type="hidden" name=startRender value=on>*}
                          {*<input type="hidden" name=docLoaded value=on>*}
                          {*<input type="hidden" name=domTime value=on>*}
                          <input type="hidden" name="job_id[]" value="{$res.Id}">
                        </form>
                      {/if}
                      </td>
                      <td style="padding:1px">
                      {if $hasExecutePermission}
                        <form action="processJob.php">
                          <input type="hidden" name=force value=on>
                          <input type="hidden" name=priority value=1>
                          <input type="hidden" name="job_id[]" value="{$res.Id}">
                          <input type="hidden" name="forward_to"
                                 value="listResults.php?orderBy=Date&orderByDir=DESC&filterField=WPTJob.Id&filterValue={$res.Id}"/>
                          <input class="actionIcon" type="image" src="img/execute_icon.png" title="Execute job now."
                                 value="Exec"/>
                        </form>
                      {/if}
                      </td>
                      </td></tr>
                  </table>
                </td>
              </tr>
            {/foreach}
            <tr>
              <td colspan="25" valign="top">
                <table width="100%" border="0">
                  <tr>
                    <td align="left" nowrap="true">
                  {if $hasExecutePermission}
                      <input onclick="processJobs();" type="submit" value="Execute Job(s)">
                  {/if}
                  {if $hasUpdatePermission}
                      <input onclick="toggleJobActive();" type="submit" value="Toggle Active">
                  {/if}
                      <input onclick="compareFilmstrips();" type="button" value="Compare Filmstrips">
                    {if $hasOwnerPermission}
                      <p><form name="moveJobsToFolderForm">
                        <input type="button" value="Move to folder" onclick="moveJobsToFolder()">
                        <select name="folderId">
                          {html_select_tree tree=$folderTree}
                        </select>
                      </form>
                    {/if}
                    </td>
                    <td align="right" valign="top">
                    {if $hasCreateDeletePermission}
                      <form action="editJob.php">
                        <input type="hidden" name="folderId" value="{$folderId}">
                        <input type="submit" value="Add New Monitoring Job">
                      </form>
                    {/if}
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
