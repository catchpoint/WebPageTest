<?php /* Smarty version Smarty-3.0.6, created on 2011-01-29 14:11:12
         compiled from "templates\header.tpl" */ ?>
<?php /*%%SmartyHeaderCode:18654d447460842956-71977269%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    '20a5b87bf1d249a8e4b5bdf6dc560aa9c65c681a' => 
    array (
      0 => 'templates\\header.tpl',
      1 => 1288213356,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '18654d447460842956-71977269',
  'function' => 
  array (
  ),
  'has_nocache_code' => false,
)); /*/%%SmartyHeaderCode%%*/?>

<style>
#wptAuthBar {
color: white;
height: 18px;
text-align: right;
width: 980px;
}
#wptAuthBar a {
color: white;
}
</style>

<div id="wptAuthBar">Welcome, <a href="editUser.php?user_id=<?php echo $_SESSION['ls_id'];?>
"><?php echo $_SESSION['ls_user'];?>
</a> &nbsp;|&nbsp; <a href="<?php echo $_SERVER['PHP_SELF'];?>
?ls_logout" rel="">Logout</a><br><?php include_once ('utcDateTime.php');?>
</div>

<div id="header">
    <h1 class="logo"><a href="index.php">WebPageTest Monitor</a> </h1>
</div>
<?php if ($_SESSION['ls_admin']){?>
<div>
</div>
<?php }?>
<?php include_once ('messaging.php');?>

