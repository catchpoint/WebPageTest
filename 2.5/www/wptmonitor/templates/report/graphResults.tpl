<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">

<html>
<head>
 {include file="headIncludes.tpl"}

{literal}
<script>
var tzoffset={/literal}{$tzoffset}{literal};
</script>
</script>
<script>
/*
 * Date Format 1.2.3
 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
 * MIT license
 *
 * Includes enhancements by Scott Trenda <scott.trenda.net>
 * and Kris Kowal <cixar.com/~kris.kowal/>
 *
 * Accepts a date, a mask, or a date and a mask.
 * Returns a formatted version of the given date.
 * The date defaults to the current date/time.
 * The mask defaults to dateFormat.masks.default.
 */

var dateFormat = function () {
	var	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
		timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
		timezoneClip = /[^-+\dA-Z]/g,
		pad = function (val, len) {
			val = String(val);
			len = len || 2;
			while (val.length < len) val = "0" + val;
			return val;
		};

	// Regexes and supporting functions are cached through closure
	return function (date, mask, utc) {
		var dF = dateFormat;

		// You can't provide utc if you skip other args (use the "UTC:" mask prefix)
		if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
			mask = date;
			date = undefined;
		}

		// Passing date through Date applies Date.parse, if necessary
		date = date ? new Date(date) : new Date;
		if (isNaN(date)) throw SyntaxError("invalid date");

		mask = String(dF.masks[mask] || mask || dF.masks["default"]);

		// Allow setting the utc argument via the mask
		if (mask.slice(0, 4) == "UTC:") {
			mask = mask.slice(4);
			utc = true;
		}

		var	_ = utc ? "getUTC" : "get",
			d = date[_ + "Date"](),
			D = date[_ + "Day"](),
			m = date[_ + "Month"](),
			y = date[_ + "FullYear"](),
			H = date[_ + "Hours"](),
			M = date[_ + "Minutes"](),
			s = date[_ + "Seconds"](),
			L = date[_ + "Milliseconds"](),
			o = utc ? 0 : date.getTimezoneOffset(),
			flags = {
				d:    d,
				dd:   pad(d),
				ddd:  dF.i18n.dayNames[D],
				dddd: dF.i18n.dayNames[D + 7],
				m:    m + 1,
				mm:   pad(m + 1),
				mmm:  dF.i18n.monthNames[m],
				mmmm: dF.i18n.monthNames[m + 12],
				yy:   String(y).slice(2),
				yyyy: y,
				h:    H % 12 || 12,
				hh:   pad(H % 12 || 12),
				H:    H,
				HH:   pad(H),
				M:    M,
				MM:   pad(M),
				s:    s,
				ss:   pad(s),
				l:    pad(L, 3),
				L:    pad(L > 99 ? Math.round(L / 10) : L),
				t:    H < 12 ? "a"  : "p",
				tt:   H < 12 ? "am" : "pm",
				T:    H < 12 ? "A"  : "P",
				TT:   H < 12 ? "AM" : "PM",
				Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
				o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
				S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
			};

		return mask.replace(token, function ($0) {
			return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
		});
	};
}();

// Some common format strings
dateFormat.masks = {
	"default":      "ddd mmm dd yyyy HH:MM:ss",
	shortDate:      "m/d/yy",
	mediumDate:     "mmm d, yyyy",
	longDate:       "mmmm d, yyyy",
	fullDate:       "dddd, mmmm d, yyyy",
	shortTime:      "h:MM TT",
	mediumTime:     "h:MM:ss TT",
	longTime:       "h:MM:ss TT Z",
	isoDate:        "yyyy-mm-dd",
	isoTime:        "HH:MM:ss",
	isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
	isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
	dayNames: [
		"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
		"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
	],
	monthNames: [
		"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
		"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
	]
};

// For convenience...
Date.prototype.format = function (mask, utc) {
	return dateFormat(this, mask, utc);
};

</script>
<!--[if IE]><script type="text/javascript" src="js/flot/excanvas.js"></script><![endif]-->

  <script src="http://code.jquery.com/jquery-latest.js"></script>
  <script language="javascript" type="text/javascript" src="js/flot/jquery.flot.js"></script>
  <script type="text/javascript" src="http://dev.jquery.com/view/trunk/plugins/validate/jquery.validate.js"></script>
  <style type="text/css">
    label.error { font-size:small; float:none; color: red; padding-left: .5em; vertical-align: top; }
    p { clear: both; }
    .submit { margin-left: 12em; }
    em { font-weight: bold; padding-right: 1em; vertical-align: top; }
  </style>
  <script>
  $(document).ready(function(){
    $("#updateForm").validate();
  });
  </script>
  <script type="text/javascript">
    function disableTrim(val){
      if ( val != 1 ){
        document.getElementById("trimAbove").value = "";
        document.getElementById("trimAbove").readOnly = true;
        document.getElementById("trimBelow").value = "";
        document.getElementById("trimBelow").readOnly = true;

    } else {
        document.getElementById("trimAbove").readOnly = false;
        document.getElementById("trimBelow").readOnly = false;
    }
    }
  {/literal}
  {include_php file='graphResultsGenJS.php'}
  {literal}
    function plotGraph(){
      $.plot($("#placeholder"), d ,{
               series: {
                   lines: { show: true },
                   points: { show: true }
               },
               xaxis: { ticks: 20,
               tickFormatter: function (val, axis) {

      var d = new Date(0)
      var offset = d.getTimezoneOffset();
      d.setSeconds(val-offset);
      return dateFormat(d,"m/dd") + "<br>" +dateFormat(d,"H:m");

              }},
               yaxis: { ticks: null,
               tickFormatter: function (val, axis) {
                return (val/1000)+" s" ;
              }},

               grid: { hoverable: true, clickable: true }
        });
    function showTooltip(x, y, contents) {
        $('<div id="tooltip">' + contents + '</div>').css( {
            position: 'absolute',
            display: 'none',
            top: y + 5,
            left: x + 5,
            border: '1px solid #fdd',
            padding: '2px',
            'background-color': '#fee',
            opacity: 0.80
        }).appendTo("body").fadeIn(200);
    }
      var previousPoint = null;
     $("#placeholder").bind("plothover", function (event, pos, item) {
        $("#x").text(pos.x.toFixed(2));
        $("#y").text(pos.y.toFixed(2));
//        if ($("#enableTooltip:checked").length > 0) {

//        if ($("#enableTooltip:checked").length > 0) {
            if (item) {
                if (previousPoint != item.datapoint) {
                    previousPoint = item.datapoint;

                    $("#tooltip").remove();
                    var x = item.datapoint[0].toFixed(2),
                        y = item.datapoint[1].toFixed(2);

                    toolTipContents =item.series.label;
                    key = item.series.job +''+item.datapoint[0];

                    if ( dataIds[key]){
                      if (item.series.label == "Change Notes"){
                        toolTipContents +="<br><a target='_blank' href=listChangeNotes.php?filterField=Id&filterValue="+dataIds[item.series.job+item.datapoint[0]]+">"+dataIds[item.series.job+item.datapoint[0]]+"</a>";
                      } else {

                        toolTipContents += " "+ (y/1000).toFixed(2) + " Seconds";
                        toolTipContents +="<br><a target='_blank' href=listResults.php?filterField=Id&filterValue="+dataIds[item.series.job+item.datapoint[0]]+">Result</a>";
                      }
                     } else {
                       toolTipContents += " "+ (y/1000).toFixed(2) + " Seconds";
                      }
                    showTooltip(item.pageX, item.pageY,toolTipContents);
                }
            }
            else {
                $("#tooltip").remove();
                previousPoint = null;
            }
    });

    $("#placeholder").bind("plotclick", function (event, pos, item) {
        if (item) {
          if ( item.series.job != "Change Notes" && dataIds[item.series.job+item.datapoint[0]]){
            window.open("listResults.php?filterField=Id&filterValue="+dataIds[item.series.job+item.datapoint[0]],'Results')
        } else {
//TODO: Finish proper zoom in logic
//          var selectedTime = item.datapoint[0];
//          var resolution = document.getElementById("resolution");
//          var time = endTime - startTime;
//          var startTime = selectedTime - ( time/2 );
//          var endTime = selectedTime + ( time/2);
//          resolution.selectedIndex = resolution.selectedIndex - 1;
//
//          document.getElementById("startTime").value = startTime;
//          document.getElementById("endTime").value = endTime;
//          document.updateForm.submit();
//          alert();
        }
//            $("#clickdata").text("You clicked point " + item.dataIndex + " in " + item.series.label + ".");
//            plot.highlight(item.series, item.datapoint);
        }
    });
    }
  </script>
  <script type="text/javascript" src="js/canvas2image.js"></script>
  <script type="text/javascript" src="js/base64.js"></script>
{/literal}
</head>
<body onload="plotGraph();">
<div class="page">
  {include file='header.tpl'}
  {include file='navbar.tpl'}
    <div id="main">
     <div class="level_2">
     <div class="content-wrap">
       <div class="content">
       {*<h2 class="cufon-dincond_black">Graphs</h2>*}
        {*<div id="main" style="width:100%">*}
              {*<div>WPT Result ID: {$res.WPTResultId}</div><br>*}
                    <form  name="updateForm" class="cmxform" action="graphResults.php" id="updateForm">
              <table>
                <tr>
                  <td align="left" valign="top">
                    Job(s):
                    <input type="checkbox" name="showInactiveJobs" value="true"{if $showInactiveJobs}checked="true" {/if}>Inactive<br>
                    <select multiple="true" name="job_id[]" size="9" style="width:330px;">{html_options options=$jobs selected=$job_ids}</select>
                  </td>
                  <td></td>
                  <td valign="bottom">
                    <input type="checkbox" name="ttfb" {if $options.ttfb}checked="true"{/if}> Time to First Byte
                    <br><input type="checkbox" name="startRender" {if $options.startRender}checked="true"{/if}> Start Render
                    <br><input name="docLoaded" type="checkbox" {if $options.docLoaded}checked="true"{/if}> Doc Time
                    <br><input name="domTime" type="checkbox" {if $options.domTime}checked="true"{/if}> Dom Time
                    <br><input name="domTimeAdjusted" type="checkbox" {if $options.domTimeAdjusted}checked="true"{/if}> DocTime-DomTime
                    <br><input name="fullyTime" type="checkbox" {if $options.fullyTime}checked="true"{/if}> Fully Loaded
                  </td>
                  <td valign="top" align="right">
                    <input id="startTime" type="hidden" name="startTime">
                    <input id="endTime" type="hidden" name="endTime">
                    Start: {html_select_date start_year='2010' prefix='start' time=$startTime} {html_select_time prefix='start' time=$startTime display_minutes=false display_seconds=false}<br>
                    End: {html_select_date start_year='2010' prefix='end' time=$endTime} {html_select_time prefix='end' time=$endTime display_minutes=false display_seconds=false}<br>
                    <input type="checkbox" name="useRepeatView" {if $useRepeatView}checked="true" {/if}> Use Repeat View |
                    Resolution: <select id="resolution" name="resolution">
                      <option {if $resolution eq 0}selected="true"{/if} value="0">Auto</option>
                      <option {if $resolution eq 1}selected="true"{/if} value="1">Max</option>
                      <option {if $resolution eq 300}selected="true"{/if} value="300">5 Minutes</option>
                      <option {if $resolution eq 900}selected="true"{/if} value="900">15 Minutes</option>
                      <option {if $resolution eq 1800}selected="true"{/if} value="1800">30 Minutes</option>
                      <option {if $resolution eq 3600}selected="true"{/if} value="3600">1 Hour</option>
                      <option {if $resolution eq 10800}selected="true"{/if} value="10800">3 Hours</option>
                      <option {if $resolution eq 21600}selected="true"{/if} value="21600">6 Hours</option>
                      <option {if $resolution eq 43200}selected="true"{/if} value="43200">12 Hours</option>
                      <option {if $resolution eq 86400}selected="true"{/if} value="86400">Daily</option>
                      <option {if $resolution eq 604800}selected="true"{/if} value="604800">Weekly</option>
                    </select>{if $resolutionAuto}{$resolutionAuto}{/if}<hr>
                    Filter Using: <select name="adjustUsing">
                    <option value="AvgFirstViewFirstByte" {if $adjustUsing eq 'AvgFirstViewFirstByte'}selected="true"{/if}>Time to first byte</option>
                    <option value="AvgFirstViewStartRender"{if $adjustUsing eq 'AvgFirstViewStartRender'}selected="true"{/if}>Start Render</option>
                    <option value="AvgFirstViewDocCompleteTime"{if $adjustUsing eq 'AvgFirstViewDocCompleteTime'}selected="true"{/if}>Doc Time</option>
                    <option value="AvgFirstViewDomTime"{if $adjustUsing eq 'AvgFirstViewDomTime'}selected="true"{/if}>Dom Time</option>
                    <option value="AvgFirstViewFullyLoadedTime"{if $adjustUsing eq 'AvgFirstViewFullyLoadedTime'}selected="true"{/if}>Fully Loaded</option>
                    </select><br>

                    Percentile: <select name="percentile" onchange="disableTrim(this.value);">
                      <option {if $percentile eq "1"}selected="true"{/if} value="1">Max</option>
                      <option {if $percentile eq "0.9"}selected="true"{/if} value="0.9">90th</option>
                      <option {if $percentile eq "0.8"}selected="true"{/if} value="0.8">80th</option>
                      <option {if $percentile eq "0.7"}selected="true"{/if} value="0.7">70th</option>
                      <option {if $percentile eq "0.6"}selected="true"{/if} value="0.6">60th</option>
                      <option {if $percentile eq "0.5"}selected="true"{/if} value="0.5">50th</option>
                    </select> <strong>OR</strong>
                    <label for="trimAbove">Trim  above:</label> <input class="number" id="trimAbove" type="text" name="trimAbove" size="6"  value="{$trimAbove}" {if $percentile != 1}readonly{/if}><br>
                    <label for="trimBelow">below:</label> <input class="number" id="trimBelow" type="text" name="trimBelow" size="6" value="{$trimBelow}" {if $percentile != 1}readonly{/if}>
                  </td>
                  <td valign="top" align="right">
                    <input type="submit" value="Update" ></form>
                  </td>
                  <td valign="top">
                    <form><input type="submit" value="Clear"></form>
                  </td>
                </tr>
              </table>
              {*<input type="button" onclick='alert(document.getElementById("flotCanvas"));'>*}
              {*<input type="button" onclick='Canvas2Image.saveAsPNG(document.getElementById("flotCanvas"));'>*}
            <div id="placeholder" style="width:100%;height:600px"></div>
          {*<p id="hoverdata">Mouse hovers at*}
    {*(<span id="x">0</span>, <span id="y">0</span>). <span id="clickdata"></span></p> *}
       </div>
     </div>
   </div>
 </div>
 </body>
</html>