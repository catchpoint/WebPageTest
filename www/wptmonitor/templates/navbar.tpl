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
    {*<li><a href="downloadData.php">Download</a></li>*}
    <li><a href="wptHostStatus.php">Status</a></li>
  </ul>
</div>
{if $smarty.session.ls_admin}
<div>
  <ul id="nav" class="cufon-dincond_black">
    <li><a href="editConfig.php">Config</a></li>
    <li><a href="listHosts.php">Hosts</a></li>
    <li><a href="listLocations.php">Locations</a></li>
    <li><a href="listUsers.php">Users</a></li>
    <li style="float:right;">{include_php file='impersonateUser.php'}</li>
    <li style="float:right;"><a>Admin acting as</a></li>
  </ul>
</div>
{/if}
