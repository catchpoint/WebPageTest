<?php /* Smarty version Smarty-3.0.6, created on 2011-01-29 14:11:12
         compiled from "templates\navbar.tpl" */ ?>
<?php /*%%SmartyHeaderCode:21264d4474608d2463-41557356%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    'f834b3cc9a0c6e5ca094ada60331ea3ce6f71cf6' => 
    array (
      0 => 'templates\\navbar.tpl',
      1 => 1293736103,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '21264d4474608d2463-41557356',
  'function' => 
  array (
  ),
  'has_nocache_code' => false,
)); /*/%%SmartyHeaderCode%%*/?>
<div id="nav_bkg">
  <ul id="nav" class="cufon-dincond_black">
    <li><a href="index.php">Home</a></li>
    <li><a href="listJobs.php?currentPage=1">Jobs</a></li>
    <li><a href="listScripts.php?currentPage=1">Scripts</a></li>
    <li><a href="listAlerts.php?currentPage=1">Alerts</a></li>
    <li><a href="listChangeNotes.php">Notes</a></li>
    <li><a href="flashGraph.php">Reports</a></li>
    <li><a href="listResults.php?currentPage=1">Results</a></li>
    <li><a href="listFolders.php?currentPage=1">Folders</a></li>
    <li><a href="listShares.php?currentPage=1">Shares</a></li>
    <li><a href="wptHostStatus.php">Status</a></li>
  </ul>
</div>
<?php if ($_SESSION['ls_admin']){?>
<div>
  <ul id="nav" class="cufon-dincond_black">
    <li><a href="editConfig.php">Config</a></li>
    <li><a href="listHosts.php">Hosts</a></li>
    <li><a href="listLocations.php">Locations</a></li>
    <li><a href="listUsers.php">Users</a></li>
    <li style="float:right;"><?php include_once ('impersonateUser.php');?>
</li>
    <li style="float:right;"><a>Admin acting as</a></li>
  </ul>
</div>
<?php }?>
