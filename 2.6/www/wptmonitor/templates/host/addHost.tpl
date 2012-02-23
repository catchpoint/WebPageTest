<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
    "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  <title>WPT Host</title>
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
          <h2 class="cufon-dincond_black">WebPagetest Host</h2>
          <div class="translucent">
            <form method="post" class="cmxform" action="updateHost.php" id="updateForm">
              <input type="hidden" name="id" value="{$host.Id}">
              <table>
                <tr>
                  <td align="right"><label for="active">Active</label></td>
                  <td><input type="checkbox" id="active" name="active" value="1" {if $host.Active}checked="true" {/if}/>
                  </td>
                </tr>
                <tr>
                  <td align="right"><label for="label">Label</label></td>
                  <td><input type="text" size="80" name="label" id="label" value="{$host.Label}" class="required"></td>
                </tr>
                <tr>
                  <td align="right"><label for="description">Description</label></td>
                  <td><textarea id="description" name="description"
                                style="height:30px;width:600px">{$host.Description}</textarea></td>
                </tr>
                <tr>
                  <td align="right"><label for="hosturl">URL</label></td>
                  <td><input type="text" id="hosturl" name="hosturl" value="{$host.HostURL}" class="required url"
                             style="width:400px;"></td>
                </tr>
                <tr>
                  <td align="right"><label for="contact">Contact</label></td>
                  <td><input type="text" id="contact" name="contact" value="{$host.Contact}" style="width:400px;"></td>
                </tr>
                <tr>
                  <td align="right"><label for="contactemail">Contact Email</label></td>
                  <td><input type="text" id="contactemail" name="contactemail" value="{$host.ContactEmailAddress}"
                             class="required email" style="width:400px;"></td>
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
