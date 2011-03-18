<?php /* Smarty version Smarty-3.0.6, created on 2011-01-31 18:39:31
         compiled from "templates\script/addScript.tpl" */ ?>
<?php /*%%SmartyHeaderCode:58294d475643a591c4-35052862%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    'da029c7c396f30e12e7c94600a56740d06fd657b' => 
    array (
      0 => 'templates\\script/addScript.tpl',
      1 => 1293737691,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '58294d475643a591c4-35052862',
  'function' => 
  array (
  ),
  'has_nocache_code' => false,
)); /*/%%SmartyHeaderCode%%*/?>
<?php if (!is_callable('smarty_function_html_select_tree')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\function.html_select_tree.php';
?><!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
    "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  <?php $_template = new Smarty_Internal_Template("headIncludes.tpl", $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
  <title>WPT Script</title>
  
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

          <h2 class="cufon-dincond_black">Script</h2>

          <div class="translucent">
            <?php if ($_smarty_tpl->getVariable('script')->value['Id']>-1){?>
            <?php $_smarty_tpl->tpl_vars["requiredPermission"] = new Smarty_variable(@PERMISSION_UPDATE, null, null);?>
            <?php }else{ ?>
            <?php $_smarty_tpl->tpl_vars["requiredPermission"] = new Smarty_variable(@PERMISSION_CREATE_DELETE, null, null);?>
            <?php }?>
            <form method="post" class="cmxform" action="updateScript.php" id="updateForm">
              <input type="hidden" name="id" value="<?php echo $_smarty_tpl->getVariable('script')->value['Id'];?>
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
                  <td align="right"><label for="label">Label</label></td>
                  <td><input type="text" size="80" name="label" id="label" value="<?php echo $_smarty_tpl->getVariable('script')->value['Label'];?>
" class="required">
                  </td>
                </tr>
                <tr>
                  <td align="right"><label for="description">Description</label></td>
                  <td><textarea id="description" name="description"
                                style="height:30px;width:500px"><?php echo $_smarty_tpl->getVariable('script')->value['Description'];?>
</textarea></td>
                </tr>
                <tr>
                  <td align="right"><label for="url">URL</label></td>
                  <td><input type="text" id="url" name="url" value="<?php echo $_smarty_tpl->getVariable('script')->value['URL'];?>
" class="required url"
                             style="width:500px;"></td>
                </tr>
                <tr>
                  <td align="right"><label for="urlscript">Data Script</label></td>
                  <td><textarea id="urlscript" name="urlscript"
                                style="height:80px;width:500px"><?php echo $_smarty_tpl->getVariable('script')->value['URLScript'];?>
</textarea></td>
                </tr>
                <tr>
                  <td align="right"><label for="navigationscript">Navigation Script</label></td>
                  <td><textarea id="navigationscript" name="navigationscript"
                                style="height:180px;width:500px"><?php echo $_smarty_tpl->getVariable('script')->value['NavigationScript'];?>
</textarea></td>
                </tr>
                <tr>
                  <td></td>
                  <td>
                    <hr>
                  </td>
                </tr>
                <tr>
                  <td align="right"><label><a class="tooltip" name="multistep">Multi
                    Step<span>Multi Step/Page Test</span></a></label></span></td>
                  <td><input type="checkbox" name="multistep" value="1" <?php if ($_smarty_tpl->getVariable('script')->value['MultiStep']){?>checked="true" <?php }?>/>
                  </td>
                </tr>
                <tr>
                  <td></td>
                  <td>
                    <hr>
                  </td>
                </tr>
                <tr>
                  <td align="right"><label><a class="tooltip" name="validate">Validate<span>Apply validation rule</span></a></label></span>
                  </td>
                  <td><input type="checkbox" name="validate" value="1" <?php if ($_smarty_tpl->getVariable('script')->value['Validate']){?>checked="true" <?php }?>/></td>
                </tr>
                <tr>
                  <td align="right"><label for="validationrequest">Validation Request</label></td>
                  <td><input type="text" id="validationrequest" name="validationrequest" size="120"
                             value="<?php echo $_smarty_tpl->getVariable('script')->value['ValidationRequest'];?>
"></td>
                </tr>
                <tr>
                  <td align="right"><label for="validationtype">Validation Type</label></td>
                  <td>
                    <select id="validationtype" name="validationtype">
                      <option value="0" <?php if ($_smarty_tpl->getVariable('script')->value['ValidationType']=='0'){?>selected="true"<?php }?>></option>
                      <option value="1" <?php if ($_smarty_tpl->getVariable('script')->value['ValidationType']=='1'){?>selected="true"<?php }?>>Matches</option>
                      <option value="2" <?php if ($_smarty_tpl->getVariable('script')->value['ValidationType']=='2'){?>selected="true"<?php }?>>Does not Match</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td align="right"><label for="validationmarkas">Mark As</label></td>
                  <td>
                    <select id="validationmarkas" name="validationmarkas">
                      <option value="0" <?php if ($_smarty_tpl->getVariable('script')->value['ValidationMarkAs']=='0'){?>selected="true"<?php }?>></option>
                      <option value="1" <?php if ($_smarty_tpl->getVariable('script')->value['ValidationMarkAs']=='1'){?>selected="true"<?php }?>>Valid</option>
                      <option value="2" <?php if ($_smarty_tpl->getVariable('script')->value['ValidationMarkAs']=='2'){?>selected="true"<?php }?>>Invalid</option>
                      <option value="3" <?php if ($_smarty_tpl->getVariable('script')->value['ValidationMarkAs']=='3'){?>selected="true"<?php }?>>Needs Review</option>
                    </select>
                  </td>
                </tr>
                <tr>
                <tr>
                  <td align="right"><label for="validationmarkaselse">Else Mark As</label></td>
                  <td>
                    <select id="validationmarkaselse" name="validationmarkaselse">
                      <option value="0" <?php if ($_smarty_tpl->getVariable('script')->value['ValidationMarkAsElse']=='0'){?>selected="true"<?php }?>></option>
                      <option value="1" <?php if ($_smarty_tpl->getVariable('script')->value['ValidationMarkAsElse']=='1'){?>selected="true"<?php }?>>Valid</option>
                      <option value="2" <?php if ($_smarty_tpl->getVariable('script')->value['ValidationMarkAsElse']=='2'){?>selected="true"<?php }?>>Invalid</option>
                      <option value="3" <?php if ($_smarty_tpl->getVariable('script')->value['ValidationMarkAsElse']=='3'){?>selected="true"<?php }?>>Needs Review
                      </option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td></td>
                  <td>
                    <hr>
                  </td>
                </tr>
                <tr>
                  <td align="right"><label><a
                      class="tooltip">Authenticate<span>Provide authentication information</span></a></label></td>
                  <td><input type="checkbox" name="authenticate" value="1"
                             <?php if ($_smarty_tpl->getVariable('script')->value['Authenticate']){?>checked="true" <?php }?>/></td>
                </tr>
                <tr>
                  <td align="right"><label for="authuser">Username</label></td>
                  <td><input autocomplete="off" type="text" id="authuser" name="authuser" size="40"
                             value="<?php echo $_smarty_tpl->getVariable('script')->value['AuthUser'];?>
"></td>
                </tr>
                <tr>
                <tr>
                  <td align="right"><label for="authpassword">Password</label></td>
                  <td><input autocomplete="off" type="password" id="authpassword" name="authpassword" size="40"
                             value="<?php echo $_smarty_tpl->getVariable('script')->value['AuthPassword'];?>
"></td>
                </tr>
                <tr>
                  <td></td>
                  <td><input type="submit" value="Save"></td>
                </tr>
              </table>
            </form>
          </div>
        </div>
      </div>
    </div>
</body>
</html>
