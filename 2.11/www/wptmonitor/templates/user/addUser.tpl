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
          <h2 class="cufon-dincond_black">User</h2>
          <div class="translucent">
            <form method="post" class="cmxform" action="updateUser.php" id="updateForm">
              <input type="hidden" name="id" value="{$user.Id}">
              <table>
                <tr>
                  <td align="right"><label for="username">Username</label></td>
                  <td><input id="username" name="username" type="text" {if $user.Id}disabled="true"{/if}
                             value="{$user.Username}" class="required"></td>
                </tr>
                <tr>
                  <td align="right"><label for="firstname">First Name</label></td>
                  <td><input type="text" id="firstname" name="firstname" value="{$user.FirstName}" style="width:300px;" class="required">
                  </td>
                </tr>
                <tr>
                  <td align="right"><label for="lastname">Last Name</label></td>
                  <td><input type="text" id="lastname" name="lastname" value="{$user.LastName}" style="width:300px;" class="required">
                  </td>
                </tr>
                <tr>
                  <td align="right"><label for="emailaddress">Email Address</label></td>
                  <td><input type="text" id="emailaddress" name="emailaddress" value="{$user.EmailAddress}"
                             style="width:300px;" class="required email"></td>
                </tr>
                <tr>
                  <td align="right"><label for="password">Password</label></td>
                  <td><input autocomplete="off" type="password" id="password" name="password" style="width:200px;"> </td>
                </tr>
                <tr>
                  <td align="right"><label for="passwordRepeat">Password Confirm</label></td>
                  <td><input autocomplete="off" type="password" id="passwordRepeat" name="passwordRepeat"
                             style="width:200px;"></td>
                </tr>
                <tr>
                  <td align="right"><label for="timezone">Time Zone</label></td>
                  <td>{$tzselect}</td>
                    {*{html_select_timezone name="timezone" id="timezone" default=$user.TimeZone return="name"}</td>*}
                </tr>
                {if  $smarty.session.ls_admin}
                  <tr>
                    <td align="right"><label for="maxjobspermonth">Max Jobs Per Month</label></td>
                    <td><input type="text" id="maxjobspermonth" name="maxjobspermonth" value="{$user.MaxJobsPerMonth}" class="required">
                    </td>
                  </tr>
                  <tr>
                    <td align="right"><label for="isactive">Active</label></td>
                    <td><input type="checkbox" id="isactive" name="isactive" value="1"
                               {if $user.IsActive}checked="true" {/if}/></td>
                  </tr>
                  <tr>
                    <td align="right"><label for="issuperadmin">SuperAdmin</label></td>
                    <td><input type="checkbox" id="issuperadmin" name="issuperadmin" value="1"
                               {if $user.IsSuperAdmin}checked="true" {/if}/></td>
                  </tr>
                {/if}
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
