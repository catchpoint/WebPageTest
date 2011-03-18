<?php /* Smarty version Smarty-3.0.6, created on 2011-01-30 18:12:10
         compiled from "templates\host/listHosts.tpl" */ ?>
<?php /*%%SmartyHeaderCode:215744d45fe5a5bfe10-24937729%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    'ee75b2885f58c267e1a4d6b5ee70c2756571e34c' => 
    array (
      0 => 'templates\\host/listHosts.tpl',
      1 => 1293736103,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '215744d45fe5a5bfe10-24937729',
  'function' => 
  array (
  ),
  'has_nocache_code' => false,
)); /*/%%SmartyHeaderCode%%*/?>
<?php if (!is_callable('smarty_modifier_truncate')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\modifier.truncate.php';
?><!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  <?php $_template = new Smarty_Internal_Template("headIncludes.tpl", $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
  <title>WebPagetest Hosts</title>
  
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
            <?php  $_smarty_tpl->tpl_vars['res'] = new Smarty_Variable;
 $_from = $_smarty_tpl->getVariable('result')->value; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array');}
if ($_smarty_tpl->_count($_from) > 0){
    foreach ($_from as $_smarty_tpl->tpl_vars['res']->key => $_smarty_tpl->tpl_vars['res']->value){
?>
            <?php if ($_smarty_tpl->getVariable('eo')->value=="even"){?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("odd", null, null);?> <?php }else{ ?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("even", null, null);?><?php }?>
              <tr class="<?php echo $_smarty_tpl->getVariable('eo')->value;?>
">
                <td>
                  <form action="updateLocations.php">
                    <input type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                    <input type="hidden" name="forward_to" value="listLocations.php">
                    <input class="actionIcon" title="Refresh Location Information" class="actionIcon" type="image"
                           src="img/refresh_icon.png" width="18">
                  </form>
                </td>

                <td align="center"><?php if ($_smarty_tpl->tpl_vars['res']->value['Active']){?>Yes<?php }else{ ?>No<?php }?></td>
                <td align="left"><?php echo smarty_modifier_truncate($_smarty_tpl->tpl_vars['res']->value['HostURL'],60);?>
</td>
                <td align="left"><?php echo $_smarty_tpl->tpl_vars['res']->value['Label'];?>
</td>
                <td align="left"><?php echo smarty_modifier_truncate($_smarty_tpl->tpl_vars['res']->value['Description'],40);?>
</td>
                <td align="left"><?php echo $_smarty_tpl->tpl_vars['res']->value['Contact'];?>
</td>
                <td align="left"><?php echo $_smarty_tpl->tpl_vars['res']->value['ContactEmailAddress'];?>
</td>
                  <form action="editHost.php"><input type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                    <td style="padding:1px"><input class="actionIcon" class="actionIcon" type="image"
                                                   src="img/edit_icon.png" title="Edit" alt="Edit" value="Edit"></td>
                  </form>
                  <form action="deleteHost.php" name="deleteHost" onsubmit="return confirm('Confirm Deletion')"><input
                      type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                    <td style="padding:1px"><input class="actionIcon" class="actionIcon" type="image" title="Delete"
                                                   src="img/delete_icon.png" value="Del"></td>
                  </form>
              </tr>
            <?php }} ?>
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
