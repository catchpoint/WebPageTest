<?php /* Smarty version Smarty-3.0.6, created on 2011-01-30 18:12:15
         compiled from "templates\host/listLocations.tpl" */ ?>
<?php /*%%SmartyHeaderCode:261194d45fe5fdb0564-98831832%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    '8e9fee84f5e7f888c449286a21ecae32d886b27b' => 
    array (
      0 => 'templates\\host/listLocations.tpl',
      1 => 1293736103,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '261194d45fe5fdb0564-98831832',
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
  <title>WebPagetest Locations</title>
  
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
            <?php  $_smarty_tpl->tpl_vars['res'] = new Smarty_Variable;
 $_from = $_smarty_tpl->getVariable('result')->value; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array');}
if ($_smarty_tpl->_count($_from) > 0){
    foreach ($_from as $_smarty_tpl->tpl_vars['res']->key => $_smarty_tpl->tpl_vars['res']->value){
?>
            <?php if ($_smarty_tpl->getVariable('eo')->value=="even"){?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("odd", null, null);?> <?php }else{ ?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("even", null, null);?><?php }?>
              <tr class="<?php echo $_smarty_tpl->getVariable('eo')->value;?>
">
                <td align="center"><?php if ($_smarty_tpl->tpl_vars['res']->value['Active']){?>Yes<?php }else{ ?>No<?php }?></td>
                <td align="center"><?php if ($_smarty_tpl->tpl_vars['res']->value['Valid']){?>Yes<?php }else{ ?>No<?php }?></td>
                <td align="left"><?php echo $_smarty_tpl->tpl_vars['res']->value['Location'];?>
</td>
                <td align="left"><?php echo $_smarty_tpl->tpl_vars['res']->value['WPTHost']['Label'];?>
</td>
                <td align="left"><?php echo $_smarty_tpl->tpl_vars['res']->value['Label'];?>
</td>
                <td align="left"><?php echo $_smarty_tpl->tpl_vars['res']->value['Browser'];?>
</td>
                <td align="center"><?php echo $_smarty_tpl->tpl_vars['res']->value['ActiveAgents'];?>
</td>
                <td align="center"><?php echo $_smarty_tpl->tpl_vars['res']->value['QueueThreshold'];?>
</td>
                <td align="center"><?php echo $_smarty_tpl->tpl_vars['res']->value['QueueThresholdGreenLimit'];?>
</td>
                <td align="center"><?php echo $_smarty_tpl->tpl_vars['res']->value['QueueThresholdYellowLimit'];?>
</td>
                <td align="center"><?php echo $_smarty_tpl->tpl_vars['res']->value['QueueThresholdRedLimit'];?>
</td>
                  <form action="editLocation.php"><input type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                    <td style="padding:1px"><input class="actionIcon" type="image" src="img/edit_icon.png" title="Edit"
                                                   alt="Edit" value="Edit"></td>
                  </form>
                  <form action="deleteLocation.php" name="deleteLocation" onsubmit="return confirm('Confirm Deletion')">
                    <input type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                    <td style="padding:1px"><input class="actionIcon" type="image" title="Delete"
                                                   src="img/delete_icon.png" value="Del"></td>
                  </form>
              </tr>
            <?php }} ?>
          </table>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
