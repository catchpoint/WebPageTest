<?php /* Smarty version Smarty-3.0.6, created on 2011-01-30 12:55:05
         compiled from "templates\alert/listAlerts.tpl" */ ?>
<?php /*%%SmartyHeaderCode:287044d45b40995eec2-99322988%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    'f6ef566b37e824329e6c0a8da66eb5d08b9c7c3e' => 
    array (
      0 => 'templates\\alert/listAlerts.tpl',
      1 => 1293736976,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '287044d45b40995eec2-99322988',
  'function' => 
  array (
  ),
  'has_nocache_code' => false,
)); /*/%%SmartyHeaderCode%%*/?>
<?php if (!is_callable('smarty_function_html_select_tree')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\function.html_select_tree.php';
if (!is_callable('smarty_modifier_truncate')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\modifier.truncate.php';
if (!is_callable('smarty_modifier_date_format')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\modifier.date_format.php';
?><!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  <?php $_template = new Smarty_Internal_Template("headIncludes.tpl", $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
  <title>Alerts</title>
  
    <script type="text/javascript">
      <!--
      function confirmRemoval(text) {
        var confirmTXT = text;
        var confirmBOX = confirm(confirmTXT);
        if (confirmBOX == true) {
          return true;
        }
      }
      function processAlerts() {
        var url = "runAlerts.php?a=b";
        var alertsSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            alertsSelected = true;
            url += "&alert_id[]=" + this.value;
          }
        });
        if (!alertsSelected) {
          alert('Please select alert(s) to process');
          return true;
        } else {
//            var runlabel = prompt("Run Label (optional)", "");

          document.location = url;
        }
      }
      function toggleAlertActive() {
        var url = "toggleAlertActive.php?forward_to=listresults.php";
        var alertsSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            alertsSelected = true;
            url += "&alert_id[]=" + this.value;
          }
        });
        if (!alertsSelected) {
          alert('Please select alert(s) to process');
          return true;
        } else {
          document.location = url;
        }
      }
      function moveAlertsToFolder() {
        var folderId = document.moveAlertsToFolderForm.folderId[document.moveAlertsToFolderForm.folderId.selectedIndex].value;
        var url = "addToFolder.php?folder=Alert&forwardTo=listAlerts.php&folderId="+folderId;
        var jobsSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            alertsSelected = true;
            url += "&id[]=" + this.value;
          }
        });
        if (!alertsSelected) {
          alert('Please select alert(s) to move');
          return true;
        } else {
          document.location = url;
        }
      }

      $(document).ready(function() {
        $('input#toggleAllDisplayedAlerts').click(function() {
          $('input:checkbox').each(function() {
            this.checked = !this.checked;
          });
          return false;
        });
      });
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
              <td><h2 class="cufon-dincond_black">Alerts</h2>
                <form name="folderForm" action="">
                <a href="listFolders.php?folder=Alert"><b>Folder:</b></a>
                  <select name="folderId" onchange="document.folderForm.submit();">
                    <?php echo smarty_function_html_select_tree(array('permission'=>@PERMISSION_READ,'shares'=>$_smarty_tpl->getVariable('shares')->value,'tree'=>$_smarty_tpl->getVariable('folderTree')->value,'selected'=>$_smarty_tpl->getVariable('folderId')->value),$_smarty_tpl);?>

                </select>
                </form>
              </td>
              <td align="right" valign="top">
                <form action="">
                  <input type="hidden" name="currentPage" value="<?php echo $_smarty_tpl->getVariable('currentPage')->value;?>
">
                  Filter: <select name="filterField">
                  <option></option>
                  <option <?php if ($_smarty_tpl->getVariable('alertsFilterField')->value=='Label'){?> selected="true"<?php }?>>Label</option>
                </select>
                  <input type="text" name="filterValue" value="<?php echo $_smarty_tpl->getVariable('alertsFilterValue')->value;?>
">
                  <input type="submit" value="Filter">
                </form>
              </td>
              <td valign="top">
                <form action=""><input type="hidden" name="clearFilter" value="true"><input type="submit" value="Clear">
                </form>
              </td>
              <td align="right" valign="top"><?php $_template = new Smarty_Internal_Template('pager.tpl', $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?><br>
                <?php if ($_smarty_tpl->getVariable('showInactiveAlerts')->value){?><a href="?showInactiveAlerts=false">Hide Inactive Alerts</a><?php }else{ ?><a
                    href="?showInactiveAlerts=true">Show Inactive Alerts</a><?php }?>
              </td>
            </tr>
          </table>
          <table id="alertList" class="pretty" width="100%">
            <tr>
              <th align="center">
                <a href="?orderBy=Active"><?php if ($_smarty_tpl->getVariable('orderAlertsBy')->value=="Active"){?><b><?php }?>
                  Act</a><?php if ($_smarty_tpl->getVariable('orderAlertsBy')->value=="Active"){?></b><a
                  href="?orderBy=Active&orderByDir=<?php echo $_smarty_tpl->getVariable('orderAlertsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderAlertsByDirection')->value=="ASC"){?>
                <img width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
              </a><?php }?><br>
              </th>
              <th align="center"><input type="checkbox" id="toggleAllDisplayedAlerts"
                                        onchange="toggleSelectedAlerts();"></th>
              <th align="left">
              <?php if ($_smarty_tpl->getVariable('folderId')->value==-1){?>Folder<?php }?>
                <a href="?orderBy=Label"><?php if ($_smarty_tpl->getVariable('orderAlertsBy')->value=="Label"){?><b><?php }?>
                  Label</a><?php if ($_smarty_tpl->getVariable('orderAlertsBy')->value=="Label"){?></b><a
                  href="?orderBy=Label&orderByDir=<?php echo $_smarty_tpl->getVariable('orderAlertsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderAlertsByDirection')->value=="ASC"){?>
                <img width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
              </a><?php }?><br>
              </th>
              <th align="left">
                Description
              </th>
              <th align="left">
                Type
              </th>
              <th align="center">Comp</th>
              <th align="center">Value</th>
              <th align="right">Threshold</th>
              <th align="right">Last Alert</th>
              <th align="center"> Actions</th>
            </tr>
            <?php  $_smarty_tpl->tpl_vars['res'] = new Smarty_Variable;
 $_from = $_smarty_tpl->getVariable('result')->value; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array');}
if ($_smarty_tpl->_count($_from) > 0){
    foreach ($_from as $_smarty_tpl->tpl_vars['res']->key => $_smarty_tpl->tpl_vars['res']->value){
?>
            <?php if ($_smarty_tpl->getVariable('eo')->value=="even"){?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("odd", null, null);?> <?php }else{ ?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("even", null, null);?><?php }?>
              <tr class="<?php echo $_smarty_tpl->getVariable('eo')->value;?>
">
                <td align="center">
                  <?php if (hasPermission("Alert",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_UPDATE)){?>
                  <a title="Toggle Active/Inactive"
                     href=toggleAlertActive.php?alert_id[]=<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
&state=<?php echo $_smarty_tpl->tpl_vars['res']->value['Active'];?>
><?php if ($_smarty_tpl->tpl_vars['res']->value['Active']){?>
                     <img src="img/playing.png" width="20" height="20"><?php }else{ ?><img src="img/paused.png" width="20" height="20"><?php }?></a><?php }?>
                </td>
                <td align="center"><input type="checkbox" name="selectedAlert" id="selectedAlert" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                </td>
                <td nowrap="true">
            <?php if ($_smarty_tpl->getVariable('folderId')->value==-1){?><a href=listAlerts.php?folderId=<?php echo $_smarty_tpl->tpl_vars['res']->value['AlertFolder']['id'];?>
><?php echo $_smarty_tpl->tpl_vars['res']->value['AlertFolder']['Label'];?>
</a><br><?php }?>
                  <?php echo smarty_modifier_truncate($_smarty_tpl->tpl_vars['res']->value['Label'],40);?>
</td>
                <td><?php echo $_smarty_tpl->tpl_vars['res']->value['Description'];?>
</td>
                <td align="left"><?php echo $_smarty_tpl->tpl_vars['res']->value['AlertOnType'];?>

                  <?php if ($_smarty_tpl->tpl_vars['res']->value['AlertOnType']=="Response Time"){?><br>( <?php echo $_smarty_tpl->tpl_vars['res']->value['AlertOn'];?>
 )<?php }?>
                </td>
                <td align="center" nowrap="true"><?php echo $_smarty_tpl->tpl_vars['res']->value['AlertOnComparator'];?>
</td>
                <?php if ($_smarty_tpl->tpl_vars['res']->value['AlertOnType']=="Response Time"){?>
                  <td align="center"><?php echo $_smarty_tpl->tpl_vars['res']->value['AlertOnValue'];?>
</td>
                <?php }elseif($_smarty_tpl->tpl_vars['res']->value['AlertOnType']=="Response Code"){?>
                  <td align="center"><?php echo $_smarty_tpl->getVariable('wptResultStatusCodes')->value[$_smarty_tpl->tpl_vars['res']->value['AlertOn']];?>
</td>
                <?php }elseif($_smarty_tpl->tpl_vars['res']->value['AlertOnType']=="Validation Code"){?>
                  <td align="center"><?php echo $_smarty_tpl->getVariable('wptValidationStateCodes')->value[$_smarty_tpl->tpl_vars['res']->value['AlertOn']];?>
</td>
                <?php }?>
                <td align="right"><?php echo $_smarty_tpl->tpl_vars['res']->value['AlertThreshold'];?>
</td>
                <td align="right"><?php echo smarty_modifier_date_format($_smarty_tpl->tpl_vars['res']->value['LastAlertTime'],"%D %H:%M");?>
</td>
                <td align="right">
                  <table>
                    <tr>
                      <td>
                        <?php if (hasPermission("Alert",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_UPDATE)){?>
                        <form action="editAlert.php">
                          <input type="hidden" name="folderId" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['AlertFolderId'];?>
">
                          <input type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                          <td style="padding:1px"><input class="actionIcon" type="image" src="img/edit_icon.png"
                                                         title="Edit" alt="Edit" value="Edit"></td>
                        </form>
                        <?php }?>
                        <?php if (hasPermission("Alert",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_CREATE_DELETE)){?>
                        <form action="deleteAlert.php" name="deleteAlert" onsubmit="return confirm('Confirm Deletion')">
                          <input type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                          <td style="padding:1px"><input class="actionIcon" type="image" title="Delete"
                                                         src="img/delete_icon.png" value="Del"></td>
                        </form>
                        <form action="copyAlert.php" name="copyAlert" onsubmit="return confirm('Confirm Copy')">
                          <input type="hidden" name="folderId" value="<?php echo $_smarty_tpl->getVariable('folderId')->value;?>
">
                          <input type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                          <td style="padding:1px">
                            <input class="actionIcon" type="image" src="img/copy_icon.png" title="Copy" value="Copy">
                            </td>
                        </form>
                        <?php }?>
                        <?php if (hasPermission("Alert",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_EXECUTE)){?>
                        <form action="testAlertEmail.php">
                          <input type="hidden" name="emailAddress" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['EmailAddresses'];?>
">
                          <input type="hidden" name="forward_to" value="listAlerts.php"/>
                          <td style="padding:1px">
                            <input class="actionIcon" type="image" src="img/execute_icon.png" title="Test Alert now."
                                   value="Exec"/>
                        </form>
                      <?php }?>
                      </td>
                      </td></tr>
                  </table>
                </td>
              </tr>
            <?php }} ?>
            <tr>
              <td colspan="25">
                <table width="100%" border="0">
                  <tr>
                    <td>
                    <?php if (hasPermission("Alert",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_UPDATE)){?>
                      <input onclick="toggleAlertActive();" type="submit" value="Toggle Active">
                    <?php }?>
                    <?php if (hasPermission("Alert",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_OWNER)){?>
                      <p><form name="moveAlertsToFolderForm">
                        <input type="button" value="Move to folder" onclick="moveAlertsToFolder()">
                        <select name="folderId">
                          <?php echo smarty_function_html_select_tree(array('tree'=>$_smarty_tpl->getVariable('folderTree')->value),$_smarty_tpl);?>

                        </select>
                      </form>
                    <?php }?>
                    </td>
                    <td align="right">
                      <?php if (hasPermission("Alert",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_CREATE_DELETE)){?>
                      <form action="editAlert.php" method="GET">
                        <input type="hidden" name="folderId" value="<?php echo $_smarty_tpl->getVariable('folderId')->value;?>
">
                        <input type="submit" value="Add New Alert">
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
