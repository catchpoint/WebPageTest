<?php /* Smarty version Smarty-3.0.6, created on 2011-01-29 16:12:06
         compiled from "templates\index.tpl" */ ?>
<?php /*%%SmartyHeaderCode:162654d4490b6160ba2-62729918%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    'f90be83b235fb03cc225b11607032e9ddd415899' => 
    array (
      0 => 'templates\\index.tpl',
      1 => 1286986401,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '162654d4490b6160ba2-62729918',
  'function' => 
  array (
  ),
  'has_nocache_code' => false,
)); /*/%%SmartyHeaderCode%%*/?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<?php $_template = new Smarty_Internal_Template('headIncludes.tpl', $_smarty_tpl->smarty, $_smarty_tpl, $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, null, null);
 echo $_template->getRenderedTemplate();?><?php $_template->updateParentVariables(0);?><?php unset($_template);?>
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
       <div class="content" style="height:600px">
       <br><h2 class="cufon-dincond_black">MONITOR A WEBSITE'S PERFORMANCE</h2>
       <div class="content" style="height:90%;">
            <div class="translucent" style="height:90%;">
            <?php if ($_smarty_tpl->getVariable('message')->value){?>
            <?php echo $_smarty_tpl->getVariable('message')->value;?>

            <?php }else{ ?>
                <p>WebPagetest Monitor is a tool that provides the ability to create recurring jobs for a WebPagetest instance. The jobs will be passed to the indicated WebPagetest instance and the results will be collected.</p>
            <?php }?>
                <p>If you are having any problems of just have questions about the site, please feel free to <a href="mailto:<?php echo $_smarty_tpl->getVariable('contactEmail')->value;?>
">contact us</a>.</p></div>
            <div style="width:100%;float:none;clear:both;"></div>

        </div>
      </div>
    </div>
  </div>
</body>
</html>