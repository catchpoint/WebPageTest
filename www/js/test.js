if (window['wptForgetSettings'])
  var wptStorage = {};
else  
  var wptStorage = window.localStorage || {};

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
  
function ValidateInput(form)
{
    if( (form.url.value == "" || form.url.value == "Enter a Website URL") &&
        form.script.value == "" && form.bulkurls.value == "" && form.bulkfile.value == "" )
    {
        alert( "Please enter an URL to test." );
        form.url.focus();
        return false
    }
    
    if( form.url.value == "Enter a Website URL" )
        form.url.value = "";
    
    var runs = form.runs.value;
    if( runs < 1 || runs > maxRuns )
    {
        alert( "Please select a number of runs between 1 and " + maxRuns + "." );
        form.runs.focus();
        return false
    }
    
    var date = new Date();
    date.setTime(date.getTime()+(730*24*60*60*1000));
    var expires = "; expires="+date.toGMTString();
    var options = 0;
    if( form.private.checked )
        options = 1;
    if( form.viewFirst.checked )
        options = options | 2;
    document.cookie = 'testOptions=' + options + expires + '; path=/';
    document.cookie = 'runs=' + runs + expires + '; path=/';
    
    // save out the selected location and connection information
    document.cookie = 'cfg=' + $('#connection').val() + expires +  '; path=/';
    document.cookie = 'u=' + $('#bwUp').val() + expires +  '; path=/';
    document.cookie = 'd=' + $('#bwDown').val() + expires +  '; path=/';
    document.cookie = 'l=' + $('#latency').val() + expires +  '; path=/';
    document.cookie = 'p=' + $('#plr').val() + expires +  '; path=/';
    
    SaveSettings();

    return true;
}

/*
    Do any populating of the input form based on the loaded location information
*/
(function($) {
    // enable tooltips
    $("#DOMElement").tooltip({ position: "top center", offset: [-5, 0]  });  
    
    // Capture tab characters in the script input field
    $("#enter-script").keydown(function(e) {
      var $this, end, start;
      if (e.keyCode === 9) {
        start = this.selectionStart;
        end = this.selectionEnd;
        $this = $(this);
        $this.val($this.val().substring(0, start) + "\t" + $this.val().substring(end));
        this.selectionStart = this.selectionEnd = start + 1;
        return false;
      }
    });

    // handle when the selection changes for the location
    $("#location").change(function(){
        LocationChanged();
    });
    $("#location2").change(function(){
        $("#location").val($("#location2").val());
        LocationChanged();
    });

    $("#browser").change(function(){
        BrowserChanged();
    });

    $("#connection").change(function(){
        ConnectionChanged();
    });
    
    RestoreSettings();
})(jQuery);

function RestoreSettings() {
  if (!forgetSettings) {
    if (wptStorage['testVideo'] != undefined)
        $('#videoCheck').prop('checked', wptStorage['testVideo']);
    if (wptStorage['testTimeline'] != undefined)
        $('#timeline').prop('checked', wptStorage['testTimeline']);
    if (wptStorage['testLoc'] != undefined)
        $('#location').val(wptStorage['testLoc']); 
    LocationChanged();
  }
}

function SaveSettings() {
  if (!forgetSettings) {
    wptStorage['testVideo'] = $('#videoCheck').is(':checked');
    wptStorage['testTimeline'] = $('#timeline').is(':checked');
  }
}

/*
    Populate the different browser options for a given location
*/
function LocationChanged()
{
    $("#current-location").text($('#location option:selected').text());
    var loc = $('#location').val(); 
    $('#location2').val(loc); 
    wptStorage['testLoc'] = loc;

    var marker = locations[loc]['marker'];
    try{
        marker.setIcon('/images/map_green.png');
    }catch(err){}
    try{
        selectedMarker.setIcon('/images/map_red.png');
    }catch(err){}
    selectedMarker = marker;
    
    var browsers = [];
    var defaultConfig = locations[loc]['default'];
    if( defaultConfig == undefined )
        defaultConfig = locations[loc]['1'];
    var defaultBrowser = locations[defaultConfig]['browser'];
    
    // build the list of browsers for this location
    for( var key in locations[loc] )
    {
        // only care about the integer indexes
        if( !isNaN(key) )
        {
            var config = locations[loc][key];
            var browser = locations[config]['browser'];
            if( browser != undefined )
            {
                // see if we already know about this browser
                var browserKey = browser.replace(" ","");
                browsers[browserKey] = browser;
            }
        }
    }
    
    // fill in the browser list, selecting the default one
    browserHtml = '';
    for( var key in browsers )
    {
        var browser = browsers[key];
        var selected = '';
        if( browser == defaultBrowser )
            selected = ' selected';
        var display=browser;
        if (display == 'Safari')
            display = 'Safari (Windows)';
        browserHtml += '<option value="' + htmlEntities(key) + '"' + selected + '>' + htmlEntities(display) + '</option>';
    }
    $('#browser').html(browserHtml);
    
    if (wptStorage['testBrowser'] != undefined)
        $('#browser').val(wptStorage['testBrowser']); 

    BrowserChanged();
    
    UpdateSponsor();
}

/*
    Populate the various connection types that are available
*/
function BrowserChanged()
{
    var loc = $('#location').val();
    var selectedBrowser = $('#browser').val();
    var defaultConfig = locations[loc]['default'];
    var selectedConfig;
    wptStorage['testBrowser'] = selectedBrowser;
    
    var connections = [];

    // build the list of connections for this location/browser
    for( var key in locations[loc] )
    {
        // only care about the integer indexes
        if( !isNaN(key) )
        {
            var config = locations[loc][key];
            var browser = locations[config]['browser'].replace(" ","");;
            if( browser == selectedBrowser )
            {
                if( locations[config]['connectivity'] != undefined )
                {
                    connections[config] = {'label': locations[config]['connectivity']};
                    if( config == defaultConfig )
                        selectedConfig = config;
                } else if( locations[config]['connections'] != undefined ) {
                    for( var conn in locations[config]['connections'] ) {
                        var conn_id = locations[config]['connections'][conn]['id'];
                        var conn_group = locations[config]['connections'][conn]['group'];
                        var conn_label = locations[config]['connections'][conn]['label'];
                        if( selectedConfig == undefined )
                            selectedConfig = config + '.' + conn_id;
                        connections[config + '.' + conn_id] = {'group': conn_group, 'label': conn_group + ' - ' + conn_label};
                    }
                } else {
                    for( var conn in connectivity )
                    {
                        if( selectedConfig == undefined )
                            selectedConfig = config + '.' + conn;
                        connections[config + '.' + conn] = {'label': connectivity[conn]['label']};
                    }
                    
                    connections[config + '.custom'] = {'label': 'Custom'};
                    if( selectedConfig == undefined )
                        selectedConfig = config + '.custom';
                }
            }
        }
    }
    
    // if the default configuration couldn't be selected, pick the first one
    if( selectedConfig == undefined )
    {
        for( var config in connections )
        {
            selectedConfig = config;
            break;
        }
    }
    
    // build the actual list
    connectionHtml = '';
    var lastGroup = undefined;
    for( var config in connections ) {
        var selected = '';
        if( config == selectedConfig )
            selected = ' selected';
        if (connections[config]['group'] != undefined && connections[config]['group'] != lastGroup) {
          if (lastGroup != undefined)
            connectionHtml += "</optgroup>";
          if (connections[config]['group'].length) {
            lastGroup = connections[config]['group'];
            connectionHtml += '<optgroup label="' + htmlEntities(connections[config]['group']) + '">';
          } else
            lastGroup = undefined;
        }
        connectionHtml += '<option value="' + htmlEntities(config) + '"' + selected + '>' + htmlEntities(connections[config]['label']) + '</option>';
    }
    $('#connection').html(connectionHtml);
    
    if (wptStorage['testConnection'] != undefined) {
        var connection = wptStorage['testConnection'];
        $('#connection option:contains(' +  connection + ')').each(function(){
            if ($(this).text() == connection) {
                $(this).attr('selected', 'selected');
            }
        });
    }

    ConnectionChanged();
}

/*
    Populate the specifics of the connection information
*/
function ConnectionChanged()
{
    var conn = $('#connection').val();
    wptStorage['testConnection'] = $('#connection option:selected').text();
    if( conn != undefined && conn.length )
    {
        var parts = conn.split('.');
        var config = parts[0];
        var connection = parts[1];
        var setSpeed = true;
        
        var backlog = locations[config]['backlog'];

        var up = locations[config]['up'] / 1000;
        var down = locations[config]['down'] / 1000;
        var latency = locations[config]['latency'];
        var plr = 0;
        if( connection != undefined && connection.length ) {
            if( connectivity[connection] != undefined ) {
                up = connectivity[connection]['bwOut'] / 1000;
                down = connectivity[connection]['bwIn'] / 1000;
                latency = connectivity[connection]['latency'];
                if( connectivity[connection]['plr'] != undefined )
                    plr = connectivity[connection]['plr'];
            } else {
                setSpeed = false;
            }
        }

        if( setSpeed ) {
            $('#bwDown').val(down);
            $('#bwUp').val(up);
            $('#latency').val(latency);
            $('#plr').val(plr);
        }
        
        // enable/disable the fields as necessary
        if( connection == 'custom' )
            $('#bwTable').show();
        else
            $('#bwTable').hide();
        
        $('#backlog').text(backlog);
        if( backlog < 5 )
            $('#pending_tests').removeClass('backlogWarn , backlogHigh').addClass('hidden');
        else if( backlog < 20 )
            $('#pending_tests').removeClass('backlogHigh , hidden').addClass("backlogWarn");
        else
            $('#pending_tests').removeClass('backlogWarn , hidden').addClass("backlogHigh");

        UpdateSettingsSummary();
    }
}

/*
    Update the location sponsor
*/
function UpdateSponsor()
{
    var loc = $('#location').val(); 
    var spon = new Array();

    // build the list of sponsors for this location
    for( var key in locations[loc] )
    {
        // only care about the integer indexes
        if( !isNaN(key) )
        {
            var config = locations[loc][key];
            var sponsor = locations[config]['sponsor'];
            if( sponsor != undefined && sponsor.length && sponsors[sponsor] != undefined )
            {
                // avoid duplicates
                var found = false;
                for( var index in spon )
                    if( spon[index] == sponsor )
                        found = true;
                
                if( !found )
                    spon.push(sponsor);
            }
        }
    }
    
    if( spon.length )
    {
        var html = '<p class="centered"><small>Provided by</small></p>';
        var count = 0;
        
        // randomize the list
        if( spon.length > 1 )
            spon.sort(function() {return 0.5 - Math.random()});
        
        for( var index in spon )
        {
            var sponsor = spon[index];
            var s = sponsors[sponsor];
            if( s != undefined )
            {
                var sponsorTxt = '';
                var sponsorHref = '';
                var sponsorDiv = '';

                if( s["logo"] != undefined && s["logo"].length ) {
                    sponsorDiv = '<div class="sponsor_logo" style="background-image: url(' +
                                  s["logo"] + '); background-position: 0px ' + s["offset"] + 'px; margin-left: auto; margin-right: auto;"></div>';
                }
                    
                if( s["alt"] != undefined && s["alt"].length )
                    sponsorTxt = ' title="' + s["alt"] + '"';

                if( s["href"] != undefined && s["href"].length )
                    sponsorHref = s["href"];
                
                if(sponsorDiv.length)
                {
                    if( count )
                        html += '<p class="centered nomargin"><small>and</small></p>';

                    html += '<div class="centered nomargin">';
                    if( sponsorHref.length ) {
                        html += '<a class="sponsor_link" href="' + sponsorHref + '"' + sponsorTxt + '>';
                    }
                    
                    html += sponsorDiv;
                    
                    if( sponsorHref.length )
                        html += '</a>';
                    
                    html += '</div>';
                
                    count++;
                }
            }
        }
        
        $('#sponsor').html(html);
        $('#sponsor').show();
    }
    else
        $('#sponsor').hide();
}

/*
    Update the summary text with the current test settings
*/
function UpdateSettingsSummary()
{
    var summary = '';

    var runs = $('#number_of_tests').val();
    summary += runs;
    if( runs == 1 )
        summary += " run";
    else
        summary += " runs";
        
    if( $('#viewFirst').attr('checked') )
        summary += ", First View only";
        
    var conn = $('#connection option:selected').text();
    if( conn != undefined )
        summary += ", " + conn.replace(/\((.)*\)/,'') + " connection";
        
    if( $('#keep_test_private').attr('checked') )
        summary += ", private";
    else
        summary += ", results are public";
        
    $('#settings_summary').text(summary);
}

/*
    Show the multiple location selection dialog
*/
function OpenMultipleLocations()
{
    document.getElementById('multiple-location-dialog').style.display = 'block'; 
}

/*
    Close the multiple location selection dialog.
*/
function CloseMultipleLocations()
{
    document.getElementById('multiple-location-dialog').style.display = 'none'; 
}

/*
    Pop up the location selection dialog
*/
var map;
var selectedMarker;
function SelectLocation()
{
    $("#location-dialog").modal({opacity:80});
    $('#location2').val($('#location').val()); 
   
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://maps.google.com/maps/api/js?v=3.1&sensor=false&callback=InitializeMap";
    document.body.appendChild(script);
    
    return false;
}

function InitializeMap()
{
    var myLatlng = new google.maps.LatLng(15,17);
    var myOptions = {
        zoom: 2,
        center: myLatlng,
        mapTypeControl: false,
        navigationControl: true,
        navigationControlOptions: {style: google.maps.NavigationControlStyle.SMALL},
        mapTypeId: google.maps.MapTypeId.ROADMAP
    }
    var map = new google.maps.Map(document.getElementById("map"), myOptions);

    var currentLoc = $('#location').val();
    for( var loc in locations )
    {
        if( locations[loc]['lat'] != undefined && locations[loc]['lng'] != undefined )
        {
            var pos = new google.maps.LatLng(locations[loc]['lat'], locations[loc]['lng']);
            var marker = new google.maps.Marker({
                position: pos,
                title:locations[loc]['label'],
                icon:'/images/map_red.png',
                map: map
            });
            
            if( loc == currentLoc )
            {
                marker.setIcon('/images/map_green.png');
                selectedMarker = marker;
            }
            
            locations[loc]['marker'] = marker;
            
            AttachClickEvent(marker, loc);
        }
    }
    
}

function AttachClickEvent(marker, loc)
{
    google.maps.event.addListener(marker, 'click', function() {
        $('#location').val(loc);
        LocationChanged();
    });
}