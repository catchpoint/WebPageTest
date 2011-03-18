<?php /* Smarty version Smarty-3.0.6, created on 2011-01-30 11:32:22
         compiled from "templates\user/addShare.tpl" */ ?>
<?php /*%%SmartyHeaderCode:202434d45a0a60eec82-14706531%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    '8de741d1cc582f850db1eb79180c8a28b7da1b18' => 
    array (
      0 => 'templates\\user/addShare.tpl',
      1 => 1293661692,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '202434d45a0a60eec82-14706531',
  'function' => 
  array (
  ),
  'has_nocache_code' => false,
)); /*/%%SmartyHeaderCode%%*/?>
<?php if (!is_callable('smarty_function_html_options')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\function.html_options.php';
?><!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
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
          <h2 class="cufon-dincond_black">Share</h2>
          <div class="translucent">
            <form method="get" class="cmxform" action="updateShare.php" id="updateForm">
              <input type="hidden" name="id" value="<?php echo $_smarty_tpl->getVariable('share')->value['Id'];?>
">
              <input type="hidden" name="userId" value="<?php echo $_smarty_tpl->getVariable('share')->value['UserId'];?>
">
              <input type="hidden" name="tableName" value="<?php echo $_smarty_tpl->getVariable('share')->value['TheTableName'];?>
">
              <input type="hidden" name="tableItemId" value="<?php echo $_smarty_tpl->getVariable('share')->value['TableItemId'];?>
">
              <table>
                <tr>
                  <td align="right"><label for="active">Active</label></td>
                  <td><input type="checkbox" id="active" name="active" value="1"
                             <?php if ($_smarty_tpl->getVariable('share')->value['Active']){?>checked="true" <?php }?>/></td>
                </tr>
                <tr>
                  <td align="right">
                    <label>Table</label>
                  </td>
                  <td>
                    <input type="text" disabled="true" value="<?php echo $_smarty_tpl->getVariable('share')->value['TheTableName'];?>
">
                  </td>
                </tr>
                <tr>
                  <td align="right">
                    <label>Folder</label>
                  </td>
                  <td>
                     <input type="text" disabled="true" value="<?php echo $_smarty_tpl->getVariable('folderName')->value;?>
">
                  </td>
                </tr>
                <tr>
                  <td align="right"><label for="username">Share With</label></td>
                  <td><select name="shareWithUserId" id="username">
                    <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->getVariable('userName')->value,'selected'=>$_smarty_tpl->getVariable('share')->value['ShareWithUser']['Id']),$_smarty_tpl);?>

                    </select> 
                </td>

                <tr>
                  <td align="right"><label for="permission">Permission</label></td>
                  <td>
                    <select name="permissions" id="permission">
                      <option value="0" <?php if ($_smarty_tpl->getVariable('share')->value['Permissions']==0){?>selected<?php }?>>Read</option>
                      <option value="1" <?php if ($_smarty_tpl->getVariable('share')->value['Permissions']==1){?>selected<?php }?>>Update</option>
                      <option value="2" <?php if ($_smarty_tpl->getVariable('share')->value['Permissions']==2){?>selected<?php }?>>Create/Delete</option>
                      <option value="4" <?php if ($_smarty_tpl->getVariable('share')->value['Permissions']==4){?>selected<?php }?>>Execute</option>
                    </select>
                </td>
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
