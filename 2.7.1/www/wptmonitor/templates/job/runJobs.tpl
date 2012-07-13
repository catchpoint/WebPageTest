<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
    "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  {include file="headIncludes.tpl"}
  <title>Monitoring Job</title>
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
        <div class="content" style="height:600px">
          <br>
          <h2 class="cufon-dincond_black">Run Jobs</h2>
          <form method="get" class="cmxform" action="processJob.php" id="updateForm">
            {foreach from=$jobIds item="job_id"}
              <input type="hidden" name="job_id[]" value="{$job_id}">
            {/foreach}
            <input type="hidden" name="force" value="true">
            <input type="hidden" name="forward_to" value="listResults.php">
            <table>
              <tr>
                <td align="right"><label for="label">Job Run Label</label></td>
                <td><input type="text" name="runLabel" id="label" size="60" class="required"></td>
              </tr>
              <tr>
                <td align="right"><label for="numberofruns">Number of runs</label></td>
                <td><select name="numberofruns" id="numberofruns">
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                  <option>5</option>
                  <option>6</option>
                  <option>7</option>
                  <option>8</option>
                  <option>9</option>
                  <option>10</option>
                </select></td>
              </tr>
              <tr>
                <td></td>
                <td><input type="submit" value="Run Jobs"></td>
              </tr>
            </table>
          </form>
        </div>
      </div>
    </div>
</body>
</html>
