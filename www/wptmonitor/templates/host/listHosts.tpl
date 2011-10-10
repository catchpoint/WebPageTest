<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  <title>WebPagetest Hosts</title>
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
              <td><h2 class="cufon-dincond_black">WebPagetest Hosts</h2></td>
            </tr>
          </table>

          <table class="pretty" width="100%">
            <tr>
              <th></th>
              <th>Active</th>
              <th align="left">URL</th>
              <th align="left">Label</th>
              <th align="left">Description</th>
              <th align="left">Contact</th>
              <th align="left">Contact Email</th>
              <th colspan="2" align="center">Actions</th>
            </tr>
            {assign var="eo" value="odd"}
            {foreach from=$result item=res}
            {if $eo == "even"} {assign var="eo" value="odd"} {else} {assign var="eo" value= "even"}{/if}
              <tr class="{$eo}">
                <td>
                  <form action="updateLocations.php">
                    <input type="hidden" name="id" value="{$res.Id}">
                    <input type="hidden" name="forward_to" value="listLocations.php">
                    <input class="actionIcon" title="Refresh Location Information" class="actionIcon" type="image"
                           src="img/refresh_icon.png" width="18">
                  </form>
                </td>

                <td align="center">{if $res.Active}Yes{else}No{/if}</td>
                <td align="left">{$res.HostURL|truncate:60}</td>
                <td align="left">{$res.Label}</td>
                <td align="left">{$res.Description|truncate:40}</td>
                <td align="left">{$res.Contact}</td>
                <td align="left">{$res.ContactEmailAddress}</td>
                  <form action="editHost.php"><input type="hidden" name="id" value="{$res.Id}">
                    <td style="padding:1px"><input class="actionIcon" class="actionIcon" type="image"
                                                   src="img/edit_icon.png" title="Edit" alt="Edit" value="Edit"></td>
                  </form>
                  <form action="deleteHost.php" name="deleteHost" onsubmit="return confirm('Confirm Deletion')"><input
                      type="hidden" name="id" value="{$res.Id}">
                    <td style="padding:1px"><input class="actionIcon" class="actionIcon" type="image" title="Delete"
                                                   src="img/delete_icon.png" value="Del"></td>
                  </form>
              </tr>
            {/foreach}
            <tr>
              <td colspan="15" align="right" style="padding:.5em;">
                <form action="editHost.php"><input type="submit" value="Add New Host"></form>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
