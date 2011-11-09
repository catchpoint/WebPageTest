<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  <title>Alerts</title>
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
      function processAlerts() {
        var url = "runAlerts.php?a=b";
        var alertsSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            alertsSelected = true;
            url += "&alert_id[]=" + this.value;
          }
        });
        if (!alertsSelected) {
          alert('Please select alert(s) to process');
          return true;
        } else {
//            var runlabel = prompt("Run Label (optional)", "");

          document.location = url;
        }
      }
      function toggleAlertActive() {
        var url = "toggleAlertActive.php?forward_to=listresults.php";
        var alertsSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            alertsSelected = true;
            url += "&alert_id[]=" + this.value;
          }
        });
        if (!alertsSelected) {
          alert('Please select alert(s) to process');
          return true;
        } else {
          document.location = url;
        }
      }
      function moveAlertsToFolder() {
        var folderId = document.moveAlertsToFolderForm.folderId[document.moveAlertsToFolderForm.folderId.selectedIndex].value;
        var url = "addToFolder.php?folder=Alert&forwardTo=listAlerts.php&folderId="+folderId;
        var jobsSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            alertsSelected = true;
            url += "&id[]=" + this.value;
          }
        });
        if (!alertsSelected) {
          alert('Please select alert(s) to move');
          return true;
        } else {
          document.location = url;
        }
      }

      $(document).ready(function() {
        $('input#toggleAllDisplayedAlerts').click(function() {
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
              <td><h2 class="cufon-dincond_black">Alerts</h2>
                <form name="folderForm" action="">
                <a href="listFolders.php?folder=Alert"><b>Folder:</b></a>
                  <select name="folderId" onchange="document.folderForm.submit();">
                    {html_select_tree permission=$smarty.const.PERMISSION_READ shares=$shares tree=$folderTree selected=$folderId}
                </select>
                </form>
              </td>
              <td align="right" valign="top">
                <form action="">
                  <input type="hidden" name="currentPage" value="{$currentPage}">
                  Filter: <select name="filterField">
                  <option></option>
                  <option {if $alertsFilterField eq 'Label'} selected="true"{/if}>Label</option>
                </select>
                  <input type="text" name="filterValue" value="{$alertsFilterValue}">
                  <input type="submit" value="Filter">
                </form>
              </td>
              <td valign="top">
                <form action=""><input type="hidden" name="clearFilter" value="true"><input type="submit" value="Clear">
                </form>
              </td>
              <td align="right" valign="top">{include file='pager.tpl'}<br>
                {if $showInactiveAlerts}<a href="?showInactiveAlerts=false">Hide Inactive Alerts</a>{else}<a
                    href="?showInactiveAlerts=true">Show Inactive Alerts</a>{/if}
              </td>
            </tr>
          </table>
          <table id="alertList" class="pretty" width="100%">
            <tr>
              <th align="center">
                <a href="?orderBy=Active">{if $orderAlertsBy eq "Active"}<b>{/if}
                  Act</a>{if $orderAlertsBy eq "Active"}</b><a
                  href="?orderBy=Active&orderByDir={$orderAlertsByDirectionInv}">{if $orderAlertsByDirection eq "ASC"}
                <img width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
              </a>{/if}<br>
              </th>
              <th align="center"><input type="checkbox" id="toggleAllDisplayedAlerts"
                                        onchange="toggleSelectedAlerts();"></th>
              <th align="left">
              {if $folderId eq -1}Folder{/if}
                <a href="?orderBy=Label">{if $orderAlertsBy eq "Label"}<b>{/if}
                  Label</a>{if $orderAlertsBy eq "Label"}</b><a
                  href="?orderBy=Label&orderByDir={$orderAlertsByDirectionInv}">{if $orderAlertsByDirection eq "ASC"}
                <img width="10" height="10" src='img/Up.png'>{else}<img width="10" height="10" src='img/Down.png'>{/if}
              </a>{/if}<br>
              </th>
              <th align="left">
                Description
              </th>
              <th align="left">
                Type
              </th>
              <th align="center">Comp</th>
              <th align="center">Value</th>
              <th align="right">Threshold</th>
              <th align="right">Last Alert</th>
              <th align="center"> Actions</th>
            </tr>
            {assign var="eo" value="odd"}
            {foreach from=$result item=res}
            {if $eo == "even"} {assign var="eo" value="odd"} {else} {assign var="eo" value= "even"}{/if}
              <tr class="{$eo}">
                <td align="center">
                  {if hasPermission("Alert",$folderId, $smarty.const.PERMISSION_UPDATE)}
                  <a title="Toggle Active/Inactive"
                     href=toggleAlertActive.php?alert_id[]={$res.Id}&state={$res.Active}>{if $res.Active}
                     <img src="img/playing.png" width="20" height="20">{else}<img src="img/paused.png" width="20" height="20">{/if}</a>{/if}
                </td>
                <td align="center"><input type="checkbox" name="selectedAlert" id="selectedAlert" value="{$res.Id}">
                </td>
                <td nowrap="true">
            {if $folderId eq -1}<a href=listAlerts.php?folderId={$res.AlertFolder.id}>{$res.AlertFolder.Label}</a><br>{/if}
                  {$res.Label|truncate:40}</td>
                <td>{$res.Description}</td>
                <td align="left">{$res.AlertOnType}
                  {if $res.AlertOnType eq "Response Time"}<br>( {$res.AlertOn} ){/if}
                </td>
                <td align="center" nowrap="true">{$res.AlertOnComparator}</td>
                {if $res.AlertOnType eq "Response Time"}
                  <td align="center">{$res.AlertOnValue}</td>
                {elseif $res.AlertOnType eq "Response Code"}
                  <td align="center">{$wptResultStatusCodes[$res.AlertOn]}</td>
                {elseif $res.AlertOnType eq "Validation Code"}
                  <td align="center">{$wptValidationStateCodes[$res.AlertOn]}</td>
                {/if}
                <td align="right">{$res.AlertThreshold}</td>
                <td align="right">{$res.LastAlertTime|date_format:"%D %H:%M"}</td>
                <td align="right">
                  <table>
                    <tr>
                      <td>
                        {if hasPermission("Alert",$folderId, $smarty.const.PERMISSION_UPDATE)}
                        <form action="editAlert.php">
                          <input type="hidden" name="folderId" value="{$res.AlertFolderId}">
                          <input type="hidden" name="id" value="{$res.Id}">
                          <td style="padding:1px"><input class="actionIcon" type="image" src="img/edit_icon.png"
                                                         title="Edit" alt="Edit" value="Edit"></td>
                        </form>
                        {/if}
                        {if hasPermission("Alert",$folderId, $smarty.const.PERMISSION_CREATE_DELETE)}
                        <form action="deleteAlert.php" name="deleteAlert" onsubmit="return confirm('Confirm Deletion')">
                          <input type="hidden" name="id" value="{$res.Id}">
                          <td style="padding:1px"><input class="actionIcon" type="image" title="Delete"
                                                         src="img/delete_icon.png" value="Del"></td>
                        </form>
                        <form action="copyAlert.php" name="copyAlert" onsubmit="return confirm('Confirm Copy')">
                          <input type="hidden" name="folderId" value="{$folderId}">
                          <input type="hidden" name="id" value="{$res.Id}">
                          <td style="padding:1px">
                            <input class="actionIcon" type="image" src="img/copy_icon.png" title="Copy" value="Copy">
                            </td>
                        </form>
                        {/if}
                        {if hasPermission("Alert",$folderId, $smarty.const.PERMISSION_EXECUTE)}
                        <form action="testAlertEmail.php">
                          <input type="hidden" name="emailAddress" value="{$res.EmailAddresses}">
                          <input type="hidden" name="forward_to" value="listAlerts.php"/>
                          <td style="padding:1px">
                            <input class="actionIcon" type="image" src="img/execute_icon.png" title="Test Alert now."
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
              <td colspan="25">
                <table width="100%" border="0">
                  <tr>
                    <td>
                    {if hasPermission("Alert",$folderId, $smarty.const.PERMISSION_UPDATE)}
                      <input onclick="toggleAlertActive();" type="submit" value="Toggle Active">
                    {/if}
                    {if hasPermission("Alert",$folderId, $smarty.const.PERMISSION_OWNER)}
                      <p><form name="moveAlertsToFolderForm">
                        <input type="button" value="Move to folder" onclick="moveAlertsToFolder()">
                        <select name="folderId">
                          {html_select_tree tree=$folderTree}
                        </select>
                      </form>
                    {/if}
                    </td>
                    <td align="right">
                      {if hasPermission("Alert",$folderId, $smarty.const.PERMISSION_CREATE_DELETE)}
                      <form action="editAlert.php" method="GET">
                        <input type="hidden" name="folderId" value="{$folderId}">
                        <input type="submit" value="Add New Alert">
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
