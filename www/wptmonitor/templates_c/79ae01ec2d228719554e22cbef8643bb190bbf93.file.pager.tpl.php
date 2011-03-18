<?php /* Smarty version Smarty-3.0.6, created on 2011-01-29 14:11:12
         compiled from "templates\pager.tpl" */ ?>
<?php /*%%SmartyHeaderCode:321114d447460968f07-66608295%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    '79ae01ec2d228719554e22cbef8643bb190bbf93' => 
    array (
      0 => 'templates\\pager.tpl',
      1 => 1290032274,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '321114d447460968f07-66608295',
  'function' => 
  array (
  ),
  'has_nocache_code' => false,
)); /*/%%SmartyHeaderCode%%*/?>

<script type="text/javascript">
    function changeResultsPerPage(count){
    originalLocation = "<?php echo $_SERVER['REQUEST_URI'];?>
";
  loc = RemoveParameterFromUrl(originalLocation, "currentPage");

  if (loc.indexOf("?") > -1) {
    loc = loc + "&";
  } else {
    loc = loc + "?";
  }
    loc = loc + "resultsPerPage="+count.value;
  document.location = loc;
}
    function changePage(pager){
    originalLocation = "<?php echo $_SERVER['REQUEST_URI'];?>
";
  loc = RemoveParameterFromUrl(originalLocation, "currentPage");

  if (loc.indexOf("?") > -1) {
    loc = loc + "&";
  } else {
    loc = loc + "?";
  }
  selected = pager.selectedIndex;
    loc = loc + "currentPage="+pager[selected].value;
  document.location = loc;
}

function RemoveParameterFromUrl(url, parameter) {

  var urlparts = url.split('?');
  if (urlparts.length >= 2) {

    var prefix = encodeURIComponent(parameter) + '=';
    var pars = urlparts[1].split(/[&;]/g);
    for (var i = pars.length; i-- > 0;)
      if (pars[i].lastIndexOf(prefix, 0) !== -1)
        pars.splice(i, 1);
    url = urlparts[0] + '?' + pars.join('&');

  }
  return url;
}
</script>


Page <select name="pager" onchange="changePage(this);"><?php unset($_smarty_tpl->tpl_vars['smarty']->value['section']['res']);
$_smarty_tpl->tpl_vars['smarty']->value['section']['res']['name'] = 'res';
$_smarty_tpl->tpl_vars['smarty']->value['section']['res']['loop'] = is_array($_loop=$_smarty_tpl->getVariable('maxpages')->value) ? count($_loop) : max(0, (int)$_loop); unset($_loop);
$_smarty_tpl->tpl_vars['smarty']->value['section']['res']['show'] = true;
$_smarty_tpl->tpl_vars['smarty']->value['section']['res']['max'] = $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['loop'];
$_smarty_tpl->tpl_vars['smarty']->value['section']['res']['step'] = 1;
$_smarty_tpl->tpl_vars['smarty']->value['section']['res']['start'] = $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['step'] > 0 ? 0 : $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['loop']-1;
if ($_smarty_tpl->tpl_vars['smarty']->value['section']['res']['show']) {
    $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['total'] = $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['loop'];
    if ($_smarty_tpl->tpl_vars['smarty']->value['section']['res']['total'] == 0)
        $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['show'] = false;
} else
    $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['total'] = 0;
if ($_smarty_tpl->tpl_vars['smarty']->value['section']['res']['show']):

            for ($_smarty_tpl->tpl_vars['smarty']->value['section']['res']['index'] = $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['start'], $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['iteration'] = 1;
                 $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['iteration'] <= $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['total'];
                 $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['index'] += $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['step'], $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['iteration']++):
$_smarty_tpl->tpl_vars['smarty']->value['section']['res']['rownum'] = $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['iteration'];
$_smarty_tpl->tpl_vars['smarty']->value['section']['res']['index_prev'] = $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['index'] - $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['step'];
$_smarty_tpl->tpl_vars['smarty']->value['section']['res']['index_next'] = $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['index'] + $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['step'];
$_smarty_tpl->tpl_vars['smarty']->value['section']['res']['first']      = ($_smarty_tpl->tpl_vars['smarty']->value['section']['res']['iteration'] == 1);
$_smarty_tpl->tpl_vars['smarty']->value['section']['res']['last']       = ($_smarty_tpl->tpl_vars['smarty']->value['section']['res']['iteration'] == $_smarty_tpl->tpl_vars['smarty']->value['section']['res']['total']);
?>
  <?php if (($_smarty_tpl->getVariable('smarty')->value['section']['res']['index']+1)==$_smarty_tpl->getVariable('currentPage')->value){?>
    <option selected="true"> <?php }else{ ?>
  <option><?php }?><?php echo $_smarty_tpl->getVariable('smarty')->value['section']['res']['index']+1;?>
</option>
    <?php if (($_smarty_tpl->getVariable('smarty')->value['section']['res']['index']+1)==$_smarty_tpl->getVariable('currentPage')->value){?></B><?php }?>
  <?php endfor; endif; ?>
</select>
of <?php echo $_smarty_tpl->getVariable('maxpages')->value;?>

<br>Per Page <select name="resultsPerPage" onchange="changeResultsPerPage(this);">
  <option <?php if (15==$_smarty_tpl->getVariable('resultsPerPage')->value){?> selected="true"<?php }?>>15</option>
  <option <?php if (20==$_smarty_tpl->getVariable('resultsPerPage')->value){?> selected="true"<?php }?>>20</option>
  <option <?php if (25==$_smarty_tpl->getVariable('resultsPerPage')->value){?> selected="true"<?php }?>>25</option>
  <option <?php if (30==$_smarty_tpl->getVariable('resultsPerPage')->value){?> selected="true"<?php }?>>30</option>
  <option <?php if (40==$_smarty_tpl->getVariable('resultsPerPage')->value){?> selected="true"<?php }?>>40</option>
  <option <?php if (100==$_smarty_tpl->getVariable('resultsPerPage')->value){?> selected="true"<?php }?>>100</option>
</select>
