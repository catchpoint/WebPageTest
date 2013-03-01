{literal}
<style>
#wptAuthBar {
color: white;
height: 18px;
text-align: right;
width: 1100px;
}
#wptAuthBar a {
color: white;
}
</style>
{/literal}
<div id="wptAuthBar">Welcome, <a href="editUser.php?user_id={$smarty.session.ls_id}">{$smarty.session.ls_user}</a> &nbsp;|&nbsp; <a href="{$smarty.server.PHP_SELF}?ls_logout" rel="">Logout</a><br>{include_php file='utcDateTime.php'}</div>

<div id="header">
    <h1 class="logo"><a href="index.php">WebPageTest Monitor</a> </h1>
</div>
{if $smarty.session.ls_admin}
<div>
</div>
{/if}
{include_php file='messaging.php'}
