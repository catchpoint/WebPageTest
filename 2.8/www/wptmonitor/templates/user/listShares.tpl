<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  <title>Shares</title>
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
              <td><h2 class="cufon-dincond_black">Folder Shares</h2><h4>
                <table>
                  <tr>
                    <td>
                  <form name="tableSelectForm">
                  {*<input type="hidden" name="folderName" value="{$folderName}">*}
                Table:</td><td><select name="tableName" onchange="document.tableSelectForm.submit()">
                  <option {if $tableNameLabel eq "Job"}selected="true" {/if} value="WPTJob">Job</option>
                  <option {if $tableNameLabel eq "Script"}selected="true" {/if} value="WPTScript">Script</option>
                  <option {if $tableNameLabel eq "Alert"}selected="true" {/if} value="Alert">Alert</option>
                  <option {if $tableNameLabel eq "ChangeNote"}selected="true" {/if} value="ChangeNote">Note</option>
                </select>
                </form></td>
                  <td>
                <form name="folderForm" action="">
                  <input type="hidden" name="tableName" value="{$tableName}">
                <a href="listFolders.php?folder=Job"><b>Folder:</b></a> <select name="folderId" onchange="document.folderForm.submit();">
                  {html_select_tree tree=$folderTree selected=$folderId}
                </select>
                </form></td></tr></table>
              </h4></td>
            </tr>
          </table>
          <table class="pretty" width="100%">
            <tr>
            <tr bgcolor="#AAAAAA">
              <th>Active</th>
              <th align="left">User name</th>
              <th align="left">First Name</th>
              <th align="left">Last Name</th>
              <th>Permission</th>
              {*<th>Start Sharing</th>*}
              {*<th>Stop Sharing</th>*}
              <th>Actions</th>
            </tr>
            {assign var="eo" value="odd"}
            {foreach from=$result item=res}
            {if $eo == "even"} {assign var="eo" value="odd"} {else} {assign var="eo" value= "even"}{/if}
              <tr class="{$eo}">
                <td align="center">{if $res.Active}Yes{else}No{/if}</td>
                <td align="left">{$res.ShareWithUser.Username}</td>
                <td align="left">{$res.ShareWithUser.FirstName}</td>
                <td align="left">{$res.ShareWithUser.LastName}</td>
                <td align="center">
                  {if $res.Permissions eq 0}Read{/if}
                  {if $res.Permissions eq 1}Update{/if}
                  {if $res.Permissions eq 2}Create/Delete{/if}
                  {if $res.Permissions eq 4}Execute{/if}
                  </td>
                {*<td align="right">{$res.StartSharing}</td>*}
                {*<td align="right">{$res.StopSharing}</td>*}

                  <td align="right">
                    <table>
                      <tr>
                        <form action="editShare.php"><input type="hidden" name="id" value="{$res.Id}">
                          <td style="padding:1px"><input class="actionIcon" type="image" src="img/edit_icon.png"
                                                         title="Edit" alt="Edit" value="Edit"></td>
                        </form>
                        <form action="deleteShare.php" name="deleteshare"
                              onsubmit="return confirm('Confirm Deletion')"><input
                            type="hidden" name="id" value="{$res.Id}">
                          <input type="hidden" name="tableName" value="{$tableName}">
                          <input type="hidden" name="folderId" value="{$folderId}">

                          <td style="padding:1px"><input class="actionIcon" type="image" title="Delete"
                                                         src="img/delete_icon.png" value="Del"></td>
                        </form>
                      </tr>
                    </table>
                  </td>
              </tr>
            {/foreach}
              <tr>
                <td colspan="15" align="right" style="padding:.5em;">
                  <form action="editShare.php">
                    <input type="hidden" name="tableName" value="{$tableName}">
                    <input type="hidden" name="folderId" value="{$folderId}">
                    <input type="submit" value="Add New Share"></form>
                </td>
              </tr>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>
