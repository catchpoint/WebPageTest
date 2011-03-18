<?php /* Smarty version Smarty-3.0.6, created on 2011-01-29 14:11:23
         compiled from "templates\user/listShares.tpl" */ ?>
<?php /*%%SmartyHeaderCode:234164d44746b11fd21-94499020%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    '6870b771c7c3ab23fed4dcf56332c4c74dee5aee' => 
    array (
      0 => 'templates\\user/listShares.tpl',
      1 => 1293736103,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '234164d44746b11fd21-94499020',
  'function' => 
  array (
  ),
  'has_nocache_code' => false,
)); /*/%%SmartyHeaderCode%%*/?>
<?php if (!is_callable('smarty_function_html_select_tree')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\function.html_select_tree.php';
?><!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  <?php $_template = new Smarty_Internal_Template("headIncludes.tpl", $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
  <title>Shares</title>
  
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
              <td><h2 class="cufon-dincond_black">Folder Shares</h2><h4>
                <table>
                  <tr>
                    <td>
                  <form name="tableSelectForm">
                Table:</td><td><select name="tableName" onchange="document.tableSelectForm.submit()">
                  <option <?php if ($_smarty_tpl->getVariable('tableNameLabel')->value=="Job"){?>selected="true" <?php }?> value="WPTJob">Job</option>
                  <option <?php if ($_smarty_tpl->getVariable('tableNameLabel')->value=="Script"){?>selected="true" <?php }?> value="WPTScript">Script</option>
                  <option <?php if ($_smarty_tpl->getVariable('tableNameLabel')->value=="Alert"){?>selected="true" <?php }?> value="Alert">Alert</option>
                  <option <?php if ($_smarty_tpl->getVariable('tableNameLabel')->value=="ChangeNote"){?>selected="true" <?php }?> value="ChangeNote">Note</option>
                </select>
                </form></td>
                  <td>
                <form name="folderForm" action="">
                  <input type="hidden" name="tableName" value="<?php echo $_smarty_tpl->getVariable('tableName')->value;?>
">
                <a href="listFolders.php?folder=Job"><b>Folder:</b></a> <select name="folderId" onchange="document.folderForm.submit();">
                  <?php echo smarty_function_html_select_tree(array('tree'=>$_smarty_tpl->getVariable('folderTree')->value,'selected'=>$_smarty_tpl->getVariable('folderId')->value),$_smarty_tpl);?>

                </select>
                </form></td></tr></table>
              </h4></td>
            </tr>
          </table>
          <table class="pretty" width="100%">
            <tr>
            <tr bgcolor="#AAAAAA">
              <th>Active</th>
              <th align="left">User name</th>
              <th align="left">First Name</th>
              <th align="left">Last Name</th>
              <th>Permission</th>
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
                <td align="center"><?php if ($_smarty_tpl->tpl_vars['res']->value['Active']){?>Yes<?php }else{ ?>No<?php }?></td>
                <td align="left"><?php echo $_smarty_tpl->tpl_vars['res']->value['ShareWithUser']['Username'];?>
</td>
                <td align="left"><?php echo $_smarty_tpl->tpl_vars['res']->value['ShareWithUser']['FirstName'];?>
</td>
                <td align="left"><?php echo $_smarty_tpl->tpl_vars['res']->value['ShareWithUser']['LastName'];?>
</td>
                <td align="center">
                  <?php if ($_smarty_tpl->tpl_vars['res']->value['Permissions']==0){?>Read<?php }?>
                  <?php if ($_smarty_tpl->tpl_vars['res']->value['Permissions']==1){?>Update<?php }?>
                  <?php if ($_smarty_tpl->tpl_vars['res']->value['Permissions']==2){?>Create/Delete<?php }?>
                  <?php if ($_smarty_tpl->tpl_vars['res']->value['Permissions']==4){?>Execute<?php }?>
                  </td>

                  <td align="right">
                    <table>
                      <tr>
                        <form action="editShare.php"><input type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                          <td style="padding:1px"><input class="actionIcon" type="image" src="img/edit_icon.png"
                                                         title="Edit" alt="Edit" value="Edit"></td>
                        </form>
                        <form action="deleteShare.php" name="deleteshare"
                              onsubmit="return confirm('Confirm Deletion')"><input
                            type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                          <input type="hidden" name="tableName" value="<?php echo $_smarty_tpl->getVariable('tableName')->value;?>
">
                          <input type="hidden" name="folderId" value="<?php echo $_smarty_tpl->getVariable('folderId')->value;?>
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
                  <form action="editShare.php">
                    <input type="hidden" name="tableName" value="<?php echo $_smarty_tpl->getVariable('tableName')->value;?>
">
                    <input type="hidden" name="folderId" value="<?php echo $_smarty_tpl->getVariable('folderId')->value;?>
">
                    <input type="submit" value="Add New Share"></form>
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
