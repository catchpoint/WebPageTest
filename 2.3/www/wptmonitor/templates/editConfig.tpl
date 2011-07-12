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
          <h2 class="cufon-dincond_black">Configuration</h2>
          <div class="translucent">
            <form method="post" class="cmxform" action="updateConfig.php" id="updateForm">
              <table width="100%">
                <tr>
                  <td align="right"><label for="siteName" title="The name of this site.">Site Name</label></td>
                  <td><input type="text" id="siteName" name="siteName" value="{$config.SiteName}" style="width:500px;" class="required">
                  </td>
                </tr>
                <tr>
                  <td align="right"><label for="siteContact" title="Name of the contact person for this site.">Site
                    Contact</label></td>
                  <td><input type="text" id="siteContact" name="siteContact" value="{$config.SiteContact}"
                             style="width:500px;" class="required"></td>
                </tr>
                <tr>
                  <td align="right"><label for="siteContactEmailAddress" title="The site contact's email address.">Site
                    Contact Email Address</label></td>
                  <td><input type="text" id="siteContactEmailAddress" name="siteContactEmailAddress"
                             value="{$config.SiteContactEmailAddress}" style="width:500px;" class="required"></td>
                </tr>
                <tr>
                  <td valign="top" align="right"><label for="siteHomePageMessage"
                                                        title="The message to display on the Home page.">Home Page
                    Message</label></td>
                  <td><textarea style="width:500px;" id="siteHomePageMessage"
                                name="siteHomePageMessage">{$config.SiteHomePageMessage}</textarea></td>
                </tr>
                <tr>
                  <td colspan="4">
                    <hr>
                  </td>
                </tr>
                <tr>
                  <td align="right"><label for="SiteAlertFromName"
                                           title="The from name that will appear on Alert emails.">Alert from
                    name</label></td>
                  <td><input type="text" id="SiteAlertFromName" name="siteAlertFromName"
                             value="{$config.SiteAlertFromName}" style="width:500px;" class="required"></td>
                </tr>
                <tr>
                  <td align="right"><label for="SiteAlertFromEmailAddress"
                                           title="The from email address that will appear on Alert emails.">Alert from
                    email address</label></td>
                  <td><input type="text" id="SiteAlertFromEmailAddress" name="siteAlertFromEmailAddress"
                             value="{$config.SiteAlertFromEmailAddress}" style="width:500px;" class="required"></td>
                </tr>
                <tr>
                  <td align="right"><label for="SiteAlertMessage"
                                           title="Optional message to include with the Alert email information.">Alert
                    email message</label></td>
                  <td><input type="text" id="SiteAlertMessage" name="siteAlertMessage"
                             value="{$config.SiteAlertMessage}" style="width:500px;"></td>
                </tr>
                <tr>
                  <td colspan="4">
                    <hr>
                  </td>
                </tr>
                <tr>
                  <td align="right"><label for="enableregistration" title="Allow new users to register.">Allow
                    Regisration</label></td>
                  <td><input type="checkbox" id="enableregistration" name="enableregistration" value="1"
                             {if $config.EnableRegistration}checked="true" {/if}/></td>
                </tr>
                <tr>
                  <td align="right"><label for="jobprocessorkey"
                                           title="The key that must be passed in when calling jobProcess.php.">Job
                    Processor Key</label></td>
                  <td><input type="text" id="jobprocessorkey" name="jobprocessorkey"
                             value="{$config.JobProcessorAuthenticationKey}" class="required"></td>
                </tr>
                <tr>
                  <td nowrap="true" align="right"><label for="defaultjobspermonth"
                                                         title="The default number of jobs allowed for users when they register. This can be changed by an admin.">Default
                    Jobs Per Month</label></td>
                  <td><input type="text" id="defaultjobspermonth" name="defaultjobspermonth"
                             value="{$config.DefaultJobsPerMonth}" class="required number"></td>
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
