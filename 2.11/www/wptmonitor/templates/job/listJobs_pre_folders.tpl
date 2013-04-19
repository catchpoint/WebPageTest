<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  <title>Jobs</title>
  {literal}
    <script type="text/javascript">
      <!--
      function compareFilmstrips(){
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
<div class="page">
  {include file='header.tpl'}
  {include file='navbar.tpl'}
  <div id="main">
    <div class="level_2">
      <div class="content-wrap">
        <div class="content">
          <table style="border-collapse:collapse" width="100%">
            <tr>
              <td><h2 class="cufon-dincond_black">Jobs</h2></td>
              <td align="right" valign="top">
                <form action="">
                  <input type="hidden" name="currentPage" value="{$currentPage}">
                  Filter: <select name="filterField">
                  <option></option>
                  <option {if $jobsFilterField eq 'Label'} selected="true"{/if}>Label</option>
                  <option {if $jobsFilterField eq 'WPTScript.Label'} selected="true"{/if} value="WPTScript.Label">
                    Scipt
                  </option>
                  <option {if $jobsFilterField eq 'Host'} selected="true"{/if}>Host</option>
                  <option {if $jobsFilterField eq 'Location'} selected="true"{/if}>Location</option>
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
                <a href="?orderBy=Host">{if $orderJobsBy eq "Host"}<b>{/if}Host</a>{if $orderJobsBy eq "Host"}</b><a
                  href="?orderBy=Host&orderByDir={$orderJobsByDirectionInv}">{if $orderJobsByDirection eq "ASC"}<img
                  width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
              </a>{/if}<br>
                <a href="?orderBy=Location">{if $orderJobsBy eq "Location"}<b>{/if}
                  Location</a>{if $orderJobsBy eq "Location"}</b><a
                  href="?orderBy=Location&orderByDir={$orderJobsByDirectionInv}">{if $orderJobsByDirection eq "ASC"}<img
                  width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
              </a>{/if}
              </th>
              <th>
                <a title="Frequency in minutes" href="?orderBy=Frequency">{if $orderJobsBy eq "Frequency"}<b>{/if}
                  Freq</a>{if $orderJobsBy eq "Frequency"}</b><a
                  href="?orderBy=Frequency&orderByDir={$orderJobsByDirectionInv}">{if $orderJobsByDirection eq "ASC"}
                <img width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
              </a>{/if}
              </th>
              <th align="right">Runs</th>
              <th align="right">Total</th>
              <th align="right">Alerts</th>
              <th align="right">
                <a title="LastRun in minutes" href="?orderBy=LastRun">{if $orderJobsBy eq "LastRun"}<b>{/if}
                  Last</a>{if $orderJobsBy eq "LastRun"}</b><a
                  href="?orderBy=LastRun&orderByDir={$orderJobsByDirectionInv}">{if $orderJobsByDirection eq "ASC"}<img
                  width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
              </a>{/if}
              </th>
              <th colspan="6" align="center">Actions</th>
            </tr>
            {assign var="eo" value="odd"}
            {foreach from=$result item=res}
            {if $eo == "even"} {assign var="eo" value="odd"} {else} {assign var="eo" value= "even"}{/if}
              <tr class="{$eo}">
                <td>
                  <a title="Toggle Active/Inactive" href="toggleJobActive.php?job_id[]={$res.Id}&state={$res.Active}">
                  {if $res.Active}
                    <img src="img/playing.png" width="20" height="20">
                  {else}
                    <img src="img/paused.png" width="20" height="20">
                  {/if}</a>
                </td>
                <td align="center"><input type="checkbox" name="selectedJob" id="selectedJob" value="{$res.Id}"></td>
                <td colspan="2" nowrap="true"><a
                    href=listResults.php?filterField=WPTJob.Id&filterValue={$res.Id}>{$res.Label|truncate:60}</a><br>
                  <a href=editScript.php?id={$res.WPTScript.Id}>{$res.WPTScript.Label|truncate:60}</a></td>
                <td>{$res.Host}<br>{$res.Location}</td>
                <td align="right">{$res.Frequency}</td>
                <td align="right">{$res.Runs}{if !$res.FirstViewOnly}R{/if}</td>
                <td align="right">{$res.ResultCount}</td>
                <td align="right">{$alertCount[$res.Id]}</td>
                {*<td>calc</td>*}
                <td align="right">{$res.Lastrun|date_format:"%D"}<br>{$res.Lastrun|date_format:"%H:%M"}</td>
                <td align="right">
                  <table>
                    <tr>
                      <form action="editJob.php">
                        <input type="hidden" name="id" value="{$res.Id}">
                        <td style="padding:1px"><input class="actionIcon" type="image" src="img/edit_icon.png"
                                                       title="Edit" alt="Edit" value="Edit">
                        </td>
                      </form>
                      <form action="deleteJob.php" name="deleteJob" onsubmit="return confirm('Confirm Deletion')">
                        <input type="hidden" name="id" value="{$res.Id}">
                        <td style="padding:1px">
                          <input class="actionIcon" type="image" title="Delete" src="img/delete_icon.png" value="Del">
                        </td>
                      </form>
                      <form action="copyJob.php" name="copyJob" onsubmit="return confirm('Confirm Copy')">
                        <input type="hidden" name="id" value="{$res.Id}">
                        <td style="padding:1px"><input class="actionIcon" type="image" src="img/copy_icon.png"
                                                       title="Copy" value="Copy"></td>
                      </form>
                      <td style="padding:1px">
                        <form action="flashGraph.php">
                          <input class="actionIcon" type="image" src="img/graph_icon.png" title="Graph" value="Graph"/>
                          <input type="hidden" name="fields[]" value=FV_Doc>
                          {*<input type="hidden" name=startRender value=on>*}
                          {*<input type="hidden" name=docLoaded value=on>*}
                          {*<input type="hidden" name=domTime value=on>*}
                          <input type="hidden" name="job_id[]" value="{$res.Id}">
                        </form>
                      </td>
                      <td style="padding:1px">
                        <form action="processJob.php">
                          <input type="hidden" name=force value=on>
                          <input type="hidden" name=priority value=1>
                          <input type="hidden" name="job_id[]" value="{$res.Id}">
                          <input type="hidden" name="forward_to"
                                 value="listResults.php?orderBy=Date&orderByDir=DESC&filterField=WPTJob.Id&filterValue={$res.Id}"/>
                          <input class="actionIcon" type="image" src="img/execute_icon.png" title="Execute job now."
                                 value="Exec"/>
                        </form>
                      </td>
                      </td></tr>
                  </table>
                </td>
              </tr>
            {/foreach}
            <tr>
              <td colspan="25">
                <table width="100%" border="0">
                  <tr>
                    <td align="left">
                      <input onclick="processJobs();" type="submit" value="Execute Job(s)">
                      <input onclick="toggleJobActive();" type="submit" value="Toggle Active">
                      <input onclick="compareFilmstrips();" type="button" value="Compare Filmstrips">
                      </td>
                    <td align="right">
                      <form action="editJob.php"><input type="submit" value="Add New Monitoring Job"></form>
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
