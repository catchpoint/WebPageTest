<?php /* Smarty version Smarty-3.0.6, created on 2011-01-30 14:31:53
         compiled from "templates\alert/addAlert.tpl" */ ?>
<?php /*%%SmartyHeaderCode:59784d45cab9db4cb7-27864110%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    '4442efe657f03ba5fb305e2927d27e4e02a0dec4' => 
    array (
      0 => 'templates\\alert/addAlert.tpl',
      1 => 1293735549,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '59784d45cab9db4cb7-27864110',
  'function' => 
  array (
  ),
  'has_nocache_code' => false,
)); /*/%%SmartyHeaderCode%%*/?>
<?php if (!is_callable('smarty_function_html_select_tree')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\function.html_select_tree.php';
if (!is_callable('smarty_function_html_options')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\function.html_options.php';
?><!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
    "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
 <?php $_template = new Smarty_Internal_Template("headIncludes.tpl", $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
  <title>Alert</title>
  

  <script>
  function updateAlertType(){
    var alertType = document.getElementById("alertOnType").selectedIndex;
    var alertOnResponseCode= document.getElementById("alertOnResponseCode");
    var alertOnResponseTime= document.getElementById("alertOnResponseTime");
    var alertOnValidationCode= document.getElementById("alertOnValidationCode");
    var comparisonOperator = document.getElementById("comparisonOperator");
    var alertOnValue = document.getElementById("alertOnValue");
    var alertOnValueField = document.getElementById("alertOnValueField");
    if ( alertType == 0 ){
      alertOnResponseCode.style.visibility="visible";
      alertOnResponseTime.style.visibility="hidden";
      alertOnValidationCode.style.visibility="hidden";
      comparisonOperator.style.visibility="visible";
      alertOnValue.style.visibility="hidden";
      alertOnValueField.value = "0";

    } else     if ( alertType == 1 ){
      alertOnResponseCode.style.visibility="hidden";
      alertOnResponseTime.style.visibility="visible";
      alertOnValidationCode.style.visibility="hidden";
      comparisonOperator.style.visibility="visible";
      alertOnValue.style.visibility="visible";

    } else     if ( alertType == 2 ){
      alertOnResponseCode.style.visibility="hidden";
      alertOnResponseTime.style.visibility="hidden";
      alertOnValidationCode.style.visibility="visible";
      comparisonOperator.style.visibility="visible";
      alertOnValue.style.visibility="hidden";
      alertOnValueField.value = "0";
    }
  }
  $(document).ready(function(){
    $("#updateForm").validate();
  });
  </script>

</head>
<body onload="updateAlertType()">
  <div class="page">
  <?php $_template = new Smarty_Internal_Template('header.tpl', $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
  <?php $_template = new Smarty_Internal_Template('navbar.tpl', $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
    <div id="main">
     <div class="level_2">
     <div class="content-wrap">
       <div class="content" style="height:auto;">
       <br><h2 class="cufon-dincond_black">Alert</h2>
  <div class="translucent">
  <?php if ($_smarty_tpl->getVariable('alert')->value['Id']>-1){?>
    <?php $_smarty_tpl->tpl_vars["requiredPermission"] = new Smarty_variable(@PERMISSION_UPDATE, null, null);?>
  <?php }else{ ?>
    <?php $_smarty_tpl->tpl_vars["requiredPermission"] = new Smarty_variable(@PERMISSION_CREATE_DELETE, null, null);?>
  <?php }?>
  <form method="post" class="cmxform" action="updateAlert.php" id="updateForm">
  <input type="hidden" name="id" value="<?php echo $_smarty_tpl->getVariable('alert')->value['Id'];?>
">
  <input type="hidden" name="active" value="<?php echo $_smarty_tpl->getVariable('alert')->value['Active'];?>
">
    <table>
      <tr>
        <td align="right"><label>Folder</label></td>
        <td>
        <select name="folderId">
            <?php echo smarty_function_html_select_tree(array('permission'=>$_smarty_tpl->getVariable('requiredPermission')->value,'shares'=>$_smarty_tpl->getVariable('shares')->value,'tree'=>$_smarty_tpl->getVariable('folderTree')->value,'selected'=>$_smarty_tpl->getVariable('folderId')->value),$_smarty_tpl);?>

        </select>
        </td>
      </tr>
      <tr>
        <td align="right" ><label for="label">Label</label></td>
        <td><input type="text" name="label" id="label" value="<?php echo $_smarty_tpl->getVariable('alert')->value['Label'];?>
" size="60" class="required"></td>
      </tr>
       <tr>
        <td align="right"><label for="description">Description</label></td>
        <td><textarea id="description" name="description" style="height:40px;width:500px"><?php echo $_smarty_tpl->getVariable('alert')->value['Description'];?>
</textarea></td>
      </tr>
       <tr>
        <td align="right"><label title="One address per line." for="emailaddresses">Email Addresses</label></td>
        <td><textarea id="emailaddresses" name="emailaddresses" style="height:40px;width:500px"><?php echo $_smarty_tpl->getVariable('alert')->value['EmailAddresses'];?>
</textarea></td>
      </tr>
     <tr>
        <td align="right"><label for="alertontype">Type of Alert</label></td>
        <td><select name="alertOnType" id="alertOnType" onchange="updateAlertType()">
         <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertOnType']=='Response Code'){?>selected="true" <?php }?>>Response Code</option>
         <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertOnType']=='Response Time'){?>selected="true" <?php }?>>Response Time</option>
         <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertOnType']=='Validation Code'){?>selected="true" <?php }?>>Validation Code</option>
          </select></td>
      </tr>
      <tr>
        <td align="right"><label>Alert On</label></td>
        <td style="padding-bottom:2em;">
        <div id="alertOnResponseTime" style="visibility:hidden;position:absolute;">
          <select name="alertOnResponseTime" >
            <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertOn']=='AvgFirstViewFirstByte'){?>selected="true" <?php }?> value="AvgFirstViewFirstByte">Time to first byte</option>
            <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertOn']=='AvgFirstViewStartRender'){?>selected="true" <?php }?>value="AvgFirstViewStartRender">Start render</option>
            <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertOn']=='AvgFirstViewDocCompleteTime'){?>selected="true" <?php }?>value="AvgFirstViewDocCompleteTime">Document loaded</option>
            <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertOn']=='AvgFirstViewDomTime'){?>selected="true" <?php }?>value="AvgFirstViewDomTime">Dom marker</option>
            <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertOn']=='AvgFirstViewFullyLoadedTime'){?>selected="true" <?php }?>value="AvgFirstViewFullyLoadedTime">Fully Loaded</option>
         </select>
         </div>
         <div id="alertOnValidationCode" style="visibility:hidden;position:absolute;">
           <select name="alertOnValidationCode" >
            <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertOn']=='1'){?>selected="true" <?php }?>value="1">Valid</option>
            <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertOn']=='2'){?>selected="true" <?php }?>value="2">Invalid</option>
            <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertOn']=='3'){?>selected="true" <?php }?>value="3">Needs Review</option>
          </select>
         </div>
         <div id="alertOnResponseCode" style="visibility:hidden;position:absolute;">
             <select name="alertOnResponseCode" >
               <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->getVariable('wptResultStatusCodes')->value,'selected'=>$_smarty_tpl->getVariable('alert')->value['AlertOn']),$_smarty_tpl);?>

            </select>
         </div>
         </td>
       </tr>
      <tr id="comparisonOperator">
        <td align="right"><label for="alertoncomparator">Comparison Operator</label></td>
        <td><select name="alertOnComparator" id="alertoncomparator">
         <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertOnComparator']=='equals'){?>selected="true" <?php }?>>equals</option>
         <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertOnComparator']=='not equals'){?>selected="true" <?php }?>>not equals</option>
         <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertOnComparator']=='greater than'){?>selected="true" <?php }?>>greater than</option>
         <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertOnComparator']=='less than'){?>selected="true" <?php }?>>less than</option>
          </select></td>
      </tr>
      <tr id="alertOnValue">
        <td align="right"><label for="alertonvalue">Alert On Value</label></td>
        <td>
          <input type="text" id="alertOnValueField" name="alertOnValue"  value="<?php echo $_smarty_tpl->getVariable('alert')->value['AlertOnValue'];?>
" class="required number"> Seconds
         </td>
       </tr>
     <tr>
        <td align="right"><label for="alertthreshold">Alert Threshold</label></td>
        <td>
        <select name="alertThreshold" id="alertthreshold">
          <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertThreshold']==1){?>selected="true" <?php }?>>1</option>
          <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertThreshold']==2){?>selected="true" <?php }?>>2</option>
          <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertThreshold']==3){?>selected="true" <?php }?>>3</option>
          <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertThreshold']==4){?>selected="true" <?php }?>>4</option>
          <option <?php if ($_smarty_tpl->getVariable('alert')->value['AlertThreshold']==5){?>selected="true" <?php }?>>5</option>
          </select></td>
      </tr>

      <tr>
        <td></td>
        <td>
            <input type="submit" value="Save"></td>
      </tr>
    </table>
  </form>
  </div>
  </div>
  </div>
</div>
</body>
</html>
