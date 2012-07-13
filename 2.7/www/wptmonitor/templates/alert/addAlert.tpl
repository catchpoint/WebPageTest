<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
    "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
 {include file="headIncludes.tpl"}
  <title>Alert</title>
  {literal}

  <script>
  function updateAlertType(){
    var alertType = document.getElementById("alertOnType").selectedIndex;
    var alertOnResponseCode= document.getElementById("alertOnResponseCode");
    var alertOnResponseTime= document.getElementById("alertOnResponseTime");
    var alertOnValidationCode= document.getElementById("alertOnValidationCode");
    var comparisonOperator = document.getElementById("comparisonOperator");
    var alertOnValue = document.getElementById("alertOnValue");
    var alertOnValueField = document.getElementById("alertOnValueField");
    if ( alertType == 0 ){
      alertOnResponseCode.style.visibility="visible";
      alertOnResponseTime.style.visibility="hidden";
      alertOnValidationCode.style.visibility="hidden";
      comparisonOperator.style.visibility="visible";
      alertOnValue.style.visibility="hidden";
      alertOnValueField.value = "0";

    } else     if ( alertType == 1 ){
      alertOnResponseCode.style.visibility="hidden";
      alertOnResponseTime.style.visibility="visible";
      alertOnValidationCode.style.visibility="hidden";
      comparisonOperator.style.visibility="visible";
      alertOnValue.style.visibility="visible";

    } else     if ( alertType == 2 ){
      alertOnResponseCode.style.visibility="hidden";
      alertOnResponseTime.style.visibility="hidden";
      alertOnValidationCode.style.visibility="visible";
      comparisonOperator.style.visibility="visible";
      alertOnValue.style.visibility="hidden";
      alertOnValueField.value = "0";
    }
  }
  $(document).ready(function(){
    $("#updateForm").validate();
  });
  </script>
{/literal}
</head>
<body onload="updateAlertType()">
  <div class="page">
  {include file='header.tpl'}
  {include file='navbar.tpl'}
    <div id="main">
     <div class="level_2">
     <div class="content-wrap">
       <div class="content" style="height:auto;">
       <br><h2 class="cufon-dincond_black">Alert</h2>
  <div class="translucent">
    {* If $alert.Id has a value then we are editing, otherwise we are adding/creating*}
  {if $alert.Id > -1}
    {assign var="requiredPermission" value=$smarty.const.PERMISSION_UPDATE}
  {else}
    {assign var="requiredPermission" value=$smarty.const.PERMISSION_CREATE_DELETE}
  {/if}
  <form method="post" class="cmxform" action="updateAlert.php" id="updateForm">
  <input type="hidden" name="id" value="{$alert.Id}">
  <input type="hidden" name="active" value="{$alert.Active}">
    <table>
      <tr>
        <td align="right"><label>Folder</label></td>
        <td>
        <select name="folderId">
            {html_select_tree permission=$requiredPermission shares=$shares tree=$folderTree selected=$folderId}
        </select>
        </td>
      </tr>
      <tr>
        <td align="right" ><label for="label">Label</label></td>
        <td><input type="text" name="label" id="label" value="{$alert.Label}" size="60" class="required"></td>
      </tr>
       <tr>
        <td align="right"><label for="description">Description</label></td>
        <td><textarea id="description" name="description" style="height:40px;width:500px">{$alert.Description}</textarea></td>
      </tr>
       <tr>
        <td align="right"><label title="One address per line." for="emailaddresses">Email Addresses</label></td>
        <td><textarea id="emailaddresses" name="emailaddresses" style="height:40px;width:500px">{$alert.EmailAddresses}</textarea></td>
      </tr>
     <tr>
        <td align="right"><label for="alertontype">Type of Alert</label></td>
        <td><select name="alertOnType" id="alertOnType" onchange="updateAlertType()">
         <option {if $alert.AlertOnType eq 'Response Code'}selected="true" {/if}>Response Code</option>
         <option {if $alert.AlertOnType eq 'Response Time'}selected="true" {/if}>Response Time</option>
         <option {if $alert.AlertOnType eq 'Validation Code'}selected="true" {/if}>Validation Code</option>
          </select></td>
      </tr>
      <tr>
        <td align="right"><label>Alert On</label></td>
        <td style="padding-bottom:2em;">
        <div id="alertOnResponseTime" style="visibility:hidden;position:absolute;">
          <select name="alertOnResponseTime" >
            <option {if $alert.AlertOn eq 'AvgFirstViewFirstByte'}selected="true" {/if} value="AvgFirstViewFirstByte">Time to first byte</option>
            <option {if $alert.AlertOn eq 'AvgFirstViewStartRender'}selected="true" {/if}value="AvgFirstViewStartRender">Start render</option>
            <option {if $alert.AlertOn eq 'AvgFirstViewDocCompleteTime'}selected="true" {/if}value="AvgFirstViewDocCompleteTime">Document loaded</option>
            <option {if $alert.AlertOn eq 'AvgFirstViewDomTime'}selected="true" {/if}value="AvgFirstViewDomTime">Dom marker</option>
            <option {if $alert.AlertOn eq 'AvgFirstViewFullyLoadedTime'}selected="true" {/if}value="AvgFirstViewFullyLoadedTime">Fully Loaded</option>
         </select>
         </div>
         <div id="alertOnValidationCode" style="visibility:hidden;position:absolute;">
           <select name="alertOnValidationCode" >
            <option {if $alert.AlertOn eq '1'}selected="true" {/if}value="1">Valid</option>
            <option {if $alert.AlertOn eq '2'}selected="true" {/if}value="2">Invalid</option>
            <option {if $alert.AlertOn eq '3'}selected="true" {/if}value="3">Needs Review</option>
          </select>
         </div>
         <div id="alertOnResponseCode" style="visibility:hidden;position:absolute;">
             <select name="alertOnResponseCode" >
               {html_options options=$wptResultStatusCodes selected=$alert.AlertOn}
            </select>
         </div>
         </td>
       </tr>
      <tr id="comparisonOperator">
        <td align="right"><label for="alertoncomparator">Comparison Operator</label></td>
        <td><select name="alertOnComparator" id="alertoncomparator">
         <option {if $alert.AlertOnComparator eq 'equals'}selected="true" {/if}>equals</option>
         <option {if $alert.AlertOnComparator eq 'not equals'}selected="true" {/if}>not equals</option>
         <option {if $alert.AlertOnComparator eq 'greater than'}selected="true" {/if}>greater than</option>
         <option {if $alert.AlertOnComparator eq 'less than'}selected="true" {/if}>less than</option>
          </select></td>
      </tr>
      <tr id="alertOnValue">
        <td align="right"><label for="alertonvalue">Alert On Value</label></td>
        <td>
          <input type="text" id="alertOnValueField" name="alertOnValue"  value="{$alert.AlertOnValue}" class="required number"> Seconds
         </td>
       </tr>
     <tr>
        <td align="right"><label for="alertthreshold">Alert Threshold</label></td>
        <td>
        <select name="alertThreshold" id="alertthreshold">
          <option {if $alert.AlertThreshold eq 1}selected="true" {/if}>1</option>
          <option {if $alert.AlertThreshold eq 2}selected="true" {/if}>2</option>
          <option {if $alert.AlertThreshold eq 3}selected="true" {/if}>3</option>
          <option {if $alert.AlertThreshold eq 4}selected="true" {/if}>4</option>
          <option {if $alert.AlertThreshold eq 5}selected="true" {/if}>5</option>
          </select></td>
      </tr>

      <tr>
        <td></td>
        <td>
            <input type="submit" value="Save"></td>
      </tr>
    </table>
  </form>
  </div>
  </div>
  </div>
</div>
</body>
</html>
