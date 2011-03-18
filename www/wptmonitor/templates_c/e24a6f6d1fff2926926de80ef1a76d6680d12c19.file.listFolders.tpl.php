<?php /* Smarty version Smarty-3.0.6, created on 2011-01-29 14:11:20
         compiled from "templates\listFolders.tpl" */ ?>
<?php /*%%SmartyHeaderCode:258194d44746817a016-37527361%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    'e24a6f6d1fff2926926de80ef1a76d6680d12c19' => 
    array (
      0 => 'templates\\listFolders.tpl',
      1 => 1293138344,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '258194d44746817a016-37527361',
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
  <title><?php echo $_smarty_tpl->getVariable('folderName')->value;?>
 Folders</title>
  
    <script type="text/javascript">
      <!--
      function confirmRemoval(text, itemCount) {
        if (itemCount > 0) {
          alert('Can not delete folders that contain jobs. Please move or delete the items first.');
          return false;
        } else {
          return confirm(text);
        }
      }
      function updateFolder(form) {
        newName = prompt('Folder Name', form.label.value);
        if (newName == null) {
          return false;
        }
        if (newName.trim() == "") {
          alert("Name can not be blank");
          return false;
        }
        form.label.value = newName;
        return true;
      }
      //-->
    </script>
  
</head>
<body>
<div class="page">
  <?php $_template = new Smarty_Internal_Template('header.tpl', $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?><?php $_template = new Smarty_Internal_Template('navbar.tpl', $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
  <div id="main">
    <div class="level_2">
      <div class="content-wrap">
        <div class="content">
          <table style="border-collapse:collapse" width="100%">
            <tr>
              <td colspan="2"><h2 class="cufon-dincond_black"><?php echo $_smarty_tpl->getVariable('folderName')->value;?>
 Folders</h2>
                <form action="" name="folderForm">
                  <b>Table:</b> <select name="folder" onchange="document.folderForm.submit();">
                  <option <?php if ($_smarty_tpl->getVariable('folderName')->value=='Job'){?>selected<?php }?>>Job</option>
                  <option <?php if ($_smarty_tpl->getVariable('folderName')->value=='Script'){?>selected<?php }?>>Script</option>
                  <option <?php if ($_smarty_tpl->getVariable('folderName')->value=='Alert'){?>selected<?php }?>>Alert</option>
                  <option <?php if ($_smarty_tpl->getVariable('folderName')->value=='ChangeNote'){?>selected<?php }?>>ChangeNote</option>
                </select>
                </form>
              </td>
            </tr>
            <tr>
              <td>
                <table class="pretty" width=100%<?php ?>>
                  <tr bgcolor="#AAAAAA">
                    <th align="left">Folder Name</th>
                    <th align="right">Items</th>
                    <th align="right">Shares</th>
                    <th align="center">Actions</th>
                  </tr>
                  <?php  $_smarty_tpl->tpl_vars['res'] = new Smarty_Variable;
 $_from = $_smarty_tpl->getVariable('folderTree')->value; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array');}
if ($_smarty_tpl->_count($_from) > 0){
    foreach ($_from as $_smarty_tpl->tpl_vars['res']->key => $_smarty_tpl->tpl_vars['res']->value){
?>
                  <?php if ($_smarty_tpl->getVariable('eo')->value=="even"){?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("odd", null, null);?> <?php }else{ ?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("even", null, null);?><?php }?>
                    <tr class="<?php echo $_smarty_tpl->getVariable('eo')->value;?>
">
                      <td nowrap="true" valign="top">
                        <?php if ($_smarty_tpl->tpl_vars['res']->value['level']>0){?>
                        <?php $_smarty_tpl->tpl_vars['lev'] = new Smarty_Variable;$_smarty_tpl->tpl_vars['lev']->step = 1;$_smarty_tpl->tpl_vars['lev']->total = (int)ceil(($_smarty_tpl->tpl_vars['lev']->step > 0 ? $_smarty_tpl->tpl_vars['res']->value['level']+1 - (1) : 1-($_smarty_tpl->tpl_vars['res']->value['level'])+1)/abs($_smarty_tpl->tpl_vars['lev']->step));
if ($_smarty_tpl->tpl_vars['lev']->total > 0){
for ($_smarty_tpl->tpl_vars['lev']->value = 1, $_smarty_tpl->tpl_vars['lev']->iteration = 1;$_smarty_tpl->tpl_vars['lev']->iteration <= $_smarty_tpl->tpl_vars['lev']->total;$_smarty_tpl->tpl_vars['lev']->value += $_smarty_tpl->tpl_vars['lev']->step, $_smarty_tpl->tpl_vars['lev']->iteration++){
$_smarty_tpl->tpl_vars['lev']->first = $_smarty_tpl->tpl_vars['lev']->iteration == 1;$_smarty_tpl->tpl_vars['lev']->last = $_smarty_tpl->tpl_vars['lev']->iteration == $_smarty_tpl->tpl_vars['lev']->total;?> &nbsp;&nbsp;&nbsp; <?php }} ?>
                          |_
                        <?php }?>
                        <a href="<?php echo $_smarty_tpl->getVariable('jumpUrl')->value;?>
?folderId=<?php echo $_smarty_tpl->tpl_vars['res']->value['id'];?>
"><?php echo $_smarty_tpl->tpl_vars['res']->value['Label'];?>
</a></td>
                      <td align="right"><?php echo sizeOf($_smarty_tpl->tpl_vars['res']->value[$_smarty_tpl->getVariable('itemTableName')->value]);?>

                      </td>
                      <td align="right"><?php echo $_smarty_tpl->getVariable('shareCount')->value[$_smarty_tpl->tpl_vars['res']->value['id']];?>
</td>
                      <td align="right">
                        <table border=0>
                          <tr>
                            <?php if ($_smarty_tpl->getVariable('lev')->value>0){?>
                              <td style="padding:1px">
                                <form action="addFolder.php" onsubmit="return updateFolder(this);">
                                  <input type="hidden" name="editId" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['id'];?>
">
                                  <input type="hidden" name="label" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Label'];?>
">
                                  <input type="hidden" name="folder" value="<?php echo $_smarty_tpl->getVariable('folderName')->value;?>
">
                                  <input class="actionIcon" type="image" src="img/edit_icon.png" title="Edit" alt="Edit"
                                         value="Edit">
                                </form>
                              </td>
                            <td style="padding:1px">

                              <form action="listFolders.php"
                                    onsubmit="return confirmRemoval('Confirm Deletion',<?php echo sizeOf($_smarty_tpl->tpl_vars['res']->value[$_smarty_tpl->getVariable('itemTableName')->value]);?>
);">
                                <input type="hidden" name="folderId" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['id'];?>
">
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="folder" value="<?php echo $_smarty_tpl->getVariable('folderName')->value;?>
">
                                <input class="actionIcon" type="image" title="Delete"
                                       src="img/delete_icon.png" value="Del">
                              </form>
                              <?php }?>
                          </td>
                            <td style="padding:1px">
                              <form action="listShares.php" name="listShareWith">
                                <input type="hidden" name="folderId" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['id'];?>
">
                                <input type="hidden" name="tableName" value="<?php echo $_smarty_tpl->getVariable('itemTableName')->value;?>
">
                                <input class="actionIcon" type="image" src="img/Share.png" title="Shares">
                              </form>
                            </td>

                            <td style="padding:1px">
                              <form action="addFolder.php" name="addFolder" onsubmit="return updateFolder(this);">
                                <input type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['id'];?>
">
                                <input type="hidden" name="label">
                                <input type="hidden" name="folder" value="<?php echo $_smarty_tpl->getVariable('folderName')->value;?>
">
                                <input class="actionIcon" type="image" src="img/add_icon.png" title="Add">
                              </form>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  <?php }} ?>
                  <tr>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
