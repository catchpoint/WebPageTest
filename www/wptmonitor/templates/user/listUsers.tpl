<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  <title>Users</title>
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
              <td><h2 class="cufon-dincond_black">Users</h2></td>
            </tr>
          </table>
          <table class="pretty" width="100%">
            <tr>
            <tr bgcolor="#AAAAAA">
              <th>Id</th>
              <th>Active</th>
              <th align="left">User name</th>
              <th align="left">First Name</th>
              <th align="left">Last Name</th>
              <th align="left">Email</th>
              <th align="right">Max Jobs</th>
              <th>Super Admin</th>
              <th>Actions</th>
            </tr>
            {assign var="eo" value="odd"}
            {foreach from=$result item=res}
            {if $eo == "even"} {assign var="eo" value="odd"} {else} {assign var="eo" value= "even"}{/if}
              <tr class="{$eo}">
                <td align="center">{$res.Id}</td>
                <td align="center">{if $res.IsActive}Yes{else}No{/if}</td>
                <td align="left">{$res.Username}</td>
                <td align="left">{$res.FirstName}</td>
                <td align="left">{$res.LastName}</td>
                <td align="left">{$res.EmailAddress}</td>
                <td align="right">{$res.MaxJobsPerMonth}</td>
                <td align="center">{if $res.IsSuperAdmin}Yes{else}No{/if}</td>
                  <td>
                    <table>
                      <tr>
                        <form action="editUser.php"><input type="hidden" name="user_id" value="{$res.Id}">
                          <td style="padding:1px"><input class="actionIcon" type="image" src="img/edit_icon.png"
                                                         title="Edit" alt="Edit" value="Edit"></td>
                        </form>
                        <form action="deleteUser.php" name="deleteuser"
                              onsubmit="return confirm('Confirm Deletion: All user data will be erased!')"><input
                            type="hidden" name="id" value="{$res.Id}">
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
                  <form action="editUser.php"><input type="submit" value="Add New User"></form>
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
