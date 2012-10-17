<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
    "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  <title>Change Note</title>
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
          <h2 class="cufon-dincond_black">Change Note</h2>
          <div class="translucent">
          {* If result.Id has a value then we are editing, otherwise we are adding/creating*}
            {if $result.Id > -1}
              {assign var="requiredPermission" value=$smarty.const.PERMISSION_UPDATE}
            {else}
              {assign var="requiredPermission" value=$smarty.const.PERMISSION_CREATE_DELETE}
            {/if}
            <form method="get" class="cmxform" action="updateChangeNote.php" id="updateForm">
              <input type="hidden" name="id" value="{$result.Id}">
              <table>
              <tr>
                <td align="right"><label>Folder</label></td>
                <td>
                <select name="folderId">
                    {html_select_tree permission=$requiredPermission shares=$shares tree=$folderTree selected=$folderId}
                </select>
                </td>
              </tr>
                <tr>
                  <td align="right"><label for="public">Public</label></td>
                  <td><input type="checkbox" id="public" name="public" value="1"
                             {if $result.Public}checked="true" {/if}/></td>
                </tr>
                <tr>
                  <td align="right"><label>Date</label></td>
                  <td>{html_select_date start_year='2010' prefix='start' time=$result.Date}</td>
                </tr>
                <tr>
                  <td align="right"><label>Time</label></td>
                  <td>{html_select_time prefix='start' time=$result.Date display_seconds=false}</td>
                </tr>
                <tr>
                  <td align="right"><label for="label">Label</label></td>
                  <td><input type="text" size="80" name="label" id="label" value="{$result.Label}" class="required">
                  </td>
                </tr>
                <tr>
                  <td align="right"><label>Release Info</label></td>
                  <td><input type="text"name="releaseInfo" value="{$result.ReleaseInfo}" size="80">
                  </td>
                </tr>
                <tr>
                  <td align="right"><label>Description</label></td>
                  <td><textarea name="description"
                                style="height:30px;width:700px">{$result.Description}</textarea></td>
                </tr>
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
 