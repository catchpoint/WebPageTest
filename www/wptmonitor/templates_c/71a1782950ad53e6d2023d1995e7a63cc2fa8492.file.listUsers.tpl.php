<?php /* Smarty version Smarty-3.0.6, created on 2011-01-30 14:17:55
         compiled from "templates\user/listUsers.tpl" */ ?>
<?php /*%%SmartyHeaderCode:301354d45c77330c887-91917513%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    '71a1782950ad53e6d2023d1995e7a63cc2fa8492' => 
    array (
      0 => 'templates\\user/listUsers.tpl',
      1 => 1293736103,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '301354d45c77330c887-91917513',
  'function' => 
  array (
  ),
  'has_nocache_code' => false,
)); /*/%%SmartyHeaderCode%%*/?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  <?php $_template = new Smarty_Internal_Template("headIncludes.tpl", $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
  <title>Users</title>
  
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
              <th>Read Only</th>
              <th>Actions</th>
            </tr>
            <?php  $_smarty_tpl->tpl_vars['res'] = new Smarty_Variable;
 $_from = $_smarty_tpl->getVariable('result')->value; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array');}
if ($_smarty_tpl->_count($_from) > 0){
    foreach ($_from as $_smarty_tpl->tpl_vars['res']->key => $_smarty_tpl->tpl_vars['res']->value){
?>
            <?php if ($_smarty_tpl->getVariable('eo')->value=="even"){?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("odd", null, null);?> <?php }else{ ?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("even", null, null);?><?php }?>
              <tr class="<?php echo $_smarty_tpl->getVariable('eo')->value;?>
">
                <td align="center"><?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
</td>
                <td align="center"><?php if ($_smarty_tpl->tpl_vars['res']->value['IsActive']){?>Yes<?php }else{ ?>No<?php }?></td>
                <td align="left"><?php echo $_smarty_tpl->tpl_vars['res']->value['Username'];?>
</td>
                <td align="left"><?php echo $_smarty_tpl->tpl_vars['res']->value['FirstName'];?>
</td>
                <td align="left"><?php echo $_smarty_tpl->tpl_vars['res']->value['LastName'];?>
</td>
                <td align="left"><?php echo $_smarty_tpl->tpl_vars['res']->value['EmailAddress'];?>
</td>
                <td align="right"><?php echo $_smarty_tpl->tpl_vars['res']->value['MaxJobsPerMonth'];?>
</td>
                <td align="center"><?php if ($_smarty_tpl->tpl_vars['res']->value['IsSuperAdmin']){?>Yes<?php }else{ ?>No<?php }?></td>
                <td align="center"><?php if ($_smarty_tpl->tpl_vars['res']->value['Type']==1){?>Yes<?php }else{ ?>No<?php }?></td>
                  <td>
                    <table>
                      <tr>
                        <form action="editUser.php"><input type="hidden" name="user_id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                          <td style="padding:1px"><input class="actionIcon" type="image" src="img/edit_icon.png"
                                                         title="Edit" alt="Edit" value="Edit"></td>
                        </form>
                        <form action="deleteUser.php" name="deleteuser"
                              onsubmit="return confirm('Confirm Deletion: All user data will be erased!')"><input
                            type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                          <td style="padding:1px"><input class="actionIcon" type="image" title="Delete"
                                                         src="img/delete_icon.png" value="Del"></td>
                        </form>
                      </tr>
                    </table>
                  </td>
              </tr>
            <?php }} ?>
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
