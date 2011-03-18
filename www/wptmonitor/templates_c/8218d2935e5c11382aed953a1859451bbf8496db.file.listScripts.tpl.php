<?php /* Smarty version Smarty-3.0.6, created on 2011-03-15 13:10:27
         compiled from "templates\script/listScripts.tpl" */ ?>
<?php /*%%SmartyHeaderCode:53494d7fc7b3c93071-13010064%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    '8218d2935e5c11382aed953a1859451bbf8496db' => 
    array (
      0 => 'templates\\script/listScripts.tpl',
      1 => 1300219827,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '53494d7fc7b3c93071-13010064',
  'function' => 
  array (
  ),
  'has_nocache_code' => false,
)); /*/%%SmartyHeaderCode%%*/?>
<?php if (!is_callable('smarty_function_html_select_tree')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\function.html_select_tree.php';
if (!is_callable('smarty_modifier_truncate')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\modifier.truncate.php';
?><!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  <?php $_template = new Smarty_Internal_Template("headIncludes.tpl", $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
  <title>Scripts</title>
  
    <script type="text/javascript">
      <!--
      function confirmRemoval(text) {
        var confirmTXT = text;
        var confirmBOX = confirm(confirmTXT);
        if (confirmBOX == true) {
          return true;
        }
      }
      function moveScriptsToFolder() {
        var folderId = document.moveScriptsToFolderForm.folderId[document.moveScriptsToFolderForm.folderId.selectedIndex].value;
        var url = "addToFolder.php?folder=Script&forwardTo=listScripts.php&folderId="+folderId;
        var scriptsSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            scriptsSelected = true;
            url += "&id[]=" + this.value;
          }
        });
        if (!scriptsSelected) {
          alert('Please select script(s) to move');
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
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?><?php $_template = new Smarty_Internal_Template('navbar.tpl', $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
  <div id="main">
    <div class="level_2">
      <div class="content-wrap">
        <div class="content">
          <table style="border-collapse:collapse" width="100%">
            <tr>
              <td><h2 class="cufon-dincond_black">Scripts</h2>
                <form name="folderForm" action="">
                <a href="listFolders.php?folder=Script"><b>Folder:</b></a> <select name="folderId" onchange="document.folderForm.submit();">
                  <?php echo smarty_function_html_select_tree(array('permission'=>@PERMISSION_READ,'shares'=>$_smarty_tpl->getVariable('shares')->value,'tree'=>$_smarty_tpl->getVariable('folderTree')->value,'selected'=>$_smarty_tpl->getVariable('folderId')->value),$_smarty_tpl);?>

                </select>
                </form>
              </td>
              <td align="right" valign="top">
                <form action="">
                  <input type="hidden" name="scriptsCurrentPage" value="<?php echo $_smarty_tpl->getVariable('scriptsCurrentPage')->value;?>
">
                  Filter: <select name="scriptsFilterField">
                  <option></option>
                  <option <?php if ($_smarty_tpl->getVariable('scriptsFilterField')->value=='Label'){?> selected="true"<?php }?>>Label</option>
                  <option <?php if ($_smarty_tpl->getVariable('scriptsFilterField')->value=='URL'){?> selected="true"<?php }?>>URL</option>
                  <option <?php if ($_smarty_tpl->getVariable('scriptsFilterField')->value=='Description'){?> selected="true"<?php }?>>Description</option>
                </select>
                  <input type="text" name="scriptsFilterValue" value="<?php echo $_smarty_tpl->getVariable('scriptsFilterValue')->value;?>
">
                  <input type="submit" value="Filter">
                </form>
              </td>
              <td valign="top">
                <form action=""><input type="hidden" name="clearScriptsFilter" value="true"><input type="submit"
                                                                                                   value="Clear"></form>
              </td>
              <td align="right" valign="top"><?php $_template = new Smarty_Internal_Template('pager.tpl', $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?><br>
              </td>
            </tr>
          </table>

          <table class="pretty" width="100%">
            <tr bgcolor="#AAAAAA">
              <td></td>
              <td colspan="2">
                <?php if ($_smarty_tpl->getVariable('folderId')->value==-1){?>Folder<br><?php }?>
                <a href="?orderBy=Label"><?php if ($_smarty_tpl->getVariable('orderScriptsBy')->value=="Label"){?><strong><?php }?>Label</strong></a>
              </td>
              <td><a href="?orderBy=URL"><?php if ($_smarty_tpl->getVariable('orderScriptsBy')->value=="URL"){?><strong><?php }?>URL</strong></a></td>
              <td colspan="1">Description</td>
              <td colspan="1" align="center"><a href="?orderBy=MultiStep"><?php if ($_smarty_tpl->getVariable('orderScriptsBy')->value=="MultiStep"){?>
              <strong><?php }?>MultiStep</strong></a></td>
              <td align="center"><a href="?orderBy=Validate"><?php if ($_smarty_tpl->getVariable('orderScriptsBy')->value=="Validate"){?><strong><?php }?>
                Validate</strong></a></td>
              <td colspan="5" align="center">Actions</td>
            </tr>
            <?php  $_smarty_tpl->tpl_vars['res'] = new Smarty_Variable;
 $_from = $_smarty_tpl->getVariable('result')->value; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array');}
if ($_smarty_tpl->_count($_from) > 0){
    foreach ($_from as $_smarty_tpl->tpl_vars['res']->key => $_smarty_tpl->tpl_vars['res']->value){
?>
            <?php if ($_smarty_tpl->getVariable('eo')->value=="even"){?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("odd", null, null);?> <?php }else{ ?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("even", null, null);?><?php }?>
              <tr class="<?php echo $_smarty_tpl->getVariable('eo')->value;?>
">
                <td align="center"><input type="checkbox" name="selectedScript" id="selectedScript" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
"></td>
                <td colspan="2" nowrap="true">
                  <?php if ($_smarty_tpl->getVariable('folderId')->value==-1){?><a href=listScripts.php?folderId=<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTScriptFolder']['id'];?>
><?php echo $_smarty_tpl->tpl_vars['res']->value['WPTScriptFolder']['Label'];?>
</a><br><?php }?>
                  <?php echo $_smarty_tpl->tpl_vars['res']->value['Label'];?>
</td>
                <td><?php echo smarty_modifier_truncate($_smarty_tpl->tpl_vars['res']->value['URL'],60);?>
</td>
                <td valign="top"><?php echo smarty_modifier_truncate($_smarty_tpl->tpl_vars['res']->value['Description'],40);?>
</td>
                <td align="center"><?php if ($_smarty_tpl->tpl_vars['res']->value['MultiStep']){?>Yes<?php }else{ ?>No<?php }?></td>
                <td align="center"><?php if ($_smarty_tpl->tpl_vars['res']->value['Validate']){?>Yes<?php }else{ ?>No<?php }?></td>
                <td align="right">
                  <table>
                    <tr>
                      <?php if (hasPermission("WPTScript",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_UPDATE)){?>
                      <form action="editScript.php">
                        <input type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                        <input type="hidden" name="folderId" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTScriptFolderId'];?>
">
                        <td style="padding:1px">
                          <input class="actionIcon" type="image" src="img/edit_icon.png" title="Edit" alt="Edit" value="Edit">
                        </td>
                      </form>
                      <?php }?>
                      <?php if (hasPermission("WPTScript",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_CREATE_DELETE)){?>
                      <form action="deleteScript.php" name="deleteScript" onsubmit="return confirm('Confirm Deletion')">
                        <input type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                        <input type="hidden" name="folderId" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTScriptFolderId'];?>
">

                        <td style="padding:1px"><input class="actionIcon" type="image" title="Delete"
                                                       src="img/delete_icon.png" value="Del"></td>
                      </form>
                      <?php }?>
                      <?php if (hasPermission("WPTScript",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_CREATE_DELETE)){?>
                      <form action="copyScript.php" name="copyScript" onsubmit="return confirm('Confirm Copy')"><input
                          type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                        <td style="padding:1px"><input class="actionIcon" type="image" src="img/copy_icon.png"
                                                       title="Copy" value="Copy"></td>
                      </form>
                      <?php }?>
                    </tr>
                  </table>
                </td>
              </tr>
            <?php }} ?>
            <tr>
              <td colspan="7" valign="top">
                <table width="100%" border="0">
                  <tr>
                    <td align="left" nowrap="true">
                      <?php if (hasPermission("WPTScript",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_OWNER)){?>
                      <form name="moveScriptsToFolderForm">
                        <input type="button" value="Move to folder" onclick="moveScriptsToFolder()">
                        <select name="folderId">
                          <?php echo smarty_function_html_select_tree(array('tree'=>$_smarty_tpl->getVariable('folderTree')->value),$_smarty_tpl);?>

                        </select>
                      </form>
                      <?php }?>
                    </td>
                  </tr>
                </table>
              </td>
              <td colspan="" align="right" style="padding:.5em;">
                <?php if (hasPermission("WPTScript",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_CREATE_DELETE)){?>
                <form action="editScript.php">
                  <input type="hidden" name="folderId" value="<?php echo $_smarty_tpl->getVariable('folderId')->value;?>
"> 
                  <input type="submit" value="Add New Script">
                </form>
                <?php }?>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
