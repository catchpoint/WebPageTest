{literal}
<script type="text/javascript">
    function changeResultsPerPage(count){
    originalLocation = "{/literal}{$smarty.server.REQUEST_URI}{literal}";
  loc = RemoveParameterFromUrl(originalLocation, "currentPage");

  if (loc.indexOf("?") > -1) {
    loc = loc + "&";
  } else {
    loc = loc + "?";
  }
    loc = loc + {/literal}"resultsPerPage={literal}"+count.value;
  document.location = loc;
}
    function changePage(pager){
    originalLocation = "{/literal}{$smarty.server.REQUEST_URI}{literal}";
  loc = RemoveParameterFromUrl(originalLocation, "currentPage");

  if (loc.indexOf("?") > -1) {
    loc = loc + "&";
  } else {
    loc = loc + "?";
  }
  selected = pager.selectedIndex;
    loc = loc + {/literal}"currentPage={literal}"+pager[selected].value;
  document.location = loc;
}

function RemoveParameterFromUrl(url, parameter) {

  var urlparts = url.split('?');
  if (urlparts.length >= 2) {

    var prefix = encodeURIComponent(parameter) + '=';
    var pars = urlparts[1].split(/[&;]/g);
    for (var i = pars.length; i-- > 0;)
      if (pars[i].lastIndexOf(prefix, 0) !== -1)
        pars.splice(i, 1);
    url = urlparts[0] + '?' + pars.join('&');

  }
  return url;
}
</script>
{/literal}

Page <select name="pager" onchange="changePage(this);">{section name=res loop=$maxpages}
  {if ($smarty.section.res.index+1) eq $currentPage}
    <option selected="true"> {else}
  <option>{/if}{$smarty.section.res.index+1}</option>
    {if ($smarty.section.res.index+1) eq $currentPage}</B>{/if}
  {/section}
</select>
of {$maxpages}
<br>Per Page <select name="resultsPerPage" onchange="changeResultsPerPage(this);">
  <option {if 15 eq $resultsPerPage} selected="true"{/if}>15</option>
  <option {if 20 eq $resultsPerPage} selected="true"{/if}>20</option>
  <option {if 25 eq $resultsPerPage} selected="true"{/if}>25</option>
  <option {if 30 eq $resultsPerPage} selected="true"{/if}>30</option>
  <option {if 40 eq $resultsPerPage} selected="true"{/if}>40</option>
  <option {if 100 eq $resultsPerPage} selected="true"{/if}>100</option>
</select>
