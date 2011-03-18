<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  <title>WPT Host Status</title>
</head>
<body>
<div class="page">
  {include file='header.tpl'}
  {include file='navbar.tpl'}
  <div id="main">
    <div class="level_2">
      <div class="content-wrap">
        <div class="content" style="height:500px; overflow:auto;width:inherit;">
          <br>

          <h2 class="cufon-dincond_black">WPT Host Status</h2>
          <table class="pretty" style="border-collapse:collapse" width="100%">
            <thead>
            <th align="left">Host</th>
            <th align="left">ID</th>
            <th align="left">Label</th>
            <th align="left">Browser</th>
            <th align="right">In Queue</th>
            <th align="right">High</th>
            <th align="right">Low</th>
            <th></th>
            </thead>
            {foreach from=$locations item=location}
            {if $eo == "even"} {assign var="eo" value="odd"} {else} {assign var="eo" value= "even"}{/if}
            {assign value="#98fb98" var="bgcolor"}
            {if $location.PendingTests > $location.GreenLimit}{assign value="yellow" var=bgcolor}{/if}
            {if $location.PendingTests > $location.YellowLimit}{assign value="red" var=bgcolor}{/if}
              <tr class="{$eo}">
                <td>{$location.host}</td>
                <td>{$location.id}</td>
                <td>{$location.Label}</td>
                <td>{$location.Browser}</td>
                <td align="right">{$location.PendingTests}</td>
                <td align="right">{$location.PendingTestsHighPriority}</td>
                <td align="right">{$location.PendingTestsLowPriority}</td>
                <td style="opacity:0.6;background-color:{$bgcolor}"></td>
              </tr>
            {/foreach}
          </table>
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>
