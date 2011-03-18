<?php /* Smarty version Smarty-3.0.6, created on 2011-03-15 13:52:00
         compiled from "templates\job/addJobForm.tpl" */ ?>
<?php /*%%SmartyHeaderCode:145684d7fd1702842c5-36855074%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    'e04fe421912e61be246876e6d11f6ddb2f41b282' => 
    array (
      0 => 'templates\\job/addJobForm.tpl',
      1 => 1300222318,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '145684d7fd1702842c5-36855074',
  'function' => 
  array (
  ),
  'has_nocache_code' => false,
)); /*/%%SmartyHeaderCode%%*/?>
<?php if (!is_callable('smarty_function_html_select_tree')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\function.html_select_tree.php';
if (!is_callable('smarty_function_html_options')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\function.html_options.php';
?>
    <script type="text/javascript">
      $().ready(function() {
        $('#remove').click(function() {
          return !$('#alerts option:selected').remove().appendTo('#availableAlerts');
        });
        $('#add').click(function() {
          return !$('#availableAlerts option:selected').remove().appendTo('#alerts');
        });
      });
    </script>

    <script>
      var allowUpdate = true;
      function updateJobCount() {
        maxJobsPerMonth = document.getElementById('maxJobsPerMonth').value;

        numberOfRuns = document.getElementById('numberofruns');
        numberOfRunsIdx = numberOfRuns.selectedIndex;
        numberOfRunsValue = numberOfRuns[numberOfRunsIdx].value;

        frequency = document.getElementById('jobFrequency');
        frequencyIdx = frequency.selectedIndex;
        frequencyValue = frequency[frequencyIdx].value;

        jobCount = numberOfRunsValue * (43200 / frequencyValue);
        currentJobCount = parseInt(document.getElementById('currentJobCountInitial').value) + jobCount;
        document.getElementById('currentJobCount').value = currentJobCount;
        if (currentJobCount > maxJobsPerMonth) {
          allowUpdate = false;
          document.getElementById('currentJobCount').style.color = "red";
        } else {
          document.getElementById('currentJobCount').style.color = "";
          allowUpdate = true;
        }
      }
      function validateUpdateForm() {
        jobActive = document.getElementById('active').value;
        $('#alerts option').each(function(i) {
          $(this).attr("selected", "selected");
        });

        if (!allowUpdate)
          if (!jobActive) {
            alert('Warning: Maximum allowed job count exceeded. You will not be able to activate this job unless other jobs are deactivated.');
            return true;
          } else {
            resp = confirm('Maximum allowed job count exceeded. You can disable this job and save your changes, but you will not be able to activate this job until others jobs are deactivated. Do you wish to deactivate this job and save?');
            if (resp) {
              document.getElementById('active').checked = false;
            }
            return resp;
          }
      }
      $(document).ready(function() {
        $("#updateForm").validate();
      });
    </script>
  
<div class="translucent" align="center">
  
<?php if ($_smarty_tpl->getVariable('job')->value['Id']>-1){?>
  <?php $_smarty_tpl->tpl_vars["requiredPermission"] = new Smarty_variable(@PERMISSION_UPDATE, null, null);?>
<?php }else{ ?>
  <?php $_smarty_tpl->tpl_vars["requiredPermission"] = new Smarty_variable(@PERMISSION_CREATE_DELETE, null, null);?>
<?php }?>
<form method="post" class="cmxform" action="updateJob.php" name="updateForm" id="updateForm"
      onsubmit="return validateUpdateForm()">
  <input type="hidden" name="id" value="<?php echo $_smarty_tpl->getVariable('job')->value['Id'];?>
">
  <table align="center">
    <tr>
      <td align="right"><label>Folder</label></td>
      <td>
      <select name="folderId" <?php if (hasPermission("WPTJob",$_smarty_tpl->getVariable('folderId')->value,@PERMISSION_UPDATE)){?><?php }else{ ?>disabled<?php }?>>
          <?php echo smarty_function_html_select_tree(array('permission'=>$_smarty_tpl->getVariable('requiredPermission')->value,'shares'=>$_smarty_tpl->getVariable('shares')->value,'tree'=>$_smarty_tpl->getVariable('folderTree')->value,'selected'=>$_smarty_tpl->getVariable('folderId')->value),$_smarty_tpl);?>

      </select>
      </td>
    </tr>
    <tr>
      <td align="right">
        <label for="active">Active</label></td>
      <td><input type="checkbox" id="active" value="1" name="active" <?php if ($_smarty_tpl->getVariable('job')->value['Active']){?>checked="true"<?php }?>>
      </td>
    </tr>
    <tr>
      <td align="right"><label for="label">Label</label></td>
      <td><input type="text" name="label" id="label" value="<?php echo $_smarty_tpl->getVariable('job')->value['Label'];?>
" size="60" class="required"></td>
    </tr>
    <tr>
      <td valign="top" align="right"><label for="description">Description</label></td>
      <td><textarea id="description" name="description"
                    style="height:40px;width:500px"><?php echo $_smarty_tpl->getVariable('job')->value['Description'];?>
</textarea></td>
    </tr>
    <tr>
      <td align="right"><label>Script</label></td>
      <td><select name="script" style="width:500px;" <?php if ($_smarty_tpl->getVariable('canChangeScript')->value){?><?php }else{ ?>disabled="true" <?php }?>>
        <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->getVariable('scripts')->value,'selected'=>$_smarty_tpl->getVariable('job')->value['WPTScriptId']),$_smarty_tpl);?>

      </select>
        <a href="editScript.php?">New Script</a></td>
    </tr>
    <tr>
      <td colspan="4">
        <hr>
      </td>
    </tr>
    <tr>
      <td valign="top" align="right"><label for="alerts"><br>Alert</label></td>
      <td nowrap="true">
        <div style="float:left;">
          Selected<br>
          <select style="width:280px;height:100px;" name="alerts[]" multiple id="alerts">
            <?php  $_smarty_tpl->tpl_vars['v'] = new Smarty_Variable;
 $_smarty_tpl->tpl_vars['k'] = new Smarty_Variable;
 $_from = $_smarty_tpl->getVariable('alerts')->value; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array');}
if ($_smarty_tpl->_count($_from) > 0){
    foreach ($_from as $_smarty_tpl->tpl_vars['v']->key => $_smarty_tpl->tpl_vars['v']->value){
 $_smarty_tpl->tpl_vars['k']->value = $_smarty_tpl->tpl_vars['v']->key;
?>
            <?php if ($_smarty_tpl->tpl_vars['v']->value['Selected']){?>
              <option <?php if ($_smarty_tpl->tpl_vars['v']->value['Active']){?><?php }else{ ?>style="color:red;"
                      title="This job is not currently enabled." <?php }?> value="<?php echo $_smarty_tpl->tpl_vars['v']->value['Id'];?>
"><?php echo $_smarty_tpl->tpl_vars['v']->value['Label'];?>
</option>
            <?php }?>
            <?php }} ?>
          </select>
        </div>
        <div align="center" style="vertical-align:middle;float:left;padding:10px">
          <br><input type="image" id="add" src="img/Back.png" class="actionIcon">
          <br><input type="image" src="img/Forward.png" id="remove" class="actionIcon">
        </div>
        <div>
          Available Alerts ( Red indicates alert is not active )<br>
          <select style="width:280px;height:100px;" multiple id="availableAlerts">
            <?php  $_smarty_tpl->tpl_vars['v'] = new Smarty_Variable;
 $_smarty_tpl->tpl_vars['k'] = new Smarty_Variable;
 $_from = $_smarty_tpl->getVariable('alerts')->value; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array');}
if ($_smarty_tpl->_count($_from) > 0){
    foreach ($_from as $_smarty_tpl->tpl_vars['v']->key => $_smarty_tpl->tpl_vars['v']->value){
 $_smarty_tpl->tpl_vars['k']->value = $_smarty_tpl->tpl_vars['v']->key;
?>
            <?php if (!$_smarty_tpl->tpl_vars['v']->value['Selected']){?>
              <option <?php if ($_smarty_tpl->tpl_vars['v']->value['Active']){?><?php }else{ ?>style="color:red;"
                      title="This job is not currently enabled." <?php }?> value="<?php echo $_smarty_tpl->tpl_vars['v']->value['Id'];?>
"><?php echo $_smarty_tpl->tpl_vars['v']->value['Label'];?>
</option>
            <?php }?>
            <?php }} ?>
          </select>
        </div>
    </tr>
    <tr>
      <td colspan="4">
        <hr>
      </td>
    </tr>
    <tr>
      <td align="right">
        <label title="Instruct the target WPT host to include only the first view">First View Only</label>
      </td>
      <td>
        <input type="checkbox" name="firstviewonly" value="on" <?php if ($_smarty_tpl->getVariable('job')->value['FirstViewOnly']){?>checked="true" <?php }?>/></td>
    </tr>
    <tr>
      <td align="right">
        <label title="Instruct the target WPT host to capture video and filmstrip">Capture Video</label>
      </td>
      <td><input type="checkbox" name="video" value="on" <?php if ($_smarty_tpl->getVariable('job')->value['Video']){?>checked="true" <?php }?>/></td>
    </tr>
    <tr>
      <td align="right" nowrap="true">
        <label title="Downlaod summary result information in XML">Download Result XML</label>
      </td>
      <td><input type="checkbox" name="downloadresultxml" value="true"
                 <?php if ($_smarty_tpl->getVariable('job')->value['DownloadResultXml']){?>checked="true" <?php }?>/></td>
    </tr>
    <tr>
      <td align="right"><a class="tooltip"><label>Download Details</label><span>Download all assets for results, filmstrip, detail request info, etc.</span>
      </td>
      <td><input type="checkbox" name="downloaddetails" value="true"
                 <?php if ($_smarty_tpl->getVariable('job')->value['DownloadDetails']){?>checked="true" <?php }?>/></td>
    </tr>
    <tr>
      <td align="right" nowrap="true"><label for="maxdownloadattempts">Max Download Attempts</label></td>
      <td><input type="text" name="maxdownloadattempts" id="maxdownloadattempts"
                 value="<?php echo $_smarty_tpl->getVariable('job')->value['MaxDownloadAttempts'];?>
" class="required number" maxlength="2" size="4"></td>
    </tr>
    <tr>
      <td align="right" nowrap="true"><label for="maxJobsPerMonth">Maximum Jobs Per Month</label></td>
      <td><input id="maxJobsPerMonth" type="text" disabled="true" value="<?php echo $_smarty_tpl->getVariable('maxJobsPerMonth')->value;?>
"></td>
    </tr>
    <tr>
      <td align="right" nowrap="true"><label for="currentJobCount">Current Job Count</label></td>
      <td><input id="currentJobCount" type="text" disabled="true" value="<?php echo $_smarty_tpl->getVariable('currentJobCount')->value;?>
">
        <input style="visibility:hidden;" id="currentJobCountInitial" type="text" disabled="true"
               value="<?php echo $_smarty_tpl->getVariable('currentJobCount')->value;?>
"></td>
    </tr>
    <tr>
      <td align="right"><label for="numberofruns">Number of runs</label></td>
      <td><select name="numberofruns" id="numberofruns" onblur="updateJobCount();"
                  onkeyup="updateJobCount();" onchange="updateJobCount();">
        <option <?php if ($_smarty_tpl->getVariable('job')->value['Runs']==1){?>selected="true" <?php }?>>1</option>
        <option <?php if ($_smarty_tpl->getVariable('job')->value['Runs']==2){?>selected="true" <?php }?>>2</option>
        <option <?php if ($_smarty_tpl->getVariable('job')->value['Runs']==3){?>selected="true" <?php }?>>3</option>
      </select></td>
    </tr>
    <tr>
      <td align="right"><label for="runtouseforaverage">Run to use</label></td>
      <td><select name="runtouseforaverage" id="runtouseforaverage">
        <option value="0" <?php if ($_smarty_tpl->getVariable('job')->value['RunToUseForAverage']==0){?>selected="true" <?php }?>>Average</option>
        <option value="1" <?php if ($_smarty_tpl->getVariable('job')->value['RunToUseForAverage']==1){?>selected="true" <?php }?>>1</option>
        <option value="2" <?php if ($_smarty_tpl->getVariable('job')->value['RunToUseForAverage']==2){?>selected="true" <?php }?>>2</option>
        <option value="3" <?php if ($_smarty_tpl->getVariable('job')->value['RunToUseForAverage']==3){?>selected="true" <?php }?>>3</option>
      </select></td>
    </tr>
    <tr>
      <td align="right"><label>Location</label></td>
      <td><select name="location">
        <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->getVariable('wptLocations')->value,'selected'=>$_smarty_tpl->getVariable('selectedLocation')->value),$_smarty_tpl);?>

    </tr>
    <tr>
      <td align="right"><label>Frequency</label></td>
      <td><select id="jobFrequency" name="frequency" onblur="updateJobCount();" onkeyup="updateJobCount();"
                  onchange="updateJobCount();">
        <option <?php if ($_smarty_tpl->getVariable('job')->value['Frequency']=="5"){?> selected="true"<?php }?> value="5">5 minutes</option>
        <option <?php if ($_smarty_tpl->getVariable('job')->value['Frequency']=="10"){?> selected="true"<?php }?> value="10">10 minutes</option>
        <option <?php if ($_smarty_tpl->getVariable('job')->value['Frequency']=="15"){?> selected="true"<?php }?> value="15">15 minutes</option>
        <option <?php if ($_smarty_tpl->getVariable('job')->value['Frequency']=="20"){?> selected="true"<?php }?> value="20">20 minutes</option>
        <option <?php if ($_smarty_tpl->getVariable('job')->value['Frequency']=="30"){?> selected="true"<?php }?>value="30">30 minutes</option>
        <option <?php if ($_smarty_tpl->getVariable('job')->value['Frequency']=="60"){?> selected="true"<?php }?>value="60">1 hour</option>
        <option <?php if ($_smarty_tpl->getVariable('job')->value['Frequency']=="120"){?> selected="true"<?php }?>value="120">2 hours</option>
        <option <?php if ($_smarty_tpl->getVariable('job')->value['Frequency']=="180"){?> selected="true"<?php }?>value="180">3 hours</option>
        <option <?php if ($_smarty_tpl->getVariable('job')->value['Frequency']=="360"){?> selected="true"<?php }?>value="360">6 hours</option>
        <option <?php if ($_smarty_tpl->getVariable('job')->value['Frequency']=="720"){?> selected="true"<?php }?>value="720">12 hours</option>
        <option <?php if ($_smarty_tpl->getVariable('job')->value['Frequency']=="1440"){?> selected="true"<?php }?>value="1440">Daily</option>
      </select></td>
    </tr>
    <tr><td colspan="4"><hr></td></tr>
    <tr>
      <td align="right"><label>Bandwidth Down</label></td>
      <td align="left"><input type="text" name="bandwidthDown" value="<?php echo $_smarty_tpl->getVariable('job')->value['WPTBandwidthDown'];?>
" size="5" style="text-align:right;"> Kbps</td>
    </tr>
    <tr>
      <td align="right"><label>Bandwidth Up</label></td>
      <td align="left"><input type="text" name="bandwidthUp" value="<?php echo $_smarty_tpl->getVariable('job')->value['WPTBandwidthUp'];?>
" size="5" style="text-align:right;"> Kbps</td>
    </tr>
    <tr>
      <td align="right"><label>Bandwidth Down</label></td>
      <td align="left"><input type="text" name="bandwidthLatency" value="<?php echo $_smarty_tpl->getVariable('job')->value['WPTBandwidthLatency'];?>
" size="5" style="text-align:right;"> ms</td>
    </tr>
    <tr>
      <td align="right"><label>Packet Loss</label></td>
      <td align="left"><input type="text" name="bandwidthPacketLoss" value="<?php echo $_smarty_tpl->getVariable('job')->value['WPTBandwidthPacketLoss'];?>
" size="5" style="text-align:right;"> %</td>
    </tr>
    <tr>

      <td></td>
      <td><input type="submit" value="Save"></td>
    </tr>
  </table>
</form>
</div>