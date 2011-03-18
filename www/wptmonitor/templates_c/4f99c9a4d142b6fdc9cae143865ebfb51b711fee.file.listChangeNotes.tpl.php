<?php /* Smarty version Smarty-3.0.6, created on 2011-01-30 17:35:13
         compiled from "templates\changenote/listChangeNotes.tpl" */ ?>
<?php /*%%SmartyHeaderCode:232754d45f5b1881967-72678838%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    '4f99c9a4d142b6fdc9cae143865ebfb51b711fee' => 
    array (
      0 => 'templates\\changenote/listChangeNotes.tpl',
      1 => 1293738097,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '232754d45f5b1881967-72678838',
  'function' => 
  array (
  ),
  'has_nocache_code' => false,
)); /*/%%SmartyHeaderCode%%*/?>
<?php if (!is_callable('smarty_function_html_select_tree')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\function.html_select_tree.php';
if (!is_callable('smarty_modifier_date_format')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\modifier.date_format.php';
?><!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  <?php $_template = new Smarty_Internal_Template("headIncludes.tpl", $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
  <title>Change Notes</title>
  
    <script type="text/javascript">
      <!--
      function confirmRemoval(text) {
        var confirmTXT = text;
        var confirmBOX = confirm(confirmTXT);
        if (confirmBOX == true) {
          return true;
        }
      }
   function moveNotesToFolder() {
        var folderId = document.moveNotesToFolderForm.folderId[document.moveNotesToFolderForm.folderId.selectedIndex].value;
        var url = "addToFolder.php?folder=ChangeNote&forwardTo=listChangeNotes.php&folderId="+folderId;
        var notesSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            notesSelected = true;
            url += "&id[]=" + this.value;
          }
        });
        if (!notesSelected) {
          alert('Please select note(s) to move');
          return true;
        } else {
          document.location = url;
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
              <td><h2 class="cufon-dincond_black">Change Notes</h2>
               <form name="folderForm" action="">
                <a href="listFolders.php?folder=ChangeNote"><b>Folder:</b></a>
                  <select name="folderId" onchange="document.folderForm.submit();">
                    <?php echo smarty_function_html_select_tree(array('permission'=>@PERMISSION_READ,'shares'=>$_smarty_tpl->getVariable('shares')->value,'tree'=>$_smarty_tpl->getVariable('folderTree')->value,'selected'=>$_smarty_tpl->getVariable('folderId')->value),$_smarty_tpl);?>

                </select>
                </form>
              </td>
              <form name="showPublicForm" action="">
              <td nowrap="true" valign="bottom" align="right"><b>Show Public Notes:</b>
                  <select name="showPublic" onchange="document.showPublicForm.submit();">
                  <option value="false" <?php if ($_smarty_tpl->getVariable('showPublic')->value=='false'){?> selected <?php }?>>No</option>
                  <option value="true" <?php if ($_smarty_tpl->getVariable('showPublic')->value=='true'){?>selected <?php }?>>Yes</option>
                </select>
                </form></td>
            </tr>
          </table>
          <table class="pretty" width="100%">
            <tr>
              <th></th>
              <th align="left" style="vertical-align:bottom;">Date</th>
              <th style="vertical-align:bottom;">Public</th>
              <th align="left" style="vertical-align:bottom;">Owner</th>
              <th align="left" style="vertical-align:bottom;">
              <?php if ($_smarty_tpl->getVariable('folderId')->value==-1){?>Folder<br><?php }?>Label</th>
              <th align="left" style="vertical-align:bottom;">Description</th>
              <th colspan="3" align="center" style="vertical-align:bottom;">Actions</th>
            </tr>
            <?php  $_smarty_tpl->tpl_vars['res'] = new Smarty_Variable;
 $_from = $_smarty_tpl->getVariable('result')->value; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array');}
if ($_smarty_tpl->_count($_from) > 0){
    foreach ($_from as $_smarty_tpl->tpl_vars['res']->key => $_smarty_tpl->tpl_vars['res']->value){
?>
            <?php if (($_smarty_tpl->tpl_vars['res']->value['Public']==true&&$_smarty_tpl->getVariable('showPublic')->value=='true')||($_smarty_tpl->tpl_vars['res']->value['Public']==false)){?>
            <?php if ($_smarty_tpl->getVariable('eo')->value=="even"){?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("odd", null, null);?> <?php }else{ ?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("even", null, null);?><?php }?>
              <tr class="<?php echo $_smarty_tpl->getVariable('eo')->value;?>
">
                <td align="center">
                  <?php if ($_smarty_tpl->getVariable('userId')->value==$_smarty_tpl->tpl_vars['res']->value['UserId']){?>
                    <input type="checkbox" name="selectedNote" id="selectedNote" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                  <?php }?>
                </td>
                <td align="left"><?php echo smarty_modifier_date_format($_smarty_tpl->tpl_vars['res']->value['Date'],"%D %H:%M");?>
</td>
                <td align="center"><?php if ($_smarty_tpl->tpl_vars['res']->value['Public']){?>Yes<?php }else{ ?>No<?php }?></td>
                <td align="left"><?php echo $_smarty_tpl->tpl_vars['res']->value['User']['Username'];?>
</td>
                <td align="left">
                  <?php if ($_smarty_tpl->getVariable('folderId')->value==-1){?><a href=listChangeNotes.php?folderId=<?php echo $_smarty_tpl->tpl_vars['res']->value['ChangeNoteFolder']['id'];?>
><?php echo $_smarty_tpl->tpl_vars['res']->value['ChangeNoteFolder']['Label'];?>
</a><br><?php }?><?php echo $_smarty_tpl->tpl_vars['res']->value['Label'];?>
</td>
                <td align="left"><?php echo $_smarty_tpl->tpl_vars['res']->value['Description'];?>
</td>
                <td align="right">
                    <table>
                      <tr>
                        <?php if (hasPermission("ChangeNote",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_UPDATE)){?>
                        <form action="editChangeNote.php">
                          <input type="hidden" name="folderId" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['ChangeNoteFolderId'];?>
">
                          <input type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                          <td style="padding:1px"><input class="actionIcon" type="image" src="img/edit_icon.png"
                                                         title="Edit" alt="Edit" value="Edit"></td>
                        </form>
                        <?php }?>
                        <?php if (hasPermission("ChangeNote",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_CREATE_DELETE)){?>
                        <form action="deleteChangeNote.php" name="deleteChangeNote"
                              onsubmit="return confirm('Confirm Deletion')"><input type="hidden" name="id"
                                                                                   value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                          <td style="padding:1px"><input class="actionIcon" type="image" title="Delete"
                                                         src="img/delete_icon.png" value="Del"></td>
                        </form>
                        <form action="copyChangeNote.php" name="copyChangeNote" onsubmit="return confirm('Confirm Copy')">
                          <input type="hidden" name="folderId" value="<?php echo $_smarty_tpl->getVariable('folderId')->value;?>
">
                          <input type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                          <td style="padding:1px">
                            <input class="actionIcon" type="image" src="img/copy_icon.png"title="Copy" value="Copy">
                          </td>
                        </form>
                        <?php }?>
                      </tr>
                    </table>
                </td>
              </tr>
            <?php }?>
            <?php }} ?>
            <tr>
              <td colspan="4">
                <table width="100%" border="0">
                  <tr>
                    <td nowrap="true">
                  <?php if (hasPermission("ChangeNote",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_OWNER)){?>
                      <form name="moveNotesToFolderForm">
                        <input type="button" value="Move notes to folder" onclick="moveNotesToFolder()">
                        <select name="folderId">
                          <?php echo smarty_function_html_select_tree(array('tree'=>$_smarty_tpl->getVariable('folderTree')->value),$_smarty_tpl);?>

                        </select>
                      </form>
                  <?php }?>
                    </td>
                  </tr>
                </table>
              </td>

              <td colspan="25">
                <table width="100%" border="0">
                  <tr>
                    <td></td>
                    <td align="right">
                    <?php if (hasPermission("ChangeNote",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_CREATE_DELETE)){?>
                      <form action="editChangeNote.php">
                        <input type="hidden" name="folderId" value="<?php echo $_smarty_tpl->getVariable('folderId')->value;?>
">
                        <input type="submit" value="Add New Change Note">
                      </form>
                    <?php }?>
                    </td>
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
