<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
    "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  <title>Monitoring Job</title>
  {literal}
    <script>
      $(document).ready(function() {
        $("#updateForm").validate();
      });
    </script>
  {/literal}
</head>
<body onload="updateJobCount();">
<div class="page">
  {include file='header.tpl'}
  {include file='navbar.tpl'}
  <div id="main">
    <div class="level_2">
      <div class="content-wrap">
        <div class="content" style="height:auto;">
          <br>
          <h2 class="cufon-dincond_black">Monitoring Job</h2>
          {literal}
              <script type="text/javascript">
                $().ready(function() {
                  $('#removeAlert').click(function() {
                    return !$('#alerts option:selected').remove().appendTo('#availableAlerts');
                  });
                  $('#addAlert').click(function() {
                    return !$('#availableAlerts option:selected').remove().appendTo('#alerts');
                  });
                });
                $().ready(function () {
                    $('#removeLocation').click(function () {
                        return !$('#locations option:selected').remove().appendTo('#availableLocations');
                    });
                    $('#addLocation').click(function () {
                        return !$('#availableLocations option:selected').remove().appendTo('#locations');
                    });
                });
              </script>

              <script>
                var allowUpdate = true;
                function updateJobCount() {
                  maxJobsPerMonth = document.getElementById('maxJobsPerMonth').value;

                  numberOfRuns = document.getElementById('numberofruns');
                  numberOfRunsIdx = numberOfRuns.selectedIndex;
                  numberOfRunsValue = numberOfRuns[numberOfRunsIdx].value;

                  frequency = document.getElementById('jobFrequency');
                  frequencyIdx = frequency.selectedIndex;
                  frequencyValue = frequency[frequencyIdx].value;

                  jobCount = numberOfRunsValue * (43200 / frequencyValue);
                  currentJobCount = parseInt(document.getElementById('currentJobCountInitial').value) + jobCount;
                  document.getElementById('currentJobCount').value = currentJobCount;
                  if (currentJobCount > maxJobsPerMonth) {
                    allowUpdate = false;
                    document.getElementById('currentJobCount').style.color = "red";
                  } else {
                    document.getElementById('currentJobCount').style.color = "";
                    allowUpdate = true;
                  }
                }
                function validateUpdateForm() {
                  jobActive = document.getElementById('active').value;
                  $('#alerts option').each(function(i) {
                    $(this).attr("selected", "selected");
                  });
                $('#locations option').each(function(i) {
                  $(this).attr("selected", "selected");
                });

                  if (!allowUpdate)
                    if (!jobActive) {
                      alert('Warning: Maximum allowed job count exceeded. You will not be able to activate this job unless other jobs are deactivated.');
                      return true;
                    } else {
                      resp = confirm('Maximum allowed job count exceeded. You can disable this job and save your changes, but you will not be able to activate this job until others jobs are deactivated. Do you wish to deactivate this job and save?');
                      if (resp) {
                        document.getElementById('active').checked = false;
                      }
                      return resp;
                    }
                }
                $(document).ready(function() {
                  $("#updateForm").validate();
                });
              </script>
            {/literal}
          <div class="translucent" align="center">

          {* If $job.Id has a value then we are editing, otherwise we are adding/creating*}
          {if $job.Id > -1}
            {assign var="requiredPermission" value=$smarty.const.PERMISSION_UPDATE}
          {else}
            {assign var="requiredPermission" value=$smarty.const.PERMISSION_CREATE_DELETE}
          {/if}
          <form method="post" class="cmxform" action="updateJob.php" name="updateForm" id="updateForm"
                onsubmit="return validateUpdateForm()">
            <input type="hidden" name="id" value="{$job.Id}">
            <table align="center" width="80%">
              <tr>
                <td align="right"><label title="Folder in which to place this job.">Folder</label></td>
                <td>
                <select name="folderId" {if hasPermission("WPTJob",$folderId, $smarty.const.PERMISSION_UPDATE)}{else}disabled{/if}>
                    {html_select_tree permission=$requiredPermission shares=$shares tree=$folderTree selected=$folderId}
                </select>
                </td>
              </tr>
              <tr>
                <td align="right">
                  <label title="Activate/Deactivate Job." for="active">Active</label></td>
                <td><input type="checkbox" id="active" value="1" name="active" {if $job.Active}checked="true"{/if}>
                </td>
              </tr>
              <tr>
                <td align="right"><label title="Job Label" for="label">Label</label></td>
                <td><input type="text" name="label" id="label" value="{$job.Label}" size="60" class="required"></td>
              </tr>
              <tr>
                <td valign="top" align="right"><label title="Description of Job." for="description">Description</label></td>
                <td><textarea id="description" name="description"
                              style="height:40px;width:500px">{$job.Description}</textarea></td>
              </tr>
              <tr>
                <td align="right"><label title="The script this job should execute.">Script</label></td>
                <td><select name="script" style="width:500px;" {if $canChangeScript}{else}disabled="true" {/if}>
                  {html_options options=$scripts selected=$job.WPTScriptId}
                </select>
                  <a href="editScript.php?">New Script</a></td>
              </tr>
              <tr>
                <td colspan="4">
                  <hr>
                </td>
              </tr>
              <tr>
                <td valign="top" align="right"><label title="Alerts to associate with this job." for="alerts"><br>Alert</label></td>
                <td nowrap="true">
                  <div style="float:left;">
                    Selected<br>
                    <select style="width:280px;height:100px;" name="alerts[]" multiple id="alerts">
                      {foreach from=$alerts key=k item=v}
                      {if $v.Selected}
                        <option {if $v.Active}{else}style="color:red;"
                                title="This job is not currently enabled." {/if} value="{$v.Id}">{$v.Label}</option>
                      {/if}
                      {/foreach}
                    </select>
                  </div>
                  <div align="center" style="vertical-align:middle;float:left;padding:10px">
                    <br><input type="image" id="addAlert" src="img/Back.png" class="actionIcon">
                    <br><input type="image" src="img/Forward.png" id="removeAlert" class="actionIcon">
                  </div>
                  <div>
                    Available Alerts ( Red indicates alert is not active )<br>
                    <select style="width:280px;height:100px;" multiple id="availableAlerts">
                      {foreach from=$alerts key=k item=v}
                      {if !$v.Selected}
                        <option {if $v.Active}{else}style="color:red;"
                                title="This job is not currently enabled." {/if} value="{$v.Id}">{$v.Label}</option>
                      {/if}
                      {/foreach}
                    </select>
                  </div>
              </tr>
              <tr>
                <td colspan="4">
                  <hr>
                </td>
              </tr>
              <tr>
                <td align="right">
                  <label title="Instruct the target WPT host to include only the first view">First View Only</label>
                </td>
                <td>
                  <input type="checkbox" name="firstviewonly" value="on" {if $job.FirstViewOnly}checked="true" {/if}/></td>
              </tr>
              <tr>
                <td align="right">
                  <label title="Instruct the target WPT host to capture video and filmstrip">Capture Video</label>
                </td>
                <td><input type="checkbox" name="video" value="on" {if $job.Video}checked="true" {/if}/></td>
              </tr>
              {*<tr>*}
                {*<td align="right" nowrap="true">*}
                  {*<label title="Downlaod summary result information in XML">Download Result XML</label>*}
                {*</td>*}
                {*<td><input type="checkbox" name="downloadresultxml" value="true"*}
                           {*{if $job.DownloadResultXml}checked="true" {/if}/></td>*}
              {*</tr>*}
              {*<tr>*}
                {*<td align="right"><a class="tooltip"><label>Download Details</label><span>Download all assets for results, filmstrip, detail request info, etc.</span>*}
                {*</td>*}
                {*<td><input type="checkbox" name="downloaddetails" value="true"*}
                           {*{if $job.DownloadDetails}checked="true" {/if}/></td>*}
              {*</tr>*}
              <tr>
                <td align="right" nowrap="true"><label title="If the WPT instance is unable to successfully make a callback when the job has completed, Monitor will query for completed jobs each time the job processor is executed. This number indicates how many times Monitor should attempt to fetch the results." for="maxdownloadattempts">Max Download Attempts</label></td>
                <td><input type="text" name="maxdownloadattempts" id="maxdownloadattempts"
                           value="{$job.MaxDownloadAttempts}" class="required number" maxlength="2" size="4"></td>
              </tr>
              <tr>
                <td align="right" nowrap="true">
                    <label title="The maximum number of jobs that can be configure for submission measured monthly. This is configured by the admin via the edit user tab." for="maxJobsPerMonth">Maximum Jobs Per Month</label></td>
                <td><input id="maxJobsPerMonth" type="text" disabled="true" value="{$maxJobsPerMonth}"></td>
              </tr>
              <tr>
                <td align="right" nowrap="true">
                    <label title="Current number of jobs configured for submission measured monthly. Formula: Number of Runs * ( 43200 / Frequency )" for="currentJobCount">Current Job Count</label></td>
                <td><input id="currentJobCount" type="text" disabled="true" value="{$currentJobCount}">
                  <input style="visibility:hidden;" id="currentJobCountInitial" type="text" disabled="true"
                         value="{$currentJobCount}"></td>
              </tr>
              <tr>
                <td align="right">
                    <label title="The WPT 'Number of Tests to Run'" for="numberofruns">Number of runs</label></td>
                <td><select name="numberofruns" id="numberofruns" onblur="updateJobCount();"
                            onkeyup="updateJobCount();" onchange="updateJobCount();">
                    <option {if $job.Runs eq 1}selected="true" {/if}>1</option>
                    <option {if $job.Runs eq 2}selected="true" {/if}>2</option>
                    <option {if $job.Runs eq 3}selected="true" {/if}>3</option>
                    <option {if $job.Runs eq 4}selected="true" {/if}>4</option>
                    <option {if $job.Runs eq 5}selected="true" {/if}>5</option>
                    <option {if $job.Runs eq 6}selected="true" {/if}>6</option>
                    <option {if $job.Runs eq 7}selected="true" {/if}>7</option>
                    <option {if $job.Runs eq 8}selected="true" {/if}>8</option>
                    <option {if $job.Runs eq 9}selected="true" {/if}>9</option>
                    <option {if $job.Runs eq 10}selected="true" {/if}>10</option>
                    </select></td>
              </tr>
              <tr>
                <td align="right">
                    <label title="Which WPT test run to use for reporting/graphing" for="runtouseforaverage">Run to use</label></td>
                <td><select name="runtouseforaverage" id="runtouseforaverage">
                    <option {if $job.RunToUseForAverage eq 0}selected="true" {/if} value="0" >Average</option>
                    <option {if $job.RunToUseForAverage eq 1}selected="true" {/if}>1</option>
                    <option {if $job.RunToUseForAverage eq 2}selected="true" {/if}>2</option>
                    <option {if $job.RunToUseForAverage eq 3}selected="true" {/if}>3</option>
                    <option {if $job.RunToUseForAverage eq 4}selected="true" {/if}>4</option>
                    <option {if $job.RunToUseForAverage eq 5}selected="true" {/if}>5</option>
                    <option {if $job.RunToUseForAverage eq 6}selected="true" {/if}>6</option>
                    <option {if $job.RunToUseForAverage eq 7}selected="true" {/if}>7</option>
                    <option {if $job.RunToUseForAverage eq 8}selected="true" {/if}>8</option>
                    <option {if $job.RunToUseForAverage eq 9}selected="true" {/if}>9</option>
                    <option {if $job.RunToUseForAverage eq 10}selected="true" {/if}>10</option>

                </select></td>
              </tr>
              {*<tr>*}
                {*<td align="right"><label title="From which WPT Host and Location to execute the test.">Location</label></td>*}
                {*<td><select name="location">*}
                  {*{html_options options=$wptLocations selected=$selectedLocation}*}
              {*</tr>*}
              <tr>
                  <td valign="top" align="right"><label title="Locations from which to execute this job." for="locations"><br>Locations</label></td>
                  <td nowrap="true">
                    <div style="float:left;">
                      Selected Locations<br>
                      <select style="width:280px;height:100px;" name="locations[]" multiple id="locations">
                        {foreach from=$locations key=k item=v}
                        {if $v.Selected}
                          <option {if $v.Active}{else}style="color:red;"
                                  title="This location is not currently enabled." {/if} value="{$v.Id}">{$v.Label} : {$v.Browser}</option>
                        {/if}
                        {/foreach}
                      </select>
                    </div>
                    <div align="center" style="vertical-align:middle;float:left;padding:10px">
                      <br><input type="image" id="addLocation" src="img/Back.png" class="actionIcon">
                      <br><input type="image" src="img/Forward.png" id="removeLocation" class="actionIcon">
                    </div>
                    <div>
                      Available Locations<br>
                        <select style="width:280px;height:100px;" multiple id="availableLocations">
                          {foreach from=$locations key=k item=v}
                          {if !$v.Selected}
                            <option {if $v.Active}{else}style="color:red;"
                                    title="This job is not currently enabled." {/if} value="{$v.Id}">{$v.Label} : {$v.Browser}</option>
                          {/if}
                          {/foreach}
                        </select>
                    </div>
                </tr>
              <tr>
                <td align="right"><label title="How often the job should be executed.">Frequency</label></td>
                <td><select id="jobFrequency" name="frequency" onblur="updateJobCount();" onkeyup="updateJobCount();"
                            onchange="updateJobCount();">
                  <option {if $job.Frequency=="5"} selected="true"{/if} value="5">5 minutes</option>
                  <option {if $job.Frequency=="10"} selected="true"{/if} value="10">10 minutes</option>
                  <option {if $job.Frequency=="15"} selected="true"{/if} value="15">15 minutes</option>
                  <option {if $job.Frequency=="20"} selected="true"{/if} value="20">20 minutes</option>
                  <option {if $job.Frequency=="30"} selected="true"{/if}value="30">30 minutes</option>
                  <option {if $job.Frequency=="60"} selected="true"{/if}value="60">1 hour</option>
                  <option {if $job.Frequency=="120"} selected="true"{/if}value="120">2 hours</option>
                  <option {if $job.Frequency=="180"} selected="true"{/if}value="180">3 hours</option>
                  <option {if $job.Frequency=="240"} selected="true"{/if}value="240">4 hours</option>
                  <option {if $job.Frequency=="300"} selected="true"{/if}value="300">5 hours</option>
                  <option {if $job.Frequency=="360"} selected="true"{/if}value="360">6 hours</option>
                  <option {if $job.Frequency=="720"} selected="true"{/if}value="720">12 hours</option>
                  <option {if $job.Frequency=="1440"} selected="true"{/if}value="1440">Daily</option>
                  <option {if $job.Frequency=="10080"} selected="true"{/if}value="10080">Weekly</option>
                </select></td>
              </tr>
              <tr><td colspan="4"><hr></td></tr>
              <tr><td></td><td style="font-size: larger;font-style: italic;;font-weight: bold;">Bandwidth shaping Requires WPT agents configured with IPFW Dummynet.</td></tr>
              <tr>
                <td align="right"><label title="The WPT BW Down setting to use.">Bandwidth Down</label></td>
                <td align="left"><input type="text" name="bandwidthDown" value="{$job.WPTBandwidthDown}" size="5" style="text-align:right;"> Kbps</td>
              </tr>
              <tr>
                <td align="right"><label title="The WPT BW Up setting to use.">Bandwidth Up</label></td>
                <td align="left"><input type="text" name="bandwidthUp" value="{$job.WPTBandwidthUp}" size="5" style="text-align:right;"> Kbps</td>
              </tr>
              <tr>
                <td align="right"><label title="The WPT Latency setting to use.">Latency</label></td>
                <td align="left"><input type="text" name="bandwidthLatency" value="{$job.WPTBandwidthLatency}" size="5" style="text-align:right;"> ms</td>
              </tr>
              <tr>
                <td align="right"><label title="The WPT Packet Loss setting to use.">Packet Loss</label></td>
                <td align="left"><input type="text" name="bandwidthPacketLoss" value="{$job.WPTBandwidthPacketLoss}" size="5" style="text-align:right;"> %</td>
              </tr>
              <tr>

                <td></td>
                <td><input type="submit" value="Save"></td>
              </tr>
            </table>
          </form>
          </div>        </div>
      </div>
    </div>
</body>
</html>
