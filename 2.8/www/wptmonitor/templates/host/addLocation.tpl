<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
    "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  <title>WPT Location</title>
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
          <h2 class="cufon-dincond_black">WebPagetest Location</h2>
          <div class="translucent">
            <form method="post" class="cmxform" action="updateLocation.php" id="updateForm">
              <input type="hidden" name="id" value="{$location.Id}">
              <table>
                <tr>
                  <td align="right"><label for="active">Active</label></td>
                  <td><input type="checkbox" id="active" name="active" value="1"
                             {if $location.Active}checked="true" {/if}/></td>
                </tr>
                <tr>
                  <td align="right"><label for="valid">Valid</label></td>
                  <td><input disabled="true" type="checkbox" id="valid" name="valid" value="1"
                             {if $location.Valid}checked="true" {/if}/></td>
                </tr>
                <tr>
                  <td align="right"><label>Host</label></td>
                  <td><select name="host" disabled="true">
                    {html_options options=$hosts selected=$location.WPTHostId}
                  </select>
                </tr>
                <tr>
                  <td align="right"><label for="location">Location</label></td>
                  <td><input disabled="true" type="text" size="80" name="location" id="location"
                             value="{$location.Location}" class="required"></td>
                </tr>
                <tr>
                  <td align="right"><label for="label">Label</label></td>
                  <td><input disabled="true" type="text" size="80" name="label" id="label" value="{$location.Label}"
                             class="required"></td>
                </tr>
                <tr>
                  <td align="right"><label for="browser">Browser</label></td>
                  <td><input type="text" disabled="true" id="browser" name="browser" value="{$location.Browser}"></td>
                </tr>
                <tr>
                  <td align="right"><label for="activeagents">Active Agents</label></td>
                  <td><input type="text" id="activeagents" name="activeagents" value="{$location.ActiveAgents}"
                             class="required number" style="width:70px;"></td>
                </tr>
                <tr>
                  <td align="right"><label for="queuethreshold">Queue Threshold</label></td>
                  <td><input type="text" id="queuethreshold" name="queuethreshold" value="{$location.QueueThreshold}"
                             class="required number" style="width:70px;"></td>
                </tr>
                <tr>
                  <td align="right"><label for="queuethresholdgreenlimit">Queue Green Limit</label></td>
                  <td><input type="text" id="queuethresholdgreenlimit" name="queuethresholdgreenlimit"
                             value="{$location.QueueThresholdGreenLimit}" class="required number" style="width:70px;">
                  </td>
                </tr>
                <tr>
                  <td align="right"><label for="queuethresholdyellowlimit">Queue yellow Limit</label></td>
                  <td><input type="text" id="queuethresholdyellowlimit" name="queuethresholdyellowlimit"
                             value="{$location.QueueThresholdYellowLimit}" class="required number" style="width:70px;">
                  </td>
                </tr>
                <tr>
                  <td align="right"><label for="queuethresholdredlimit">Queue red Limit</label></td>
                  <td><input type="text" id="queuethresholdredlimit" name="queuethresholdredlimit"
                             value="{$location.QueueThresholdRedLimit}" class="required number" style="width:70px;">
                  </td>
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
 