var CloseRequestDialog = function(hash) {
    hash.w.hide();
    for (i=1;i<=wptRequestCount;i++) {
        $("#request-overlay-" + i).removeClass("selected");
        $("#request-overlay-" + i).addClass("transparent");
    }
    $('#radio1').attr('checked', 'checked');
    $("#request-dialog-radio").buttonset('refresh');
}

// initialize the pop-up dialog        
$('#request-dialog').jqm({overlay: 0, onHide: CloseRequestDialog})
      .jqDrag('.jqDrag');
$('input.jqmdX')
    .hover( function(){ $(this).addClass('jqmdXFocus'); }, 
            function(){ $(this).removeClass('jqmdXFocus'); })
    .focus( function(){ this.hideFocus=true; $(this).addClass('jqmdXFocus'); })
    .blur( function(){ $(this).removeClass('jqmdXFocus'); });
    
$("#request-dialog-radio").buttonset();
$("#request-dialog-radio").change(function() {
    var panel=$('#request-dialog-radio input[type=radio]:checked').val();
    $("#dialog-contents div.dialog-tab-content").hide();
    $("#" + panel).show();
});

var wptBodyRequest;

// Test that a value is a valid duration.
// Invalid durations include undefined and -1.
function IsValidDuration(value) {
    // Explicitly check the type.  Would you have guessed that Number(['9'])
    // is 9?  We need to support strings because php makes it too easy to
    // send a number as a string.  We need to support numbers like "123.4".
    if (typeof value != 'number' && typeof value != 'string')
        return false;

    // Number('') is 0, but the empty string is not a valid duration.
    if (value === '')
        return false;

    var num = Number(value);
    return (!isNaN(num) && num !== -1);
}

function NumBytesAsDisplayString(numBytes) {
    var numKb = numBytes / 1024.0;

    // We display kilobytes with one decimal point.  If the value with that
    // precision would be zero, display bytes instead.
    if (numKb >= 0.1) {
        return numKb.toFixed(1) + ' KB';
    }
    return numBytes + ' B';
}

function SelectRequest(request) {
    $('#request-dialog').css('top', $("#request-overlay-" + request).position().top + 20);
    $("#dialog-title").html('<a href="#request' + request + '">Request #' + request + '</a>');
    var details='';
    var requestHeaders='';
    var responseHeaders='';
    $("#response-body").html('');
    $('#response-body-button').hide();
    $("#response-image").html('');
    $('#response-image-button').hide();
    try {
        if (wptBodyRequest !== undefined)
            wptBodyRequest.abort();
    } catch (err) {
    }
    if (wptRequestData[request - 1] !== undefined) {
        var r = wptRequestData[request - 1];
        if (r['full_url'] !== undefined)
            details += '<b>URL:</b> <a href="' + r['full_url'] + '">' + r['full_url'] + '</a><br>';
        if (r['initiator'] !== undefined && r['initiator'].length > 0) {
            details += '<b>Loaded By:</b> ' + r['initiator'];
            if (r['initiator_line'] !== undefined)
                details += ':' + r['initiator_line'];
            details += '<br>';
        }
        if (r['host'] !== undefined)
            details += '<b>Host: </b>' + r['host'] + '<br>';
        if (r['ip_addr'])
            details += '<b>IP: </b>' + r['ip_addr'] + '<br>';
        if (r['location'] !== undefined && r['location'].length)
            details += '<b>Location: </b>' + r['location'] + '<br>';
        if (r['responseCode'] !== undefined)
            details += '<b>Error/Status Code: </b>' + r['responseCode'] + '<br>';
        if (r['load_start'] !== undefined)
            details += '<b>Start Offset: </b>' + (r['load_start'] / 1000.0).toFixed(3) + ' s<br>';
        if (IsValidDuration(r['dns_ms'])) {
            details += '<b>DNS Lookup: </b>' + r['dns_ms'] + ' ms<br>';
        } else if( r['dns_end'] !== undefined && r['dns_start'] !== undefined && r['dns_end'] > 0 ) {
            var dnsTime = r['dns_end'] - r['dns_start'];
            details += '<b>DNS Lookup: </b>' + dnsTime + ' ms<br>';
        }
        if (IsValidDuration(r['connect_ms'])) {
            details += '<b>Initial Connection: </b>' + r['connect_ms'] + ' ms<br>';
            if (r['is_secure'] !== undefined && r['is_secure'] && IsValidDuration(r['ssl_ms'])) {
                details += '<b>SSL Negotiation: </b>' + r['ssl_ms'] + ' ms<br>';
            }
        } else if( r['connect_end'] !== undefined && r['connect_start'] !== undefined && r['connect_end'] > 0 ) {
            var connectTime = r['connect_end'] - r['connect_start'];
            details += '<b>Initial Connection: </b>' + connectTime + ' ms<br>';
            if( r['ssl_end'] !== undefined && r['ssl_start'] !== undefined && r['ssl_end'] > 0 ) {
                var sslTime = r['ssl_end'] - r['ssl_start'];
                details += '<b>SSL Negotiation: </b>' + sslTime + ' ms<br>';
            }
        }
        if (IsValidDuration(r['ttfb_ms'])) {
            details += '<b>Time to First Byte: </b>' + r['ttfb_ms'] + ' ms<br>';
        }
        if (IsValidDuration(r['download_ms']))
            details += '<b>Content Download: </b>' + r['download_ms'] + ' ms<br>';
        if (r['bytesIn'] !== undefined)
            details += '<b>Bytes In (downloaded): </b>' + NumBytesAsDisplayString(r['bytesIn']) + '<br>';
        if (r['bytesOut'] !== undefined)
            details += '<b>Bytes Out (uploaded): </b>' + NumBytesAsDisplayString(r['bytesOut']) + '<br>';
        if (r['custom_rules'] !== undefined) {
            for (rule in r['custom_rules']) {
                details += '<b>Custom Rule - ' + rule + ': </b>(';
                details += r['custom_rules'][rule]['count'] + ' matches) - ';
                details += r['custom_rules'][rule]['value'].replace(/>/g, '&gt;').replace(/</g, '&lt;') + '<br>';
            }
        }
        if (r['headers'] !== undefined){
            if (r.headers['request'] !== undefined){
                for (i=0;i<r.headers.request.length;i++) {
                    requestHeaders += r.headers.request[i] + '<br>';
                }
            }
            if (r.headers['response'] !== undefined){
                for (i=0;i<r.headers.response.length;i++) {
                    responseHeaders += r.headers.response[i] + '<br>';
                }
            }
        }
        if (r['body_url'] !== undefined && r['body_url'].length) {
            try {
                $("#response-body").text('Loading...');
                $('#response-body-button').show();
                wptBodyRequest = new XMLHttpRequest();
                wptBodyRequest.open('GET', r['body_url'], true);
                wptBodyRequest.onreadystatechange = function() {
                if (wptBodyRequest.readyState == 4) {
                    if (wptBodyRequest.status == 200) {
                        $("#response-body").text(wptBodyRequest.responseText);
                    } else {
                        $("#response-body").text('');
                    }
                }
              }
              wptBodyRequest.send();
            } catch (err) {
            }
        } else if (r['contentType'] !== undefined && r['contentType'].indexOf('image') >= 0) {
            $('#response-body-button').show();
            $("#response-body").html('<a href="' + r['full_url'] + '"><img style="max-width:100%; max-height:100%;" src="' + r['full_url'] + '"></a>');
        }
    }
    $("#request-details").html(details);
    $("#request-headers").html(requestHeaders);
    $("#response-headers").html(responseHeaders);
    $('#request-dialog').jqmShow();

    // highlight the selected request
    for (i=1;i<=wptRequestCount;i++) {
        if (i == request)
            $("#request-overlay-" + i).addClass("selected");
        else
            $("#request-overlay-" + i).removeClass("selected");
    }
}
