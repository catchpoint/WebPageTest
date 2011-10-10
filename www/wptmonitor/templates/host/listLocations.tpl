<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  <title>WebPagetest Locations</title>
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
              <td><h2 class="cufon-dincond_black">WebPagetest Locations</h2></td>
            </tr>
          </table>
          <table class="pretty" width="100%">
            <tr>
              <th>Active</th>
              <th>Valid</th>
              <th align="left">Location</th>
              <th align="left">Host</th>
              <th align="left">Label</th>
              <th align="left">Browser</th>
              <th align="center">Active Agents</th>
              <th align="center">Queue Threshold</th>
              <th align="center">G</th>
              <th align="center">Y</th>
              <th align="center">R</th>
              <th colspan="2" align="center">Actions</th>
            </tr>
            {assign var="eo" value="odd"}
            {foreach from=$result item=res}
            {if $eo == "even"} {assign var="eo" value="odd"} {else} {assign var="eo" value= "even"}{/if}
              <tr class="{$eo}">
                <td align="center">{if $res.Active}Yes{else}No{/if}</td>
                <td align="center">{if $res.Valid}Yes{else}No{/if}</td>
                <td align="left">{$res.Location}</td>
                <td align="left">{$res.WPTHost.Label}</td>
                <td align="left">{$res.Label}</td>
                <td align="left">{$res.Browser}</td>
                <td align="center">{$res.ActiveAgents}</td>
                <td align="center">{$res.QueueThreshold}</td>
                <td align="center">{$res.QueueThresholdGreenLimit}</td>
                <td align="center">{$res.QueueThresholdYellowLimit}</td>
                <td align="center">{$res.QueueThresholdRedLimit}</td>
                  <form action="editLocation.php"><input type="hidden" name="id" value="{$res.Id}">
                    <td style="padding:1px"><input class="actionIcon" type="image" src="img/edit_icon.png" title="Edit"
                                                   alt="Edit" value="Edit"></td>
                  </form>
                  <form action="deleteLocation.php" name="deleteLocation" onsubmit="return confirm('Confirm Deletion')">
                    <input type="hidden" name="id" value="{$res.Id}">
                    <td style="padding:1px"><input class="actionIcon" type="image" title="Delete"
                                                   src="img/delete_icon.png" value="Del"></td>
                  </form>
              </tr>
            {/foreach}
          </table>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
