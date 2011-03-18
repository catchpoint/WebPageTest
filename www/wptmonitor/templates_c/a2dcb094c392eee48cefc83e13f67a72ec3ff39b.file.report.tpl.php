<?php /* Smarty version Smarty-3.0.6, created on 2011-03-15 19:42:48
         compiled from "templates\report/report.tpl" */ ?>
<?php /*%%SmartyHeaderCode:286594d7fc138396e33-09571134%%*/if(!defined('SMARTY_DIR')) exit('no direct access allowed');
$_smarty_tpl->decodeProperties(array (
  'file_dependency' => 
  array (
    'a2dcb094c392eee48cefc83e13f67a72ec3ff39b' => 
    array (
      0 => 'templates\\report/report.tpl',
      1 => 1291157175,
      2 => 'file',
    ),
  ),
  'nocache_hash' => '286594d7fc138396e33-09571134',
  'function' => 
  array (
  ),
  'has_nocache_code' => false,
)); /*/%%SmartyHeaderCode%%*/?>
<?php if (!is_callable('smarty_modifier_date_format')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\modifier.date_format.php';
if (!is_callable('smarty_function_jpgraph_line')) include 'C:\Users\tperkins\Dropbox\DEVELOPMENT\wptmonitor\lib\Smarty-3.0.6\libs\plugins\function.jpgraph_line.php';
?><div align="center" style="background:white;padding:15px">
<h3>WPT Monitor Report</h3>
  <h4>Jobs: |
  <?php  $_smarty_tpl->tpl_vars['details'] = new Smarty_Variable;
 $_from = $_smarty_tpl->getVariable('averageDetails')->value; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array');}
if ($_smarty_tpl->_count($_from) > 0){
    foreach ($_from as $_smarty_tpl->tpl_vars['details']->key => $_smarty_tpl->tpl_vars['details']->value){
?>
  <?php echo $_smarty_tpl->tpl_vars['details']->value['Label'];?>
&nbsp;|
<?php }} ?></h4>

  <h4>Date Range: <?php echo smarty_modifier_date_format($_smarty_tpl->getVariable('startTime')->value,"%Y-%m-%d %H:%M");?>
 to <?php echo smarty_modifier_date_format($_smarty_tpl->getVariable('endTime')->value,"%Y-%m-%d %H:%M");?>
</h4><hr>
<h3 align="left">Averages</h3>
  <?php  $_smarty_tpl->tpl_vars['average'] = new Smarty_Variable;
 $_from = $_smarty_tpl->getVariable('overallAverages')->value; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array');}
if ($_smarty_tpl->_count($_from) > 0){
    foreach ($_from as $_smarty_tpl->tpl_vars['average']->key => $_smarty_tpl->tpl_vars['average']->value){
?>
  <h4><?php echo $_smarty_tpl->tpl_vars['average']->value['Label'];?>
</h4>
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
    <td align="right" id="fvLoadTime" class="odd" valign="middle"><?php echo $_smarty_tpl->tpl_vars['average']->value[0]['AvgFirstViewDocCompleteTime']/number_format(1000,3);?>
s</td>
    <td align="right" id="fvTTFB" class="odd" valign="middle"><?php echo $_smarty_tpl->tpl_vars['average']->value[0]['AvgFirstViewFirstByte']/number_format(1000,3);?>
s</td>
    <td align="right" id="fvStartRender" class="odd" valign="middle"><?php echo $_smarty_tpl->tpl_vars['average']->value[0]['AvgFirstViewStartRender']/number_format(1000,3);?>
s</td>
    <td align="right" id="fvDomElement" class="odd" valign="middle"><?php echo $_smarty_tpl->tpl_vars['average']->value[0]['AvgFirstViewDomCompleteTime']/number_format(1000,3);?>
s</td>
    <td align="right" id="fvDocComplete" class="odd border" valign="middle"><?php echo $_smarty_tpl->tpl_vars['average']->value[0]['AvgFirstViewDocCompleteTime']/number_format(1000,3);?>
s</td>
    <td align="center" id="fvRequestsDoc" class="odd" align="center" valign="middle"><?php echo number_format($_smarty_tpl->tpl_vars['average']->value[0]['AvgFirstViewDocCompleteRequests'],0);?>
</td>
    <td align="right" id="fvBytesDoc" class="odd" valign="middle"><?php echo $_smarty_tpl->tpl_vars['average']->value[0]['AvgFirstViewDocCompleteBytesIn']/number_format(1000,0);?>
 KB</td>
    <td align="right" id="fvFullyLoaded" class="odd border" valign="middle"><?php echo $_smarty_tpl->tpl_vars['average']->value[0]['AvgFirstViewFullyLoadedTime']/number_format(1000,3);?>
s</td>
    <td align="center" id="fvRequests" class="odd" align="center" valign="middle"><?php echo number_format($_smarty_tpl->tpl_vars['average']->value[0]['AvgFirstViewFullyLoadedRequests'],0);?>
</td>
    <td align="right" id="fvBytes" class="odd" valign="middle"><?php echo $_smarty_tpl->tpl_vars['average']->value[0]['AvgFirstViewFullyLoadedBytesIn']/number_format(1000,0);?>
 KB</td>
  </tr>
<?php if ($_smarty_tpl->tpl_vars['average']->value[0]['AvgRepeatViewDocCompleteTime']>0){?>
  <tr class="monitoringJobRow even">
    <td align="left" class="even" valign="middle">Repeat View</td>
    <td align="right" id="fvLoadTime" class="even" valign="middle"><?php echo $_smarty_tpl->tpl_vars['average']->value[0]['AvgRepeatViewDocCompleteTime']/number_format(1000,3);?>
s</td>
    <td align="right" id="fvTTFB" class="even" valign="middle"><?php echo $_smarty_tpl->tpl_vars['average']->value[0]['AvgRepeatViewFirstByte']/number_format(1000,3);?>
s</td>
    <td align="right" id="fvStartRender" class="even" valign="middle"><?php echo $_smarty_tpl->tpl_vars['average']->value[0]['AvgRepeatViewStartRender']/number_format(1000,3);?>
s</td>
    <td align="right" id="fvDomElement" class="even" valign="middle"><?php echo $_smarty_tpl->tpl_vars['average']->value[0]['AvgRepeatViewDomCompleteTime']/number_format(1000,3);?>
s</td>
    <td align="right" id="fvDocComplete" class="even border" valign="middle"><?php echo $_smarty_tpl->tpl_vars['average']->value[0]['AvgRepeatViewDocCompleteTime']/number_format(1000,3);?>
s</td>
    <td align="center" id="fvRequestsDoc" class="even" align="center" valign="middle"><?php echo number_format($_smarty_tpl->tpl_vars['average']->value[0]['AvgRepeatViewDocCompleteRequests'],0);?>
</td>
    <td align="right" id="fvBytesDoc" class="even" valign="middle"><?php echo $_smarty_tpl->tpl_vars['average']->value[0]['AvgRepeatViewDocCompleteBytesIn']/number_format(1000,0);?>
 KB</td>
    <td align="right" id="fvFullyLoaded" class="even border" valign="middle"><?php echo $_smarty_tpl->tpl_vars['average']->value[0]['AvgRepeatViewFullyLoadedTime']/number_format(1000,3);?>
s</td>
    <td align="center" id="fvRequests" class="even" align="center" valign="middle"><?php echo number_format($_smarty_tpl->tpl_vars['average']->value[0]['AvgRepeatViewFullyLoadedRequests'],0);?>
</td>
    <td align="right" id="fvBytes" class="even" valign="middle"><?php echo $_smarty_tpl->tpl_vars['average']->value[0]['AvgRepeatViewFullyLoadedBytesIn']/number_format(1000,0);?>
 KB</td>
  </tr>
  <?php }?>
  </tbody>
</table><br>
  <?php }} ?>
  <hr>
<h3 align="left">Graph</h3>
  <?php echo smarty_function_jpgraph_line(array('title'=>'Average Reponse Time','subtitle'=>'report','width'=>'900','height'=>'600','margins'=>'40,30,40,120','y_axis_title'=>'Seconds','x_axis_tick_labels'=>$_smarty_tpl->getVariable('x_axis_tick_labels')->value,'datas'=>$_smarty_tpl->getVariable('datas')->value),$_smarty_tpl);?>


<hr>
<h3 align="left">Response Times</h3>
<?php  $_smarty_tpl->tpl_vars['details'] = new Smarty_Variable;
 $_from = $_smarty_tpl->getVariable('averageDetails')->value; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array');}
if ($_smarty_tpl->_count($_from) > 0){
    foreach ($_from as $_smarty_tpl->tpl_vars['details']->key => $_smarty_tpl->tpl_vars['details']->value){
?>
<h4><?php echo $_smarty_tpl->tpl_vars['details']->value['Label'];?>
</h4>
  <table class="pretty" width=100%<?php ?>>
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

<?php  $_smarty_tpl->tpl_vars['detail'] = new Smarty_Variable;
 $_from = $_smarty_tpl->tpl_vars['details']->value; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array');}
if ($_smarty_tpl->_count($_from) > 0){
    foreach ($_from as $_smarty_tpl->tpl_vars['detail']->key => $_smarty_tpl->tpl_vars['detail']->value){
?>
<?php if ($_smarty_tpl->tpl_vars['detail']->value['AvgFirstViewDocCompleteTime']>0){?>
<?php if ($_smarty_tpl->getVariable('eo')->value=="even"){?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("odd", null, null);?> <?php }else{ ?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("even", null, null);?><?php }?>
  <tr class="monitoringJobRow <?php echo $_smarty_tpl->getVariable('eo')->value;?>
">
    <td align="center"><?php echo smarty_modifier_date_format($_smarty_tpl->tpl_vars['detail']->value['Date'],"%Y-%m-%d %H:%M");?>
</td>
    <td align="right" class="border"><?php echo $_smarty_tpl->tpl_vars['detail']->value['AvgFirstViewFirstByte']/number_format(1000,3);?>
</td>
    <td align="right" ><?php echo $_smarty_tpl->tpl_vars['detail']->value['AvgFirstViewStartRender']/number_format(1000,3);?>
</td>
    <td align="right" ><?php echo $_smarty_tpl->tpl_vars['detail']->value['AvgFirstViewDocCompleteTime']/number_format(1000,3);?>
</td>
    <td align="right" ><?php echo $_smarty_tpl->tpl_vars['detail']->value['AvgFirstViewDomCompleteTime']/number_format(1000,3);?>
</td>
    <td align="right" ><?php echo $_smarty_tpl->tpl_vars['detail']->value['AvgFirstViewFullyLoadedTime']/number_format(1000,3);?>
</td><td></td>
    <td valign="middle" class="border" align="right"><?php echo number_format($_smarty_tpl->tpl_vars['detail']->value['AvgFirstViewDocCompleteRequests'],0);?>
</td>
    <td valign="middle" align="right"><?php echo $_smarty_tpl->tpl_vars['detail']->value['AvgFirstViewDocCompleteBytesIn']/number_format(1000,0);?>
 KB</td>
    <td valign="middle" align="right"><?php echo number_format($_smarty_tpl->tpl_vars['detail']->value['AvgFirstViewFullyLoadedRequests'],0);?>
</td>
    <td valign="middle" align="right"><?php echo $_smarty_tpl->tpl_vars['detail']->value['AvgFirstViewFullyLoadedBytesIn']/number_format(1000,0);?>
 KB</td>
  </tr>
<?php }?>
<?php }} ?>
    </tbody>
</table><br>
  <?php }} ?>


<hr>
  <h3 align="left">Change Notes</h3>
  <table class="pretty" width="100%">
  <tr>
    <th align="left">Date</th><th align="left">Note</th>
  </tr>
  <?php  $_smarty_tpl->tpl_vars['note'] = new Smarty_Variable;
 $_from = $_smarty_tpl->getVariable('changeNotes')->value; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array');}
if ($_smarty_tpl->_count($_from) > 0){
    foreach ($_from as $_smarty_tpl->tpl_vars['note']->key => $_smarty_tpl->tpl_vars['note']->value){
?>
  <?php if ($_smarty_tpl->getVariable('eo')->value=="even"){?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("odd", null, null);?> <?php }else{ ?> <?php $_smarty_tpl->tpl_vars["eo"] = new Smarty_variable("even", null, null);?><?php }?>
    <tr class="monitoringJobRow <?php echo $_smarty_tpl->getVariable('eo')->value;?>
">
      <td><?php echo smarty_modifier_date_format($_smarty_tpl->tpl_vars['note']->value['Date'],"%Y-%m-%d %H:%M");?>
</td>
      <td align="left"><?php echo $_smarty_tpl->tpl_vars['note']->value['Label'];?>
</td>
    </tr>
  <?php }} ?>

</table>          
</div>