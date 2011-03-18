<?php /* Smarty version Smarty-3.0.6, created on 2011-01-30 16:41:03
         compiled from "templates\host/wptHostStatus.tpl" */ ?>
<?php /*%%SmartyHeaderCode:296234d45e8ff8c5a34-99944716%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    '7100d5fcd1cca146a7a3b63b94661278f785883f' => 
    array (
      0 => 'templates\\host/wptHostStatus.tpl',
      1 => 1289748431,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '296234d45e8ff8c5a34-99944716',
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
  <title>WPT Host Status</title>
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
        <div class="content" style="height:500px; overflow:auto;width:inherit;">
          <br>

          <h2 class="cufon-dincond_black">WPT Host Status</h2>
          <table class="pretty" style="border-collapse:collapse" width="100%">
            <thead>
            <th align="left">Host</th>
            <th align="left">ID</th>
            <th align="left">Label</th>
            <th align="left">Browser</th>
            <th align="right">In Queue</th>
            <th align="right">High</th>
            <th align="right">Low</th>
            <th></th>
            </thead>
            <?php  $_smarty_tpl->tpl_vars['location'] = new Smarty_Variable;
 $_from = $_smarty_tpl->getVariable('locations')->value; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array');}
if ($_smarty_tpl->_count($_from) > 0){
    foreach ($_from as $_smarty_tpl->tpl_vars['location']->key => $_smarty_tpl->tpl_vars['location']->value){
?>
            <?php if ($_smarty_tpl->getVariable('eo')->value=="even"){?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("odd", null, null);?> <?php }else{ ?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("even", null, null);?><?php }?>
            <?php $_smarty_tpl->tpl_vars["bgcolor"] = new Smarty_variable("#98fb98", null, null);?>
            <?php if ($_smarty_tpl->tpl_vars['location']->value['PendingTests']>$_smarty_tpl->tpl_vars['location']->value['GreenLimit']){?><?php $_smarty_tpl->tpl_vars['bgcolor'] = new Smarty_variable("yellow", null, null);?><?php }?>
            <?php if ($_smarty_tpl->tpl_vars['location']->value['PendingTests']>$_smarty_tpl->tpl_vars['location']->value['YellowLimit']){?><?php $_smarty_tpl->tpl_vars['bgcolor'] = new Smarty_variable("red", null, null);?><?php }?>
              <tr class="<?php echo $_smarty_tpl->getVariable('eo')->value;?>
">
                <td><?php echo $_smarty_tpl->tpl_vars['location']->value['host'];?>
</td>
                <td><?php echo $_smarty_tpl->tpl_vars['location']->value['id'];?>
</td>
                <td><?php echo $_smarty_tpl->tpl_vars['location']->value['Label'];?>
</td>
                <td><?php echo $_smarty_tpl->tpl_vars['location']->value['Browser'];?>
</td>
                <td align="right"><?php echo $_smarty_tpl->tpl_vars['location']->value['PendingTests'];?>
</td>
                <td align="right"><?php echo $_smarty_tpl->tpl_vars['location']->value['PendingTestsHighPriority'];?>
</td>
                <td align="right"><?php echo $_smarty_tpl->tpl_vars['location']->value['PendingTestsLowPriority'];?>
</td>
                <td style="opacity:0.6;background-color:<?php echo $_smarty_tpl->getVariable('bgcolor')->value;?>
"></td>
              </tr>
            <?php }} ?>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>
