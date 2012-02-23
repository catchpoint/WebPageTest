<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  <title>{$folderName} Folders</title>
  {literal}
    <script type="text/javascript">
      <!--
      function confirmRemoval(text, itemCount) {
        if (itemCount > 0) {
          alert('Can not delete folders that contain jobs. Please move or delete the items first.');
          return false;
        } else {
          return confirm(text);
        }
      }
      function updateFolder(form) {
        newName = prompt('Folder Name', form.label.value);
        if (newName == null) {
          return false;
        }
        if (newName.trim() == "") {
          alert("Name can not be blank");
          return false;
        }
        form.label.value = newName;
        return true;
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
              <td colspan="2"><h2 class="cufon-dincond_black">{$folderName} Folders</h2>
                <form action="" name="folderForm">
                  <b>Table:</b> <select name="folder" onchange="document.folderForm.submit();">
                  <option {if $folderName eq 'Job'}selected{/if}>Job</option>
                  <option {if $folderName eq 'Script'}selected{/if}>Script</option>
                  <option {if $folderName eq 'Alert'}selected{/if}>Alert</option>
                  <option {if $folderName eq 'ChangeNote'}selected{/if}>ChangeNote</option>
                </select>
                </form>
              </td>
            </tr>
            <tr>
              <td>
                <table class="pretty" width=100%>
                  <tr bgcolor="#AAAAAA">
                    <th align="left">Folder Name</th>
                    <th align="right">Items</th>
                    <th align="right">Shares</th>
                    <th align="center">Actions</th>
                  </tr>
                  {assign var="eo" value="odd"}
                  {foreach from=$folderTree item=res}
                  {if $eo == "even"} {assign var="eo" value="odd"} {else} {assign var="eo" value= "even"}{/if}
                    <tr class="{$eo}">
                      <td nowrap="true" valign="top">
                        {assign var="lev" value="0"}
                        {if $res.level > 0}
                        {for $lev=1 to $res.level} &nbsp;&nbsp;&nbsp; {/for}
                          |_
                        {/if}
                        <a href="{$jumpUrl}?folderId={$res.id}">{$res.Label}</a></td>
                      <td align="right">{$res[$itemTableName]|@sizeOf}
                      </td>
                      <td align="right">{$shareCount[$res.id]}</td>
                      <td align="right">
                        <table border=0>
                          <tr>
                            {if $lev gt 0}
                              <td style="padding:1px">
                                <form action="addFolder.php" onsubmit="return updateFolder(this);">
                                  <input type="hidden" name="editId" value="{$res.id}">
                                  <input type="hidden" name="label" value="{$res.Label}">
                                  <input type="hidden" name="folder" value="{$folderName}">
                                  <input class="actionIcon" type="image" src="img/edit_icon.png" title="Edit" alt="Edit"
                                         value="Edit">
                                </form>
                              </td>
                            <td style="padding:1px">

                              <form action="listFolders.php"
                                    onsubmit="return confirmRemoval('Confirm Deletion',{$res[$itemTableName]|@sizeOf});">
                                <input type="hidden" name="folderId" value="{$res.id}">
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="folder" value="{$folderName}">
                                <input class="actionIcon" type="image" title="Delete"
                                       src="img/delete_icon.png" value="Del">
                              </form>
                              {/if}
                          </td>
                            <td style="padding:1px">
                              <form action="listShares.php" name="listShareWith">
                                <input type="hidden" name="folderId" value="{$res.id}">
                                <input type="hidden" name="tableName" value="{$itemTableName}">
                                <input class="actionIcon" type="image" src="img/Share.png" title="Shares">
                              </form>
                            </td>

                            <td style="padding:1px">
                              <form action="addFolder.php" name="addFolder" onsubmit="return updateFolder(this);">
                                <input type="hidden" name="id" value="{$res.id}">
                                <input type="hidden" name="label">
                                <input type="hidden" name="folder" value="{$folderName}">
                                <input class="actionIcon" type="image" src="img/add_icon.png" title="Add">
                              </form>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  {/foreach}
                  <tr>
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
