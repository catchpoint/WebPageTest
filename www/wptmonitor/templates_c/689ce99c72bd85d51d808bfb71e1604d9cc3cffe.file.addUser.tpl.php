<?php /* Smarty version Smarty-3.0.6, created on 2011-01-30 14:17:59
         compiled from "templates\user/addUser.tpl" */ ?>
<?php /*%%SmartyHeaderCode:43884d45c77741df72-38185948%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    '689ce99c72bd85d51d808bfb71e1604d9cc3cffe' => 
    array (
      0 => 'templates\\user/addUser.tpl',
      1 => 1293736103,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '43884d45c77741df72-38185948',
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
          <h2 class="cufon-dincond_black">User</h2>
          <div class="translucent">
            <form method="post" class="cmxform"
                  <?php if ($_smarty_tpl->getVariable('user')->value['Type']!=1||$_SESSION['ls_admin']){?>action="updateUser.php"<?php }?> id="updateForm">
              <input type="hidden" name="id" value="<?php echo $_smarty_tpl->getVariable('user')->value['Id'];?>
">
              <table>
                <tr>
                  <td align="right"><label for="username">Username</label></td>
                  <td><input id="username" name="username" type="text" <?php if ($_smarty_tpl->getVariable('user')->value['Id']){?>disabled="true"<?php }?>
                             value="<?php echo $_smarty_tpl->getVariable('user')->value['Username'];?>
" class="required"></td>
                </tr>
                <tr>
                  <td align="right"><label for="firstname">First Name</label></td>
                  <td><input type="text" id="firstname" name="firstname" value="<?php echo $_smarty_tpl->getVariable('user')->value['FirstName'];?>
" style="width:300px;" class="required">
                  </td>
                </tr>
                <tr>
                  <td align="right"><label for="lastname">Last Name</label></td>
                  <td><input type="text" id="lastname" name="lastname" value="<?php echo $_smarty_tpl->getVariable('user')->value['LastName'];?>
" style="width:300px;" class="required">
                  </td>
                </tr>
                <tr>
                  <td align="right"><label for="emailaddress">Email Address</label></td>
                  <td><input type="text" id="emailaddress" name="emailaddress" value="<?php echo $_smarty_tpl->getVariable('user')->value['EmailAddress'];?>
"
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
                  <td><?php echo $_smarty_tpl->getVariable('tzselect')->value;?>
</td>
                </tr>
                <?php if ($_SESSION['ls_admin']){?>
                  <tr>
                    <td align="right"><label for="maxjobspermonth">Max Jobs Per Month</label></td>
                    <td><input type="text" id="maxjobspermonth" name="maxjobspermonth" value="<?php echo $_smarty_tpl->getVariable('user')->value['MaxJobsPerMonth'];?>
" class="required">
                    </td>
                  </tr>
                  <tr>
                    <td align="right"><label for="isactive">Active</label></td>
                    <td><input type="checkbox" id="isactive" name="isactive" value="1"
                               <?php if ($_smarty_tpl->getVariable('user')->value['IsActive']){?>checked="true" <?php }?>/></td>
                  </tr>
                  <tr>
                    <td align="right"><label for="issuperadmin">SuperAdmin</label></td>
                    <td><input type="checkbox" id="issuperadmin" name="issuperadmin" value="1"
                               <?php if ($_smarty_tpl->getVariable('user')->value['IsSuperAdmin']){?>checked="true" <?php }?>/></td>
                  </tr>
                <?php }?>
                <?php if ($_smarty_tpl->getVariable('user')->value['Type']!=1||$_SESSION['ls_admin']){?>
                  <tr>
                    <td></td>
                    <td><input type="submit" value="Save"></td>
                  </tr>
                <?php }?>
              </table>
            </form>
          </div>
        </div>
      </div>
    </div>
</body>
</html>
