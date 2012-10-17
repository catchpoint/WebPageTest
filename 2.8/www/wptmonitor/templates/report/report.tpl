<div align="center" style="background:white;padding:15px">
<h3>WPT Monitor Report</h3>
  <h4>Jobs |
  {foreach $averageDetails as $details}
  {$details.Label}&nbsp;|
{/foreach}</h4>

  <h4>Date Range: {$startTime|date_format:"%Y-%m-%d %H:%M"} to {$endTime|date_format:"%Y-%m-%d %H:%M"}</h4><hr>
<h3 align="left">Averages</h3>
  {foreach $overallAverages as $average}
  <h4>{$average.Label}</h4>
  <table id="tableResults" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">
  <tbody>
  <tr>
    <th align="center" class="empty" valign="middle" style="border:1px white solid;"></th>
    <th align="center" class="empty" valign="middle" colspan="4"></th>
    <th align="center" class="border" valign="middle" colspan="3">Document Complete</th>
    <th align="center" class="border" valign="middle" colspan="3">Fully Loaded</th>
  </tr>
  <tr>
    <th align="center" class="empty" valign="middle"></th>
    <th align="center" valign="middle">Load Time</th>
    <th align="center" valign="middle">First Byte</th>
    <th align="center" valign="middle">Start Render</th>
    <th align="center" valign="middle">DOM Element</th>
    <th align="center" class="border" valign="middle">Time</th>
    <th align="center" valign="middle">Requests</th>
    <th align="center" valign="middle">Bytes In</th>

    <th align="center" class="border" valign="middle">Time</th>
    <th align="center" valign="middle">Requests</th>
    <th align="center" valign="middle">Bytes In</th>
  </tr>
  <tr bgcolor="#f5f5f5">
    <td align="left" valign="middle">First View</td>
    <td align="right" id="fvLoadTime" class="odd" valign="middle">{($average[0].AvgFirstViewDocCompleteTime/1000)|string_format:"%.3f"}s</td>
    <td align="right" id="fvTTFB" class="odd" valign="middle">{($average[0].AvgFirstViewFirstByte/1000)|string_format:"%.3f"}s</td>
    <td align="right" id="fvStartRender" class="odd" valign="middle">{($average[0].AvgFirstViewStartRender/1000)|string_format:"%.3f"}s</td>
    <td align="right" id="fvDomElement" class="odd" valign="middle">{if isset($average[0].AvgFirstViewDomCompleteTime)}{($average[0].AvgFirstViewDomCompleteTime/1000)|string_format:"%.3f"}s{/if}</td>
    <td align="right" id="fvDocComplete" class="odd border" valign="middle">{($average[0].AvgFirstViewDocCompleteTime/1000)|string_format:"%.3f"}s</td>
    <td align="center" id="fvRequestsDoc" class="odd" align="center" valign="middle">{$average[0].AvgFirstViewDocCompleteRequests|string_format:"%.0f"}</td>
    <td align="right" id="fvBytesDoc" class="odd" valign="middle">{($average[0].AvgFirstViewDocCompleteBytesIn/1000)|string_format:"%.0f"} KB</td>
    <td align="right" id="fvFullyLoaded" class="odd border" valign="middle">{($average[0].AvgFirstViewFullyLoadedTime/1000)|string_format:"%.3f"}s</td>
    <td align="center" id="fvRequests" class="odd" align="center" valign="middle">{$average[0].AvgFirstViewFullyLoadedRequests|string_format:"%.0f"}</td>
    <td align="right" id="fvBytes" class="odd" valign="middle">{($average[0].AvgFirstViewFullyLoadedBytesIn/1000)|string_format:"%.0f"} KB</td>
  </tr>
{if $average[0].AvgRepeatViewDocCompleteTime > 0}
  <tr class="monitoringJobRow even">
    <td align="left" class="even" valign="middle">Repeat View</td>
    <td align="right" id="fvLoadTime" class="even" valign="middle">{($average[0].AvgRepeatViewDocCompleteTime/1000)|string_format:"%.3f"}s</td>
    <td align="right" id="fvTTFB" class="even" valign="middle">{($average[0].AvgRepeatViewFirstByte/1000)|string_format:"%.3f"}s</td>
    <td align="right" id="fvStartRender" class="even" valign="middle">{($average[0].AvgRepeatViewStartRender/1000)|string_format:"%.3f"}s</td>
    <td align="right" id="fvDomElement" class="even" valign="middle">{if isset($average[0].AvgRepeatViewDomCompleteTime)}{($average[0].AvgRepeatViewDomCompleteTime/1000)|string_format:"%.3f"}s{/if}</td>
    <td align="right" id="fvDocComplete" class="even border" valign="middle">{($average[0].AvgRepeatViewDocCompleteTime/1000)|string_format:"%.3f"}s</td>
    <td align="center" id="fvRequestsDoc" class="even" align="center" valign="middle">{($average[0].AvgRepeatViewDocCompleteRequests)|string_format:"%.0f"}</td>
    <td align="right" id="fvBytesDoc" class="even" valign="middle">{($average[0].AvgRepeatViewDocCompleteBytesIn/1000)|string_format:"%.0f"} KB</td>
    <td align="right" id="fvFullyLoaded" class="even border" valign="middle">{($average[0].AvgRepeatViewFullyLoadedTime/1000)|string_format:"%.3f"}s</td>
    <td align="center" id="fvRequests" class="even" align="center" valign="middle">{($average[0].AvgRepeatViewFullyLoadedRequests)|string_format:"%.0f"}</td>
    <td align="right" id="fvBytes" class="even" valign="middle">{($average[0].AvgRepeatViewFullyLoadedBytesIn/1000)|string_format:"%.0f"} KB</td>
  </tr>
  {/if}
  </tbody>
</table><br>
  {/foreach}
  <hr>
<h3 align="left">Graph</h3>
  {jpgraph_line title='Average Reponse Time'
                        subtitle='report'
                        width='1000'
                        height='600'
                        margins='40,30,40,120'
                        y_axis_title='Seconds'
                        x_axis_tick_labels=$x_axis_tick_labels
                        datas=$datas
                        interval=$interval}

<hr>
<h3 align="left">Response Times</h3>
{foreach $averageDetails as $details}
<h4>{$details.Label}</h4>
  <table class="pretty" width=100%>
    <tbody>
  <tr>
    <th></th>
      <th colspan="6" class="border" align="center">Times (seconds)</th>
      <th colspan="4" class="border" align="center">Measures</th>
    </tr>

  <tr>
    <th>Date</th>
    <th align="right" class="border">TTFB</th>
    <th align="right" >Render</th>
    <th align="right">Doc</th>
    <th align="right">Dom</th>
    <th align="right">Fully</th><th></th>
    <th align="right" class="border">Doc<br>Reqs</th>
    <th align="right">Doc<br>Bytes</th>
    <th align="right">Fully<br>Reqs</th>
    <th align="right">Fully<br>Bytes</th>

  </tr>
{assign var="eo" value="odd"}
{foreach $details as $detail}
{if $detail.AvgFirstViewDocCompleteTime > 0}
{if $eo == "even"} {assign var="eo" value="odd"} {else} {assign var="eo" value= "even"}{/if}
  <tr class="monitoringJobRow {$eo}">
    <td align="center">{$detail.Date|date_format:"%Y-%m-%d %H:%M"}</td>
    <td align="right" class="border">{($detail.AvgFirstViewFirstByte/1000)|string_format:"%.3f"}</td>
    <td align="right" >{($detail.AvgFirstViewStartRender/1000)|string_format:"%.3f"}</td>
    <td align="right" >{($detail.AvgFirstViewDocCompleteTime/1000)|string_format:"%.3f"}</td>
    <td align="right" >{if isset($detail.AvgFirstViewDomCompleteTime)}{($detail.AvgFirstViewDomCompleteTime/1000)|string_format:"%.3f"}{/if}</td>
    <td align="right" >{($detail.AvgFirstViewFullyLoadedTime/1000)|string_format:"%.3f"}</td><td></td>
    <td valign="middle" class="border" align="right">{$detail.AvgFirstViewDocCompleteRequests|string_format:"%.0f"}</td>
    <td valign="middle" align="right">{($detail.AvgFirstViewDocCompleteBytesIn/1000)|string_format:"%.0f"} KB</td>
    <td valign="middle" align="right">{$detail.AvgFirstViewFullyLoadedRequests|string_format:"%.0f"}</td>
    <td valign="middle" align="right">{($detail.AvgFirstViewFullyLoadedBytesIn/1000)|string_format:"%.0f"} KB</td>
  </tr>
{/if}
{/foreach}
    </tbody>
</table><br>
  {/foreach}
{*<table class="pretty">*}
  {*<tr>*}
    {*<th align="left">Date</th>*}
    {*{foreach from=$datas key=k item=v}*}
      {*<th align="right">{$k}</th>*}
    {*{/foreach}*}
  {*</tr>*}
  {*{foreach from=$x_axis_tick_labels item=date}*}
  {*{if $eo == "even"} {assign var="eo" value="odd"} {else} {assign var="eo" value= "even"}{/if}*}
    {*<tr class="monitoringJobRow {$eo}">*}
      {*<td>{$date|date_format:"%Y-%m-%d %H:%M"}</td>*}
      {*{foreach from=$datas item=v}*}
      {*{foreach from=$v key=dte item=d}*}
      {*{if $dte|date_format:"%Y-%m-%d %H:%M" eq $date|date_format:"%Y-%m-%d %H:%M"}*}
        {*<td align="right">{$d|	at:"%.3f"}</td>*}
      {*{/if}*}
      {*{/foreach}*}
      {*{/foreach}*}
    {*</tr>*}
  {*{/foreach}*}
  {*{foreach from=$datas key=k item=v}*}
  {*{foreach from=$v key=date item=d}*}
  {*{/foreach}*}
  {*{/foreach}*}

{*</table>          *}{*<a href="javascript:document.getElementById('abbreviations').style.visibility='visible';">+</a>*}
<hr>
  <h3 align="left">Change Notes</h3>
  <table class="pretty" width="100%">
  <tr>
    <th align="left">Date</th><th align="left">Note</th>
  </tr>
  {assign var="eo" value="odd"}
  {foreach from=$changeNotes item=note}
  {if $eo == "even"} {assign var="eo" value="odd"} {else} {assign var="eo" value= "even"}{/if}
    <tr class="monitoringJobRow {$eo}">
      <td>{$note.Date|date_format:"%Y-%m-%d %H:%M"}</td>
      <td align="left">{$note.Label}</td>
    </tr>
  {/foreach}
  {*{foreach from=$datas key=k item=v}*}
  {*{foreach from=$v key=date item=d}*}
  {*{/foreach}*}
  {*{/foreach}*}

</table>          {*<a href="javascript:document.getElementById('abbreviations').style.visibility='visible';">+</a>*}
</div>
