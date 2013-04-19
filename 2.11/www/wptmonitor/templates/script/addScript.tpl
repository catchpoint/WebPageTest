<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
    "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  <title>WPT Script</title>
  {literal}
    <script>
      $(document).ready(function() {
        $("#updateForm").validate();
      });
    </script>
  {/literal}
</head>
<body>
<div class="page">
  {include file='header.tpl'}
  {include file='navbar.tpl'}
  <div id="main">
    <div class="level_2">
      <div class="content-wrap">
          <div class="content" style="height:auto;">
          <br>
          <h2 class="cufon-dincond_black">Script</h2>
          <div class="translucent">
            {* If $script.Id has a value then we are editing, otherwise we are adding/creating*}
            {if $script.Id > -1}
            {assign var="requiredPermission" value=$smarty.const.PERMISSION_UPDATE}
            {else}
            {assign var="requiredPermission" value=$smarty.const.PERMISSION_CREATE_DELETE}
            {/if}
            <form method="post" class="cmxform" action="updateScript.php" id="updateForm">
              <input type="hidden" name="id" value="{$script.Id}">
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
                  <td align="right"><label for="label">Label</label></td>
                  <td><input type="text" size="80" name="label" id="label" value="{$script.Label}" class="required">
                  </td>
                </tr>
                <tr>
                  <td align="right"><label for="description">Description</label></td>
                  <td><textarea id="description" name="description"
                                style="height:30px;width:500px">{$script.Description}</textarea></td>
                </tr>
                <tr>
                  <td align="right"><label for="url">URL</label></td>
                  <td><input type="text" id="url" name="url" value="{$script.URL}" class="required url"
                             style="width:500px;"></td>
                </tr>
                <tr>
                  <td align="right"><label for="urlscript">Data Script</label></td>
                  <td><textarea id="urlscript" name="urlscript"
                                style="height:80px;width:500px">{$script.URLScript}</textarea></td>
                </tr>
                <tr>
                  <td align="right"><label for="navigationscript">Navigation Script</label></td>
                  <td><textarea id="navigationscript" name="navigationscript"
                                style="height:180px;width:500px">{$script.NavigationScript}</textarea></td>
                </tr>
                {*<tr>*}
                  {*<td></td>*}
                  {*<td>*}
                    {*<hr>*}
                  {*</td>*}
                {*</tr>*}
                {*<tr>*}
                  {*<td align="right"><label><a class="tooltip" name="multistep">Multi*}
                    {*Step<span>Multi Step/Page Test</span></a></label></span></td>*}
                  {*<td><input type="checkbox" name="multistep" value="1" {if $script.MultiStep}checked="true" {/if}/>*}
                  {*</td>*}
                {*</tr>*}
                <tr>
                  <td></td>
                  <td>
                    <hr>
                  </td>
                </tr>
                <tr>
                  <td align="right"><label><a class="tooltip" name="validate">Validate<span>Apply validation rule</span></a></label></span>
                  </td>
                  <td><input type="checkbox" name="validate" value="1" {if $script.Validate}checked="true" {/if}/></td>
                </tr>
                <tr>
                  <td align="right"><label for="validationrequest">Validation Request</label></td>
                  <td><input type="text" id="validationrequest" name="validationrequest" size="120"
                             value="{$script.ValidationRequest}"></td>
                </tr>
                <tr>
                  <td align="right"><label for="validationtype">Validation Type</label></td>
                  <td>
                    <select id="validationtype" name="validationtype">
                      <option value="0" {if $script.ValidationType eq '0'}selected="true"{/if}></option>
                      <option value="1" {if $script.ValidationType eq '1'}selected="true"{/if}>Matches</option>
                      <option value="2" {if $script.ValidationType eq '2'}selected="true"{/if}>Does not Match</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td align="right"><label for="validationmarkas">Mark As</label></td>
                  <td>
                    <select id="validationmarkas" name="validationmarkas">
                      <option value="0" {if $script.ValidationMarkAs eq '0'}selected="true"{/if}></option>
                      <option value="1" {if $script.ValidationMarkAs eq '1'}selected="true"{/if}>Valid</option>
                      <option value="2" {if $script.ValidationMarkAs eq '2'}selected="true"{/if}>Invalid</option>
                      <option value="3" {if $script.ValidationMarkAs eq '3'}selected="true"{/if}>Needs Review</option>
                    </select>
                  </td>
                </tr>
                <tr>
                <tr>
                  <td align="right"><label for="validationmarkaselse">Else Mark As</label></td>
                  <td>
                    <select id="validationmarkaselse" name="validationmarkaselse">
                      <option value="0" {if $script.ValidationMarkAsElse eq '0'}selected="true"{/if}></option>
                      <option value="1" {if $script.ValidationMarkAsElse eq '1'}selected="true"{/if}>Valid</option>
                      <option value="2" {if $script.ValidationMarkAsElse eq '2'}selected="true"{/if}>Invalid</option>
                      <option value="3" {if $script.ValidationMarkAsElse eq '3'}selected="true"{/if}>Needs Review
                      </option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td></td>
                  <td>
                    <hr>
                  </td>
                </tr>
                <tr>
                  <td align="right"><label><a
                      class="tooltip">Authenticate<span>Provide authentication information</span></a></label></td>
                  <td><input type="checkbox" name="authenticate" value="1"
                             {if $script.Authenticate}checked="true" {/if}/></td>
                </tr>
                <tr>
                  <td align="right"><label for="authuser">Username</label></td>
                  <td><input autocomplete="off" type="text" id="authuser" name="authuser" size="40"
                             value="{$script.AuthUser}"></td>
                </tr>
                <tr>
                <tr>
                  <td align="right"><label for="authpassword">Password</label></td>
                  <td><input autocomplete="off" type="password" id="authpassword" name="authpassword" size="40"
                             value="{$script.AuthPassword}"></td>
                </tr>
                <tr>
                  <td></td>
                  <td><input type="submit" value="Save"></td>
                </tr>
              </table>
            </form>
          </div>
        </div>
      </div>
    </div>
</body>
</html>
