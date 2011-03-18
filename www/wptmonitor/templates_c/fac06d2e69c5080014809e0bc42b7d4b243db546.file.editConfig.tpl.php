<?php /* Smarty version Smarty-3.0.6, created on 2011-01-30 18:12:07
         compiled from "templates\editConfig.tpl" */ ?>
<?php /*%%SmartyHeaderCode:102734d45fe57ed8ba5-22487419%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    'fac06d2e69c5080014809e0bc42b7d4b243db546' => 
    array (
      0 => 'templates\\editConfig.tpl',
      1 => 1289747452,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '102734d45fe57ed8ba5-22487419',
  'function' => 
  array (
  ),
  'has_nocache_code' => false,
)); /*/%%SmartyHeaderCode%%*/?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
    "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  <?php $_template = new Smarty_Internal_Template("headIncludes.tpl", $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
  <title>User</title>
  
    <script>
      $(document).ready(function() {
        $("#updateForm").validate();
      });
    </script>
  
</head>
<body>
<div class="page">
  <?php $_template = new Smarty_Internal_Template('header.tpl', $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
  <?php $_template = new Smarty_Internal_Template('navbar.tpl', $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
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
                  <td><input type="text" id="siteName" name="siteName" value="<?php echo $_smarty_tpl->getVariable('config')->value['SiteName'];?>
" style="width:500px;" class="required">
                  </td>
                </tr>
                <tr>
                  <td align="right"><label for="siteContact" title="Name of the contact person for this site.">Site
                    Contact</label></td>
                  <td><input type="text" id="siteContact" name="siteContact" value="<?php echo $_smarty_tpl->getVariable('config')->value['SiteContact'];?>
"
                             style="width:500px;" class="required"></td>
                </tr>
                <tr>
                  <td align="right"><label for="siteContactEmailAddress" title="The site contact's email address.">Site
                    Contact Email Address</label></td>
                  <td><input type="text" id="siteContactEmailAddress" name="siteContactEmailAddress"
                             value="<?php echo $_smarty_tpl->getVariable('config')->value['SiteContactEmailAddress'];?>
" style="width:500px;" class="required"></td>
                </tr>
                <tr>
                  <td valign="top" align="right"><label for="siteHomePageMessage"
                                                        title="The message to display on the Home page.">Home Page
                    Message</label></td>
                  <td><textarea style="width:500px;" id="siteHomePageMessage"
                                name="siteHomePageMessage"><?php echo $_smarty_tpl->getVariable('config')->value['SiteHomePageMessage'];?>
</textarea></td>
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
                             value="<?php echo $_smarty_tpl->getVariable('config')->value['SiteAlertFromName'];?>
" style="width:500px;" class="required"></td>
                </tr>
                <tr>
                  <td align="right"><label for="SiteAlertFromEmailAddress"
                                           title="The from email address that will appear on Alert emails.">Alert from
                    email address</label></td>
                  <td><input type="text" id="SiteAlertFromEmailAddress" name="siteAlertFromEmailAddress"
                             value="<?php echo $_smarty_tpl->getVariable('config')->value['SiteAlertFromEmailAddress'];?>
" style="width:500px;" class="required"></td>
                </tr>
                <tr>
                  <td align="right"><label for="SiteAlertMessage"
                                           title="Optional message to include with the Alert email information.">Alert
                    email message</label></td>
                  <td><input type="text" id="SiteAlertMessage" name="siteAlertMessage"
                             value="<?php echo $_smarty_tpl->getVariable('config')->value['SiteAlertMessage'];?>
" style="width:500px;"></td>
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
                             <?php if ($_smarty_tpl->getVariable('config')->value['EnableRegistration']){?>checked="true" <?php }?>/></td>
                </tr>
                <tr>
                  <td align="right"><label for="jobprocessorkey"
                                           title="The key that must be passed in when calling jobProcess.php.">Job
                    Processor Key</label></td>
                  <td><input type="text" id="jobprocessorkey" name="jobprocessorkey"
                             value="<?php echo $_smarty_tpl->getVariable('config')->value['JobProcessorAuthenticationKey'];?>
" class="required"></td>
                </tr>
                <tr>
                  <td nowrap="true" align="right"><label for="defaultjobspermonth"
                                                         title="The default number of jobs allowed for users when they register. This can be changed by an admin.">Default
                    Jobs Per Month</label></td>
                  <td><input type="text" id="defaultjobspermonth" name="defaultjobspermonth"
                             value="<?php echo $_smarty_tpl->getVariable('config')->value['DefaultJobsPerMonth'];?>
" class="required number"></td>
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
