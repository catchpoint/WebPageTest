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
       <br><h2 class="cufon-dincond_black">Download</h2>
       <div class="content">
            <div class="translucent">

       <table>
       <tr>
        <td><form action="downloadData.php">
         <select multiple="true" name="label[]" size="8">{html_options options=$jobs selected=$job_ids}</select>
       </td>
       <td align="right" valign="top">
       Run Label <select name="runLabel">{html_options options=$runLabels values=$runLabels selected=$runLabel}</select><br>
       From {html_select_date start_year='2010' prefix="from" time=$fromDate}
       {html_select_time prefix="from" time=$fromDate display_seconds=false}<br>
       To {html_select_date start_year='2010' prefix="to" time=$toDate}
       {html_select_time prefix="to" time=$toDate display_seconds=false}<br>
       </td><td valign="top">
       <input type="submit" value="Download">
       </form>
       </td>
       </tr>
       </table>
        </div>
        </div>
        </div>
        </div>
</body>
</html>