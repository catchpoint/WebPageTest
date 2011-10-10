<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  <title>Change Notes</title>
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
   function moveNotesToFolder() {
        var folderId = document.moveNotesToFolderForm.folderId[document.moveNotesToFolderForm.folderId.selectedIndex].value;
        var url = "addToFolder.php?folder=ChangeNote&forwardTo=listChangeNotes.php&folderId="+folderId;
        var notesSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            notesSelected = true;
            url += "&id[]=" + this.value;
          }
        });
        if (!notesSelected) {
          alert('Please select note(s) to move');
          return true;
        } else {
          document.location = url;
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
              <td><h2 class="cufon-dincond_black">Change Notes</h2>
               <form name="folderForm" action="">
                <a href="listFolders.php?folder=ChangeNote"><b>Folder:</b></a>
                  <select name="folderId" onchange="document.folderForm.submit();">
                    {html_select_tree permission=$smarty.const.PERMISSION_READ shares=$shares tree=$folderTree selected=$folderId}
                </select>
                </form>
              </td>
              <form name="showPublicForm" action="">
              <td nowrap="true" valign="bottom" align="right"><b>Show Public Notes:</b>
                  <select name="showPublic" onchange="document.showPublicForm.submit();">
                  <option value="false" {if $showPublic eq 'false'} selected {/if}>No</option>
                  <option value="true" {if $showPublic eq 'true'}selected {/if}>Yes</option>
                </select>
                </form></td>
            </tr>
          </table>
          <table class="pretty" width="100%">
            <tr>
              <th></th>
              <th align="left" style="vertical-align:bottom;">Date</th>
              <th style="vertical-align:bottom;">Public</th>
              <th align="left" style="vertical-align:bottom;">Owner</th>
              <th align="left" style="vertical-align:bottom;">
              {if $folderId eq -1}Folder<br>{/if}Label</th>
              <th align="left" style="vertical-align:bottom;">Description</th>
              <th colspan="3" align="center" style="vertical-align:bottom;">Actions</th>
            </tr>
            {assign var="eo" value="odd"}
            {foreach from=$result item=res}
            {if ($res.Public eq true and $showPublic eq 'true') or ($res.Public eq false)}
            {if $eo == "even"} {assign var="eo" value="odd"} {else} {assign var="eo" value= "even"}{/if}
              <tr class="{$eo}">
                <td align="center">
                  {if $userId eq $res.UserId}
                    <input type="checkbox" name="selectedNote" id="selectedNote" value="{$res.Id}">
                  {/if}
                </td>
                <td align="left">{$res.Date|date_format:"%D %H:%M"}</td>
                <td align="center">{if $res.Public}Yes{else}No{/if}</td>
                <td align="left">{$res.User.Username}</td>
                <td align="left">
                  {if $folderId eq -1}<a href=listChangeNotes.php?folderId={$res.ChangeNoteFolder.id}>{$res.ChangeNoteFolder.Label}</a><br>{/if}{$res.Label}</td>
                <td align="left">{$res.Description}</td>
                <td align="right">
                    <table>
                      <tr>
                        {if hasPermission("ChangeNote",$folderId, $smarty.const.PERMISSION_UPDATE)}
                        <form action="editChangeNote.php">
                          <input type="hidden" name="folderId" value="{$res.ChangeNoteFolderId}">
                          <input type="hidden" name="id" value="{$res.Id}">
                          <td style="padding:1px"><input class="actionIcon" type="image" src="img/edit_icon.png"
                                                         title="Edit" alt="Edit" value="Edit"></td>
                        </form>
                        {/if}
                        {if hasPermission("ChangeNote",$folderId, $smarty.const.PERMISSION_CREATE_DELETE)}
                        <form action="deleteChangeNote.php" name="deleteChangeNote"
                              onsubmit="return confirm('Confirm Deletion')"><input type="hidden" name="id"
                                                                                   value="{$res.Id}">
                          <td style="padding:1px"><input class="actionIcon" type="image" title="Delete"
                                                         src="img/delete_icon.png" value="Del"></td>
                        </form>
                        <form action="copyChangeNote.php" name="copyChangeNote" onsubmit="return confirm('Confirm Copy')">
                          <input type="hidden" name="folderId" value="{$folderId}">
                          <input type="hidden" name="id" value="{$res.Id}">
                          <td style="padding:1px">
                            <input class="actionIcon" type="image" src="img/copy_icon.png"title="Copy" value="Copy">
                          </td>
                        </form>
                        {/if}
                      </tr>
                    </table>
                </td>
              </tr>
            {/if}
            {/foreach}
            <tr>
              <td colspan="4">
                <table width="100%" border="0">
                  <tr>
                    <td nowrap="true">
                  {if hasPermission("ChangeNote",$folderId, $smarty.const.PERMISSION_OWNER)}
                      <form name="moveNotesToFolderForm">
                        <input type="button" value="Move notes to folder" onclick="moveNotesToFolder()">
                        <select name="folderId">
                          {html_select_tree tree=$folderTree}
                        </select>
                      </form>
                  {/if}
                    </td>
                  </tr>
                </table>
              </td>

              <td colspan="25">
                <table width="100%" border="0">
                  <tr>
                    <td></td>
                    <td align="right">
                    {if hasPermission("ChangeNote",$folderId, $smarty.const.PERMISSION_CREATE_DELETE)}
                      <form action="editChangeNote.php">
                        <input type="hidden" name="folderId" value="{$folderId}">
                        <input type="submit" value="Add New Change Note">
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
