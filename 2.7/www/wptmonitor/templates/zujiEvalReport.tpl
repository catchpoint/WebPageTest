<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">

<html>
<head>
{include file='headIncludes.tpl'}
</head>
<body>
  <div class="page">
  {include file='header.tpl'}
  {include file='navbar.tpl'}
    <div id="main">
     <div class="level_2">
     <div class="content-wrap">
       <div class="content">
       <br><h2 class="cufon-dincond_black">Zuji Eval Report for {$reportTitle}</h2>
       <form action="">
       <table>
       <tr><td>
       <table>
       <tr>
       <td align="right">Location</td><td><select name="location"><option value="">Amazon West</option>
       {*<option value=" ( Complete Path )" {if $location eq ' ( Complete Path )'} selected="true"{/if}>Complete Path</option>*}
       {*<option value=" AKAMAI" {if $location eq ' AKAMAI'}selected="true"{/if}>Akamai</option>*}
       {*<option value="-AU" {if $location eq '-AU'} selected="true"{/if}>Austrialia</option>*}
       {*<option value="-AU ( Complete Path )" {if $location eq '-AU ( Complete Path )'} selected="true"{/if}>Austrialia Complete Path</option>*}
       </select>
       </td>
      </tr><tr>
       <td align="right">Run Label</td><td><select name="runLabel">{html_options options=$runLabels values=$runLabels selected=$runLabel}</select></td>
       </tr><tr>
       <td align="right">From</td><td>{html_select_date prefix="from" time=$fromDate} {html_select_time prefix="from" time=$fromDate display_seconds=false}</td>
       </tr><tr>
       <td align="right">To</td><td>{html_select_date prefix="to" time=$toDate} {html_select_time prefix="to" time=$toDate display_seconds=false}</td>
       </tr>
       </table>
       </td><td valign="top">
       <table>
       <tr><td valign="top">
       {*<input type="checkbox" name="stddev" value="true" {if $stddev}checked="true" {/if}>Std Dev.*}
       <input type="checkbox" name="ninetieth" value="true" {if $ninetieth}checked="true" {/if}>90th<br>
       <input type="checkbox" name="completePath" value="true" {if $completePath}checked="true"{/if}>Use Complete Path on ?SR<br>
       <input type="checkbox" name="versusDirect" value="true" {if $versusDirect}checked="true" {/if}><a title="Compare Optimized versus direct to origin zuji servers">Versus Direct</a><br>
       <input type="checkbox" name="download" value="download">Download
       </td></tr>
       </table>
       </td><td valign="top"><input type="submit" value="Submit"></form></td></tr>
       </table>
       <div class="content">
            <div class="translucent">
              <table class="pretty">
                <tr bgcolor="999999">
                  <td>Label</td>
                  <td align="right">Samples</td>
                  <td align="right">TTFB</td>
                  <td align="right">Render</td>
                  <td align="right">Dom</td>
                  <td align="right">Doc</td>
                </tr>
                <tr>
                  <td><a target="_blank" href="listResults.php?filterField=WPTJob.Id&filterValue={$homePageUnOptimized.jobId}">HomePage {$unOptOrDirect}</a></td>
                  <td align="right">{$homePageUnOptimized.count}</td>
                  <td align="right">{$homePageUnOptimized.ttfb}</td>
                  <td align="right">{$homePageUnOptimized.render}</td>
                  <td align="right">{$homePageUnOptimized.domTime}</td>
                  <td align="right">{$homePageUnOptimized.docTime}</td></tr>
                <tr>
                  <td><a target="_blank" href="listResults.php?filterField=WPTJob.Id&filterValue={$homePageOptimized.jobId}">HomePage Optimized</a></td>
                  <td align="right">{$homePageOptimized.count}</td>
                  <td align="right">{$homePageOptimized.ttfb}</td>
                  <td align="right">{$homePageOptimized.render}</td>
                  <td align="right">{$homePageOptimized.domTime}</td>
                  <td align="right">{$homePageOptimized.docTime}</td>
                </tr>
                <tr>
                  <td></td><td>Difference</td></td>
                  <td align="right">{$homePageUnOptimized.ttfb-$homePageOptimized.ttfb | number_format:2}</td>
                  <td align="right">{$homePageUnOptimized.render-$homePageOptimized.render | number_format:2}</td>
                  <td align="right">{$homePageUnOptimized.domTime-$homePageOptimized.domTime | number_format:2}</td>
                  <td align="right">{$homePageUnOptimized.docTime-$homePageOptimized.docTime | number_format:2}</td>
                </tr>
                <tr>
                  <td colspan="2" bgcolor="eeeeee">Target: 20% ( DOC TIME )</td>
                  {assign var=diff value=$homePageUnOptimized.ttfb-$homePageOptimized.ttfb}
                  {if $homePageUnOptimized.ttfb > 0}
                    {if $diff/$homePageUnOptimized.ttfb*100 > 20}
                      {assign var=color value="eeeeee"}
                    {else}
                      {assign var=color value="eeeeee"}
                    {/if}

                    <td bgcolor={$color} align="right">{$diff/$homePageUnOptimized.ttfb*100|number_format:2}% </td>

                  {assign var=diff value=$homePageUnOptimized.render-$homePageOptimized.render}
                    {if $diff/$homePageUnOptimized.render*100 > 20}
                      {assign var=color value="eeeeee"}
                    {else}
                      {assign var=color value="eeeeee"}
                    {/if}

                    <td bgcolor={$color} align="right">{$diff/$homePageUnOptimized.render*100|number_format:2}% </td>

                  {if $homePageUnOptimized.domTime > 0}
                    {assign var=diff value=$homePageUnOptimized.domTime-$homePageOptimized.domTime}
                    {if $diff/$homePageUnOptimized.domTime*100 > 20}
                      {assign var=color value="eeeeee"}
                    {else}
                      {assign var=color value="yellow"}
                    {/if}
                    <td bgcolor={$color} align="right"> {$diff/$homePageUnOptimized.domTime*100|number_format:2}%</td>
                  {else}
                  <td bgcolor="palegreen"></td>
                  {/if}

                  {assign var=diff value=$homePageUnOptimized.docTime-$homePageOptimized.docTime}
                  {if $diff/$homePageUnOptimized.docTime*100 > 20}
                    {assign var=color value="palegreen"}
                  {else}
                    {assign var=color value="red"}
                  {/if}
                   <td bgcolor={$color} align="right">{$diff/$homePageUnOptimized.docTime*100|number_format:2}%</td>
                {/if}

                </tr>


                <tr>
                  <td><a target="_blank" href="listResults.php?filterField=WPTJob.Id&filterValue={$hlpUnOptimized.jobId}">HLP {$unOptOrDirect}</a></td>
                  <td align="right">{$hlpUnOptimized.count}</td>
                  <td align="right">{$hlpUnOptimized.ttfb}</td>
                  <td align="right">{$hlpUnOptimized.render}</td>
                  <td align="right">{$hlpUnOptimized.domTime}</td>
                  <td align="right">{$hlpUnOptimized.docTime}</td></tr>
                <tr>
                  <td><a target="_blank" href="listResults.php?filterField=WPTJob.Id&filterValue={$hlpOptimized.jobId}">HLP Optimized</a></td>
                  <td align="right">{$hlpOptimized.count}</td>
                  <td align="right">{$hlpOptimized.ttfb}</td>
                  <td align="right">{$hlpOptimized.render}</td>
                  <td align="right">{$hlpOptimized.domTime}</td>
                  <td align="right">{$hlpOptimized.docTime}</td></tr>
                <tr>
                <tr>
                  <td></td><td>Difference</td></td>
                  <td align="right">{$hlpUnOptimized.ttfb-$hlpOptimized.ttfb | number_format:2}</td>
                  <td align="right">{$hlpUnOptimized.render-$hlpOptimized.render | number_format:2}</td>
                  <td align="right">{$hlpUnOptimized.domTime-$hlpOptimized.domTime | number_format:2}</td>
                  <td align="right">{$hlpUnOptimized.docTime-$hlpOptimized.docTime | number_format:2}</td>
                </tr>
                <tr>
                  <td colspan="2" bgcolor="eeeeee">Target: 20% ( DOC TIME )</td>
                  {if $hlpUnOptimized.ttfb > 0}

                  {assign var=diff value=$hlpUnOptimized.ttfb-$hlpOptimized.ttfb}
                  {if $diff/$hlpUnOptimized.ttfb*100 > 20}
                    {assign var=color value="eeeeee"}
                  {else}
                    {assign var=color value="yellow"}
                  {/if}

                  <td bgcolor={$color} align="right">{$diff/$hlpUnOptimized.ttfb*100|number_format:2}%</td>

                  {assign var=diff value=$hlpUnOptimized.render-$hlpOptimized.render}
                  {if $diff/$hlpUnOptimized.render*100 > 20}
                    {assign var=color value="eeeeee"}
                  {else}
                    {assign var=color value="yellow"}
                  {/if}

                  <td bgcolor={$color} align="right">{$diff/$hlpUnOptimized.render*100|number_format:2}%</td>

                  {if $hlpUnOptimized.domTime > 0}
                    {assign var=diff value=$hlpUnOptimized.domTime-$hlpOptimized.domTime}
                    {if $diff/$hlpUnOptimized.domTime*100 > 20}
                      {assign var=color value="eeeeee"}
                    {else}
                      {assign var=color value="yellow"}
                    {/if}
                    <td bgcolor={$color} align="right"> {$diff/$hlpUnOptimized.domTime*100|number_format:2}%</td>
                  {else}
                  <td bgcolor="palegreen"></td>
                  {/if}

                  {assign var=diff value=$hlpUnOptimized.docTime-$hlpOptimized.docTime}
                  {if $diff/$hlpUnOptimized.docTime*100 > 20}
                    {assign var=color value="palegreen"}
                  {else}
                    {assign var=color value="red"}
                  {/if}
                   <td bgcolor={$color} align="right">{$diff/$hlpUnOptimized.docTime*100|number_format:2}%</td>
                   {/if}
                </tr>

                <tr>
                  <td><a target="_blank" href="listResults.php?filterField=WPTJob.Id&filterValue={$flpUnOptimized.jobId}">FLP {$unOptOrDirect}</a></td>
                  <td align="right">{$flpUnOptimized.count}</td>
                  <td align="right">{$flpUnOptimized.ttfb}</td>
                  <td align="right">{$flpUnOptimized.render}</td>
                  <td align="right">{$flpUnOptimized.domTime}</td>
                  <td align="right">{$flpUnOptimized.docTime}</td></tr>
                <tr>
                  <td><a target="_blank" href="listResults.php?filterField=WPTJob.Id&filterValue={$flpOptimized.jobId}">FLP Optimized</a></td>
                  <td align="right">{$flpOptimized.count}</td>
                  <td align="right">{$flpOptimized.ttfb}</td>
                  <td align="right">{$flpOptimized.render}</td>
                  <td align="right">{$flpOptimized.domTime}</td>
                  <td align="right">{$flpOptimized.docTime}</td></tr>
                <tr>
                <tr>
                  <td></td><td>Difference</td></td>
                  <td align="right">{$flpUnOptimized.ttfb-$flpOptimized.ttfb | number_format:2}</td>
                  <td align="right">{$flpUnOptimized.render-$flpOptimized.render | number_format:2}</td>
                  <td align="right">{$flpUnOptimized.domTime-$flpOptimized.domTime | number_format:2}</td>
                  <td align="right">{$flpUnOptimized.docTime-$flpOptimized.docTime | number_format:2}</td>
                </tr>
                <tr>
                  <td colspan="2" bgcolor="eeeeee">Target: 20% ( DOC TIME )</td>
                  {if $flpUnOptimized.ttfb > 0}
                  {assign var=diff value=$flpUnOptimized.ttfb-$flpOptimized.ttfb}
                  {if $diff/$flpUnOptimized.ttfb*100 > 20}
                    {assign var=color value="eeeeee"}
                  {else}
                    {assign var=color value="yellow"}
                  {/if}

                  <td bgcolor={$color} align="right">{$diff/$flpUnOptimized.ttfb*100|number_format:2}%</td>

                  {assign var=diff value=$flpUnOptimized.render-$flpOptimized.render}
                  {if $diff/$flpUnOptimized.render*100 > 20}
                    {assign var=color value="eeeeee"}
                  {else}
                    {assign var=color value="yellow"}
                  {/if}

                  <td bgcolor={$color} align="right">{$diff/$flpUnOptimized.render*100|number_format:2}%</td>

                  {if $flpUnOptimized.domTime > 0}
                    {assign var=diff value=$flpUnOptimized.domTime-$flpOptimized.domTime}
                    {if $diff/$flpUnOptimized.domTime*100 > 20}
                      {assign var=color value="eeeeee"}
                    {else}
                      {assign var=color value="yellow"}
                    {/if}
                    <td bgcolor={$color} align="right"> {$diff/$flpUnOptimized.domTime*100|number_format:2}%</td>
                  {else}
                  <td bgcolor="palegreen"></td>
                  {/if}

                  {assign var=diff value=$flpUnOptimized.docTime-$flpOptimized.docTime}
                  {if $diff/$flpUnOptimized.docTime*100 > 20}
                    {assign var=color value="palegreen"}
                  {else}
                    {assign var=color value="red"}
                  {/if}
                   <td bgcolor={$color} align="right">{$diff/$flpUnOptimized.docTime*100|number_format:2}%</td>
                   {/if}
                </tr>


                <tr>
                  <td><a target="_blank" href="listResults.php?filterField=WPTJob.Id&filterValue={$hsrUnOptimized.jobId}">HSR {$unOptOrDirect}</a></td>
                  <td align="right">{$hsrUnOptimized.count}</td>
                  <td align="right">{$hsrUnOptimized.ttfb}</td>
                  <td align="right">{$hsrUnOptimized.render}</td>
                  <td align="right">{$hsrUnOptimized.domTime}</td>
                  <td align="right">{$hsrUnOptimized.docTime}</td></tr>
                <tr>
                  <td><a target="_blank" href="listResults.php?filterField=WPTJob.Id&filterValue={$hsrOptimized.jobId}">HSR Optimized</a></td>
                  <td align="right">{$hsrOptimized.count}</td>
                  <td align="right">{$hsrOptimized.ttfb}</td>
                  <td align="right">{$hsrOptimized.render}</td>
                  <td align="right">{$hsrOptimized.domTime}</td>
                  <td align="right">{$hsrOptimized.docTime}</td>
                </tr>
                <tr>
                  <td></td><td>Difference</td></td>
                  <td align="right">{$hsrUnOptimized.ttfb-$hsrOptimized.ttfb | number_format:2}</td>
                  <td align="right">{$hsrUnOptimized.render -$hsrOptimized.render | number_format:2}</td>
                  <td align="right">{$hsrUnOptimized.domTime-$hsrOptimized.domTime | number_format:2}</td>
                  <td align="right">{$hsrUnOptimized.docTime-$hsrOptimized.docTime | number_format:2}</td>
                </tr>
                <tr>
                  <td colspan="2" bgcolor="eeeeee">Target: 10% ( DOC TIME )</td>
                  {if $hsrUnOptimized.ttfb > 0}

                  {assign var=diff value=$hsrUnOptimized.ttfb-$hsrOptimized.ttfb}
                  {if $diff/$hsrUnOptimized.ttfb*100 > 10}
                    {assign var=color value="eeeeee"}
                  {else}
                    {assign var=color value="yellow"}
                  {/if}

                  <td bgcolor={$color} align="right">{$diff/$hsrUnOptimized.ttfb*100|number_format:2}%</td>

                  {assign var=diff value=$hsrUnOptimized.render-$hsrOptimized.render}
                  {if $diff/$hsrUnOptimized.render*100 > 10}
                    {assign var=color value="eeeeee"}
                  {else}
                    {assign var=color value="yellow"}
                  {/if}

                  <td bgcolor={$color} align="right">{$diff/$hsrUnOptimized.render*100|number_format:2}%</td>


                  {if $hsrUnOptimized.domTime > 0}
                    {assign var=diff value=$hsrUnOptimized.domTime-$hsrOptimized.domTime}
                    {if $diff/$hsrUnOptimized.domTime*100 > 10}
                      {assign var=color value="palegreen"}
                    {else}
                      {assign var=color value="red"}
                    {/if}
                    <td bgcolor="eeeeee" align="right"> {$diff/$hsrUnOptimized.domTime*100|number_format:2}%</td>
                  {else}
                  <td bgcolor="palegreen"></td>
                  {/if}

                  {assign var=diff value=$hsrUnOptimized.docTime-$hsrOptimized.docTime}
                  {if $diff/$hsrUnOptimized.docTime*100 > 10}
                    {assign var=color value="palegreen"}
                  {else}
                    {assign var=color value="red"}
                  {/if}
                   <td bgcolor={$color} align="right">{$diff/$hsrUnOptimized.docTime*100|number_format:2}%</td>
                   {/if}
                </tr>

                <tr>
                  <td><a target="_blank" href="listResults.php?filterField=WPTJob.Id&filterValue={$fsrUnOptimized.jobId}">FSR {$unOptOrDirect}</a></td>
                  <td align="right">{$fsrUnOptimized.count}</td>
                  <td align="right">{$fsrUnOptimized.ttfb}</td>
                  <td align="right">{$fsrUnOptimized.render}</td>
                  <td align="right">{$fsrUnOptimized.domTime}</td>
                  <td align="right">{$fsrUnOptimized.docTime}</td>
                </tr>
                <tr>
                  <td><a target="_blank" href="listResults.php?filterField=WPTJob.Id&filterValue={$fsrOptimized.jobId}">FSR Optimized</a></td>
                  <td align="right">{$fsrOptimized.count}</td>
                  <td align="right">{$fsrOptimized.ttfb}</td>
                  <td align="right">{$fsrOptimized.render}</td>
                  <td align="right">{$fsrOptimized.domTime}</td>
                  <td align="right">{$fsrOptimized.docTime}</td>
                </tr>
                <tr>
                  <td></td><td>Difference</td></td>
                  <td align="right">{$fsrUnOptimized.ttfb-$fsrOptimized.ttfb | number_format:2}</td>
                  <td align="right">{$fsrUnOptimized.render-$fsrOptimized.render | number_format:2}</td>
                  <td align="right">{$fsrUnOptimized.domTime-$fsrOptimized.domTime | number_format:2}</td>
                  <td align="right">{$fsrUnOptimized.docTime-$fsrOptimized.docTime | number_format:2}</td>
                </tr>
                <tr>
                  <td colspan="2" bgcolor="eeeeee">Target: 10% ( DOC TIME )</td>
                  {if $hsrUnOptimized.ttfb > 0}
                  {assign var=diff value=$fsrUnOptimized.ttfb-$fsrOptimized.ttfb}
                  {if $diff/$fsrUnOptimized.ttfb*100 > 10}
                    {assign var=color value="eeeeee"}
                  {else}
                    {assign var=color value="yellow"}
                  {/if}

                  <td bgcolor={$color} align="right">{$diff/$fsrUnOptimized.ttfb*100|number_format:2}%</td>
                  {assign var=diff value=$fsrUnOptimized.render-$fsrOptimized.render}
                  {if $diff/$fsrUnOptimized.render*100 > 10}
                    {assign var=color value="eeeeee"}
                  {else}
                    {assign var=color value="yellow"}
                  {/if}

                  <td bgcolor={$color} align="right">{$diff/$fsrUnOptimized.render*100|number_format:2}%</td>

                  {if $fsrUnOptimized.domTime > 0}
                    {assign var=diff value=$fsrUnOptimized.domTime-$fsrOptimized.domTime}
                    {if $diff/$fsrUnOptimized.domTime*100 > 10}
                      {assign var=color value="palegreen"}
                    {else}
                      {assign var=color value="red"}
                    {/if}
                    <td bgcolor="eeeeee" align="right"> {$diff/$fsrUnOptimized.domTime*100|number_format:2}%</td>
                  {else}
                  <td bgcolor="palegreen"></td>
                  {/if}

                  {assign var=diff value=$fsrUnOptimized.docTime-$fsrOptimized.docTime}
                  {if $diff/$fsrUnOptimized.docTime*100 > 10}
                    {assign var=color value="palegreen"}
                  {else}
                    {assign var=color value="red"}
                  {/if}
                   <td  bgcolor={$color} align="right">{$diff/$fsrUnOptimized.docTime*100|number_format:2}%</td>
                 {/if}

                </tr>

                <tr>
                  <td><a target="_blank" href="listResults.php?filterField=WPTJob.Id&filterValue={$psrUnOptimized.jobId}">PSR {$unOptOrDirect}</a></td>
                  <td align="right">{$psrUnOptimized.count}</td>
                  <td align="right">{$psrUnOptimized.ttfb}</td>
                  <td align="right">{$psrUnOptimized.render}</td>
                  <td align="right">{$psrUnOptimized.domTime}</td>
                  <td align="right">{$psrUnOptimized.docTime}</td>
                </tr>
                <tr>
                  <td><a target="_blank" href="listResults.php?filterField=WPTJob.Id&filterValue={$psrOptimized.jobId}">PSR Optimized</a></td>
                  <td align="right">{$psrOptimized.count}</td>
                  <td align="right">{$psrOptimized.ttfb}</td>
                  <td align="right">{$psrOptimized.render}</td>
                  <td align="right">{$psrOptimized.domTime}</td>
                  <td align="right">{$psrOptimized.docTime}</td>
                </tr>
                <tr>
                  <td></td><td>Difference</td></td>
                  <td align="right">{$psrUnOptimized.ttfb-$psrOptimized.ttfb | number_format:2}</td>
                  <td align="right">{$psrUnOptimized.render-$psrOptimized.render | number_format:2}</td>
                  <td align="right">{$psrUnOptimized.domTime-$psrOptimized.domTime | number_format:2}</td>
                  <td align="right">{$psrUnOptimized.docTime-$psrOptimized.docTime | number_format:2}</td>
                </tr>
                <tr>
                  <td colspan="2" bgcolor="eeeeee">Target: 10% ( DOC TIME )</td>
                  {if $psrUnOptimized.ttfb > 0}

                  {assign var=diff value=$psrUnOptimized.ttfb-$psrOptimized.ttfb}
                  {if $diff/$psrUnOptimized.ttfb*100 > 10}
                    {assign var=color value="eeeeee"}
                  {else}
                    {assign var=color value="yellow"}
                  {/if}

                  <td bgcolor={$color} align="right">{$diff/$psrUnOptimized.ttfb*100|number_format:2}%</td>

                  {assign var=diff value=$psrUnOptimized.render-$psrOptimized.render}
                  {if $diff/$psrUnOptimized.render*100 > 10}
                    {assign var=color value="eeeeee"}
                  {else}
                    {assign var=color value="yellow"}
                  {/if}

                  <td bgcolor={$color} align="right">{$diff/$psrUnOptimized.render*100|number_format:2}%</td>

                  {if $psrUnOptimized.domTime > 0}
                    {assign var=diff value=$psrUnOptimized.domTime-$psrOptimized.domTime}
                    {if $diff/$psrUnOptimized.domTime*100 > 10}
                      {assign var=color value="palegreen"}
                    {else}
                      {assign var=color value="red"}
                    {/if}
                    <td bgcolor="eeeeee" align="right"> {$diff/$psrUnOptimized.domTime*100|number_format:2}%</td>
                  {else}
                  <td bgcolor="palegreen"></td>
                  {/if}

                  {assign var=diff value=$psrUnOptimized.docTime-$psrOptimized.docTime}
                  {if $diff/$psrUnOptimized.docTime*100 > 10}
                    {assign var=color value="palegreen"}
                  {else}
                    {assign var=color value="red"}
                  {/if}
                   <td  bgcolor={$color} align="right">{$diff/$psrUnOptimized.docTime*100|number_format:2}%</td>
                   {/if}
                </tr>
              </table>
            <div style="width:100%;float:none;clear:both;"></div>
        </div>
        </div>
        </div>
        </div>
</body>
</html>