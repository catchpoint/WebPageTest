<?php /* Smarty version Smarty-3.0.6, created on 2011-03-15 13:13:03
         compiled from "templates\job/listJobs.tpl" */ ?>
<?php /*%%SmartyHeaderCode:203924d7fc84f862248-84288721%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    'c2501e357c26787c63218ccce8810f43f1b50f16' => 
    array (
      0 => 'templates\\job/listJobs.tpl',
      1 => 1300219982,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '203924d7fc84f862248-84288721',
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
  <title>Jobs</title>
  
    <script type="text/javascript">
      <!--
      function compareFilmstrips() {
        var url = "compareFilmstrips.php?a=b";
        var jobsSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            jobsSelected = true;
            url += "&job_id[]=" + this.value;
          }
        });
        if (!jobsSelected) {
          alert('Please select job(s) to compare');
          return true;
        } else {
          window.open(url);
        }
      }

      function confirmRemoval(text) {
        var confirmTXT = text;
        var confirmBOX = confirm(confirmTXT);
        if (confirmBOX == true) {
          return true;
        }
      }
      function processJobs() {
        var url = "runJobs.php?a=b";
        var jobsSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            jobsSelected = true;
            url += "&job_id[]=" + this.value;
          }
        });
        if (!jobsSelected) {
          alert('Please select job(s) to process');
          return true;
        } else {
          document.location = url;
        }
      }
      function toggleJobActive() {
        var url = "toggleJobActive.php?forward_to=listresults.php";
        var jobsSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            jobsSelected = true;
            url += "&job_id[]=" + this.value;
          }
        });
        if (!jobsSelected) {
          alert('Please select job(s) to process');
          return true;
        } else {
          document.location = url;
        }
      }
      function moveJobsToFolder() {
        var folderId = document.moveJobsToFolderForm.folderId[document.moveJobsToFolderForm.folderId.selectedIndex].value;
        var url = "addToFolder.php?folder=Job&forwardTo=listJobs.php&folderId="+folderId;
        var jobsSelected = false;
        $('input:checkbox').each(function() {
          if (this.checked) {
            jobsSelected = true;
            url += "&id[]=" + this.value;
          }
        });
        if (!jobsSelected) {
          alert('Please select job(s) to move');
          return true;
        } else {
          document.location = url;
        }
      }


      $(document).ready(function() {
        $('input#toggleAllDisplayedJobs').click(function() {
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
          <table style="border-collapse:collapse" width="100%" border="0">
            <tr>
              <td><h2 class="cufon-dincond_black">Jobs</h2>
                <form name="folderForm" action="">
                <a href="listFolders.php?folder=Job"><b>Folder:</b></a> <select name="folderId" onchange="document.folderForm.submit();">
                  <?php echo smarty_function_html_select_tree(array('permission'=>@PERMISSION_READ,'shares'=>$_smarty_tpl->getVariable('shares')->value,'tree'=>$_smarty_tpl->getVariable('folderTree')->value,'selected'=>$_smarty_tpl->getVariable('folderId')->value),$_smarty_tpl);?>

                </select>
                </form>
              </td>
              <td align="right" valign="top" nowrap="true">
                <form action="">
                  <input type="hidden" name="currentPage" value="<?php echo $_smarty_tpl->getVariable('currentPage')->value;?>
">
                  Filter: <select name="filterField">
                  <option></option>
                  <option <?php if ($_smarty_tpl->getVariable('jobsFilterField')->value=='Label'){?> selected="true"<?php }?>>Label</option>
                  <option <?php if ($_smarty_tpl->getVariable('jobsFilterField')->value=='WPTScript.Label'){?> selected="true"<?php }?> value="WPTScript.Label">
                    Scipt
                  </option>
                  <option <?php if ($_smarty_tpl->getVariable('jobsFilterField')->value=='Host'){?> selected="true"<?php }?>>Host</option>
                  <option <?php if ($_smarty_tpl->getVariable('jobsFilterField')->value=='Location'){?> selected="true"<?php }?>>Location</option>
                </select>
                  <input type="text" name="filterValue" value="<?php echo $_smarty_tpl->getVariable('jobsFilterValue')->value;?>
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
                <?php if ($_smarty_tpl->getVariable('showInactiveJobs')->value){?><a href="?showInactiveJobs=false">Hide Inactive Jobs</a><?php }else{ ?><a
                    href="?showInactiveJobs=true">Show Inactive Jobs</a><?php }?>
              </td>
            </tr>
          </table>
          <table id="monitoringJobList" class="pretty" width="100%">
            <tr>
              <th>
                <a href="?orderBy=Active"><?php if ($_smarty_tpl->getVariable('orderJobsBy')->value=="Active"){?><b><?php }?>Act</a><?php if ($_smarty_tpl->getVariable('orderJobsBy')->value=="Active"){?></b>
                <a href="?orderBy=Active&orderByDir=<?php echo $_smarty_tpl->getVariable('orderJobsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderJobsByDirection')->value=="ASC"){?><img
                    width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
                </a><?php }?><br>
              </th>
              <th align="center"><input type="checkbox" id="toggleAllDisplayedJobs" onchange="toggleSelectedJobs();">
              </th>
              <th align="left" colspan="2">
              <?php if ($_smarty_tpl->getVariable('folderId')->value==-1){?>Folder<br><?php }?>
                <a href="?orderBy=Label"><?php if ($_smarty_tpl->getVariable('orderJobsBy')->value=="Label"){?><b><?php }?>Label</a><?php if ($_smarty_tpl->getVariable('orderJobsBy')->value=="Label"){?></b><a
                  href="?orderBy=Label&orderByDir=<?php echo $_smarty_tpl->getVariable('orderJobsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderJobsByDirection')->value=="ASC"){?><img
                  width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
              </a><?php }?><br>
                <a href="?orderBy=WPTScript.Label"><?php if ($_smarty_tpl->getVariable('orderJobsBy')->value=="WPTScript.Label"){?><b><?php }?>
                  Script</a><?php if ($_smarty_tpl->getVariable('orderJobsBy')->value=="WPTScript.Label"){?></b><a
                  href="?orderBy=WPTScript.Label&orderByDir=<?php echo $_smarty_tpl->getVariable('orderJobsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderJobsByDirection')->value=="ASC"){?>
                <img width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
              </a><?php }?>
              </th>
              <th align="left">
                <a href="?orderBy=Host"><?php if ($_smarty_tpl->getVariable('orderJobsBy')->value=="Host"){?><b><?php }?>Host</a><?php if ($_smarty_tpl->getVariable('orderJobsBy')->value=="Host"){?></b><a
                  href="?orderBy=Host&orderByDir=<?php echo $_smarty_tpl->getVariable('orderJobsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderJobsByDirection')->value=="ASC"){?><img
                  width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
              </a><?php }?><br>
                <a href="?orderBy=Location"><?php if ($_smarty_tpl->getVariable('orderJobsBy')->value=="Location"){?><b><?php }?>
                  Location</a><?php if ($_smarty_tpl->getVariable('orderJobsBy')->value=="Location"){?></b><a
                  href="?orderBy=Location&orderByDir=<?php echo $_smarty_tpl->getVariable('orderJobsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderJobsByDirection')->value=="ASC"){?><img
                  width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
              </a><?php }?>
              </th>
              <th>
                <a title="Frequency in minutes" href="?orderBy=Frequency"><?php if ($_smarty_tpl->getVariable('orderJobsBy')->value=="Frequency"){?><b><?php }?>
                  Freq</a><?php if ($_smarty_tpl->getVariable('orderJobsBy')->value=="Frequency"){?></b><a
                  href="?orderBy=Frequency&orderByDir=<?php echo $_smarty_tpl->getVariable('orderJobsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderJobsByDirection')->value=="ASC"){?>
                <img width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
              </a><?php }?>
              </th>
              <th align="right">Runs</th>
              <th align="right">Total</th>
              <th align="right">Alerts</th>
              <th align="right">
                <a title="LastRun in minutes" href="?orderBy=LastRun"><?php if ($_smarty_tpl->getVariable('orderJobsBy')->value=="LastRun"){?><b><?php }?>
                  Last</a><?php if ($_smarty_tpl->getVariable('orderJobsBy')->value=="LastRun"){?></b><a
                  href="?orderBy=LastRun&orderByDir=<?php echo $_smarty_tpl->getVariable('orderJobsByDirectionInv')->value;?>
"><?php if ($_smarty_tpl->getVariable('orderJobsByDirection')->value=="ASC"){?><img
                  width="10" height="10" src='img/Up.png'><?php }else{ ?><img width="10" height="10" src='img/Down.png'><?php }?>
              </a><?php }?>
              </th>
              <th colspan="6" align="center">Actions</th>
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
                <?php if (hasPermission("WPTJob",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_UPDATE)){?>
                <a title="Toggle Active/Inactive" href=toggleJobActive.php?job_id[]=<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
&state=<?php echo $_smarty_tpl->tpl_vars['res']->value['Active'];?>
><?php }?>
                <?php if ($_smarty_tpl->tpl_vars['res']->value['Active']){?>
                  <img src="img/playing.png" width="20" height="20">
                <?php }else{ ?>
                  <img src="img/paused.png" width="20" height="20">
                <?php }?></a>
                </td>
                <td align="center"><input type="checkbox" name="selectedJob" id="selectedJob" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
"></td>
                <td colspan="2" nowrap="true">
                <?php if ($_smarty_tpl->getVariable('folderId')->value==-1){?><a href=listJobs.php?folderId=<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTJobFolder']['id'];?>
><?php echo $_smarty_tpl->tpl_vars['res']->value['WPTJobFolder']['Label'];?>
</a> <br><?php }?>
                  <a href=listResults.php?folderId=<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTJobFolderId'];?>
filterField=WPTJob.Id&filterValue=<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
><?php echo smarty_modifier_truncate($_smarty_tpl->tpl_vars['res']->value['Label'],60);?>
</a><br>
                  <?php if (hasPermission("WPTScript",$_smarty_tpl->tpl_vars['res']->value['WPTScript']['WPTScriptFolderId'],@PERMISSION_UPDATE)){?>
                  <a href=editScript.php?id=<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTScript']['Id'];?>
><?php }?><?php echo smarty_modifier_truncate($_smarty_tpl->tpl_vars['res']->value['WPTScript']['Label'],60);?>
</a></td>
                <td><?php echo $_smarty_tpl->tpl_vars['res']->value['Host'];?>
<br><?php echo $_smarty_tpl->tpl_vars['res']->value['Location'];?>
</td>
                <td align="right"><?php echo $_smarty_tpl->tpl_vars['res']->value['Frequency'];?>
</td>
                <td align="right"><?php echo $_smarty_tpl->tpl_vars['res']->value['Runs'];?>
<?php if (!$_smarty_tpl->tpl_vars['res']->value['FirstViewOnly']){?>R<?php }?></td>
                <td align="right"><?php echo $_smarty_tpl->tpl_vars['res']->value['ResultCount'];?>
</td>
                <td align="right"><?php echo sizeof($_smarty_tpl->tpl_vars['res']->value['WPTJob_Alert']);?>
</td>
                <td align="right"><?php echo smarty_modifier_date_format($_smarty_tpl->tpl_vars['res']->value['Lastrun'],"%D");?>
<br><?php echo smarty_modifier_date_format($_smarty_tpl->tpl_vars['res']->value['Lastrun'],"%H:%M");?>
</td>
                <td align="right">
                  <table>
                    <tr>
                    <?php if (hasPermission("WPTJob",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_UPDATE)){?>
                      <form action="editJob.php">
                        <input type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                        <input type="hidden" name="folderId" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTJobFolderId'];?>
">
                        <td style="padding:1px">
                          <input class="actionIcon" type="image" src="img/edit_icon.png" title="Edit" alt="Edit" value="Edit">
                        </td>
                      </form>
                    <?php }?>
                    <?php if (hasPermission("WPTJob",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_CREATE_DELETE)){?>
                      <form action="deleteJob.php" name="deleteJob" onsubmit="return confirm('Confirm Deletion')">
                        <input type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                        <td style="padding:1px">
                          <input class="actionIcon" type="image" title="Delete" src="img/delete_icon.png" value="Del">
                        </td>
                      </form>
                    <?php }?>
                    <?php if (hasPermission("WPTJob",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_CREATE_DELETE)){?>
                      <form action="copyJob.php" name="copyJob" onsubmit="return confirm('Confirm Copy')">
                        <input type="hidden" name="id" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                        <input type="hidden" name="folderId" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['WPTJobFolderId'];?>
">
                        <td style="padding:1px">
                          <input class="actionIcon" type="image" src="img/copy_icon.png" title="Copy" value="Copy">
                        </td>
                      </form>
                    <?php }?>
                      <td style="padding:1px">
                      <?php if (hasPermission("WPTJob",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_READ)){?>
                        <form action="flashGraph.php">
                          <input class="actionIcon" type="image" src="img/graph_icon.png" title="Graph" value="Graph"/>
                          <input type="hidden" name="fields[]" value=FV_Doc>
                          <input type="hidden" name="job_id[]" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                        </form>
                      <?php }?>
                      </td>
                      <td style="padding:1px">
                      <?php if (hasPermission("WPTJob",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_EXECUTE)){?>
                        <form action="processJob.php">
                          <input type="hidden" name=force value=on>
                          <input type="hidden" name=priority value=1>
                          <input type="hidden" name="job_id[]" value="<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
">
                          <input type="hidden" name="forward_to"
                                 value="listResults.php?orderBy=Date&orderByDir=DESC&filterField=WPTJob.Id&filterValue=<?php echo $_smarty_tpl->tpl_vars['res']->value['Id'];?>
"/>
                          <input class="actionIcon" type="image" src="img/execute_icon.png" title="Execute job now."
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
              <td colspan="25" valign="top">
                <table width="100%" border="0">
                  <tr>
                    <td align="left" nowrap="true">
                  <?php if (hasPermission("WPTJob",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_EXECUTE)){?>
                      <input onclick="processJobs();" type="submit" value="Execute Job(s)">
                  <?php }?>
                  <?php if (hasPermission("WPTJob",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_UPDATE)){?>
                      <input onclick="toggleJobActive();" type="submit" value="Toggle Active">
                  <?php }?>
                      <input onclick="compareFilmstrips();" type="button" value="Compare Filmstrips">
                    <?php if (hasPermission("WPTJob",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_OWNER)){?>
                      <p><form name="moveJobsToFolderForm">
                        <input type="button" value="Move to folder" onclick="moveJobsToFolder()">
                        <select name="folderId">
                          <?php echo smarty_function_html_select_tree(array('tree'=>$_smarty_tpl->getVariable('folderTree')->value),$_smarty_tpl);?>

                        </select>
                      </form>
                    <?php }?>
                    </td>
                    <td align="right" valign="top">
                    <?php if (hasPermission("WPTJob",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_CREATE_DELETE)){?>
                      <form action="editJob.php">
                        <input type="hidden" name="folderId" value="<?php echo $_smarty_tpl->getVariable('folderId')->value;?>
">
                        <input type="submit" value="Add New Monitoring Job">
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
