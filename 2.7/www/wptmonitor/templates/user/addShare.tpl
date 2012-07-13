<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
    "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  <title>User</title>
  {literal}
    <script>
      $(document).ready(function() {
        $("#updateForm").validate();
      });
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
          <br>
          <h2 class="cufon-dincond_black">Share</h2>
          <div class="translucent">
            <form method="get" class="cmxform" action="updateShare.php" id="updateForm">
              <input type="hidden" name="id" value="{$share.Id}">
              <input type="hidden" name="userId" value="{$share.UserId}">
              <input type="hidden" name="tableName" value="{$share.TheTableName}">
              <input type="hidden" name="tableItemId" value="{$share.TableItemId}">
              <table>
                <tr>
                  <td align="right"><label for="active">Active</label></td>
                  <td><input type="checkbox" id="active" name="active" value="1"
                             {if $share.Active}checked="true" {/if}/></td>
                </tr>
                <tr>
                  <td align="right">
                    <label>Table</label>
                  </td>
                  <td>
                    <input type="text" disabled="true" value="{$share.TheTableName}">
                  </td>
                </tr>
                <tr>
                  <td align="right">
                    <label>Folder</label>
                  </td>
                  <td>
                     <input type="text" disabled="true" value="{$folderName}">
                  </td>
                </tr>
                <tr>
                  <td align="right"><label for="username">Share With</label></td>
                  <td><select name="shareWithUserId" id="username">
                    {html_options options=$userName selected=$share.ShareWithUser.Id}
                    </select> 
                </td>

                <tr>
                  <td align="right"><label for="permission">Permission</label></td>
                  <td>
                    <select name="permissions" id="permission">
                      <option value="0" {if $share.Permissions eq 0}selected{/if}>Read</option>
                      <option value="1" {if $share.Permissions eq 1}selected{/if}>Update</option>
                      <option value="2" {if $share.Permissions eq 2}selected{/if}>Create/Delete</option>
                      <option value="4" {if $share.Permissions eq 4}selected{/if}>Execute</option>
                    </select>
                </td>
                  <tr>
                    <td></td>
                    <td><input type="submit" value="Save"></td>
                  </tr>
              </table>
            </form>
          </div>
        </div>
      </div>
    </div>
</body>
</html>
