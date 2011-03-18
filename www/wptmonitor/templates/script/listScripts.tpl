<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  <title>Scripts</title>
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
      function moveScriptsToFolder() {
        var folderId = document.moveScriptsToFolderForm.folderId[document.moveScriptsToFolderForm.folderId.selectedIndex].value;
        var url = "addToFolder.php?folder=Script&forwardTo=listScripts.php&folderId="+folderId;
        var scriptsSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            scriptsSelected = true;
            url += "&id[]=" + this.value;
          }
        });
        if (!scriptsSelected) {
          alert('Please select script(s) to move');
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
  {include file='header.tpl'}{include file='navbar.tpl'}
  <div id="main">
    <div class="level_2">
      <div class="content-wrap">
        <div class="content">
          <table style="border-collapse:collapse" width="100%">
            <tr>
              <td><h2 class="cufon-dincond_black">Scripts</h2>
                <form name="folderForm" action="">
                <a href="listFolders.php?folder=Script"><b>Folder:</b></a> <select name="folderId" onchange="document.folderForm.submit();">
                  {html_select_tree permission=$smarty.const.PERMISSION_READ shares=$shares tree=$folderTree selected=$folderId}
                </select>
                </form>
              </td>
              <td align="right" valign="top">
                <form action="">
                  <input type="hidden" name="scriptsCurrentPage" value="{$scriptsCurrentPage}">
                  Filter: <select name="scriptsFilterField">
                  <option></option>
                  <option {if $scriptsFilterField eq 'Label'} selected="true"{/if}>Label</option>
                  <option {if $scriptsFilterField eq 'URL'} selected="true"{/if}>URL</option>
                  <option {if $scriptsFilterField eq 'Description'} selected="true"{/if}>Description</option>
                </select>
                  <input type="text" name="scriptsFilterValue" value="{$scriptsFilterValue}">
                  <input type="submit" value="Filter">
                </form>
              </td>
              <td valign="top">
                <form action=""><input type="hidden" name="clearScriptsFilter" value="true"><input type="submit"
                                                                                                   value="Clear"></form>
              </td>
              <td align="right" valign="top">{include file='pager.tpl'}<br>
              </td>
            </tr>
          </table>

          <table class="pretty" width="100%">
            <tr bgcolor="#AAAAAA">
              <td></td>
              <td colspan="2">
                {if $folderId eq -1}Folder<br>{/if}
                <a href="?orderBy=Label">{if $orderScriptsBy eq "Label"}<strong>{/if}Label</strong></a>
              </td>
              <td><a href="?orderBy=URL">{if $orderScriptsBy eq "URL"}<strong>{/if}URL</strong></a></td>
              <td colspan="1">Description</td>
              <td colspan="1" align="center"><a href="?orderBy=MultiStep">{if $orderScriptsBy eq "MultiStep"}
              <strong>{/if}MultiStep</strong></a></td>
              <td align="center"><a href="?orderBy=Validate">{if $orderScriptsBy eq "Validate"}<strong>{/if}
                Validate</strong></a></td>
              <td colspan="5" align="center">Actions</td>
            </tr>
            {foreach from=$result item=res}
            {if $eo == "even"} {assign var="eo" value="odd"} {else} {assign var="eo" value= "even"}{/if}
              <tr class="{$eo}">
                <td align="center"><input type="checkbox" name="selectedScript" id="selectedScript" value="{$res.Id}"></td>
                <td colspan="2" nowrap="true">
                  {if $folderId eq -1}<a href=listScripts.php?folderId={$res.WPTScriptFolder.id}>{$res.WPTScriptFolder.Label}</a><br>{/if}
                  {$res.Label}</td>
                <td>{$res.URL|truncate:60}</td>
                <td valign="top">{$res.Description|truncate:40}</td>
                <td align="center">{if $res.MultiStep}Yes{else}No{/if}</td>
                <td align="center">{if $res.Validate}Yes{else}No{/if}</td>
                <td align="right">
                  <table>
                    <tr>
                      {if hasPermission("WPTScript",$folderId, $smarty.const.PERMISSION_UPDATE)}
                      <form action="editScript.php">
                        <input type="hidden" name="id" value="{$res.Id}">
                        <input type="hidden" name="folderId" value="{$res.WPTScriptFolderId}">
                        <td style="padding:1px">
                          <input class="actionIcon" type="image" src="img/edit_icon.png" title="Edit" alt="Edit" value="Edit">
                        </td>
                      </form>
                      {/if}
                      {if hasPermission("WPTScript",$folderId, $smarty.const.PERMISSION_CREATE_DELETE)}
                      <form action="deleteScript.php" name="deleteScript" onsubmit="return confirm('Confirm Deletion')">
                        <input type="hidden" name="id" value="{$res.Id}">
                        <input type="hidden" name="folderId" value="{$res.WPTScriptFolderId}">

                        <td style="padding:1px"><input class="actionIcon" type="image" title="Delete"
                                                       src="img/delete_icon.png" value="Del"></td>
                      </form>
                      {/if}
                      {if hasPermission("WPTScript",$folderId, $smarty.const.PERMISSION_CREATE_DELETE)}
                      <form action="copyScript.php" name="copyScript" onsubmit="return confirm('Confirm Copy')"><input
                          type="hidden" name="id" value="{$res.Id}">
                        <td style="padding:1px"><input class="actionIcon" type="image" src="img/copy_icon.png"
                                                       title="Copy" value="Copy"></td>
                      </form>
                      {/if}
                    </tr>
                  </table>
                </td>
              </tr>
            {/foreach}
            <tr>
              <td colspan="7" valign="top">
                <table width="100%" border="0">
                  <tr>
                    <td align="left" nowrap="true">
                      {if hasPermission("WPTScript",$folderId, $smarty.const.PERMISSION_OWNER)}
                      <form name="moveScriptsToFolderForm">
                        <input type="button" value="Move to folder" onclick="moveScriptsToFolder()">
                        <select name="folderId">
                          {html_select_tree tree=$folderTree}
                        </select>
                      </form>
                      {/if}
                    </td>
                  </tr>
                </table>
              </td>
              <td colspan="" align="right" style="padding:.5em;">
                {if hasPermission("WPTScript",$folderId, $smarty.const.PERMISSION_CREATE_DELETE)}
                <form action="editScript.php">
                  <input type="hidden" name="folderId" value="{$folderId}"> 
                  <input type="submit" value="Add New Script">
                </form>
                {/if}
              </td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
