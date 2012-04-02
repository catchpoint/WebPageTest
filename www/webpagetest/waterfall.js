var CloseRequestDialog = function(hash) {
    hash.w.hide();
    for (i=1;i<=wptRequestCount;i++) {
        $("#request-overlay-" + i).removeClass("selected");
        $("#request-overlay-" + i).addClass("transparent");
    }
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

function SelectRequest(request) {
    $('#request-dialog').css('top', $("#request-overlay-" + request).position().top + 20);
    $("#dialog-title").html('<a href="#request' + request + '">Request #' + request + '</a>');
    var details='';
    var requestHeaders='';
    var responseHeaders='';
    $("#response-body").html('');
    $('#response-body-button').hide();
    try {
        if (wptBodyRequest !== undefined)
            wptBodyRequest.abort();
    } catch (err) {
    }
    if (wptRequestData[request - 1] !== undefined) {
        var r = wptRequestData[request - 1];
        if (r['full_url'] !== undefined)
            details += '<b>URL:</b> ' + r['full_url'] + '<br>';
        if (r['initiator'] !== undefined && r['initiator'].length > 0) {
            details += '<b>Loaded By:</b> ' + r['initiator'];
            if (r['initiator_line'] !== undefined)
                details += ':' + r['initiator_line'];
            details += '<br>';
        }
        if (r['host'] !== undefined)
            details += '<b>Host: </b>' + r['host'] + '<br>';
        if (r['ip_addr'] !== undefined)
            details += '<b>IP: </b>' + r['ip_addr'] + '<br>';
        if (r['location'] !== undefined && r['location'].length)
            details += '<b>Location: </b>' + r['location'] + '<br>';
        if (r['responseCode'] !== undefined)
            details += '<b>Error/Status Code: </b>' + r['responseCode'] + '<br>';
        if (r['load_start'] !== undefined)
            details += '<b>Start Offset: </b>' + (r['load_start'] / 1000.0).toFixed(3) + ' s<br>';
        if (r['dns_ms'] !== undefined && r['dns_ms'] != -1) {
            details += '<b>DNS Lookup: </b>' + r['dns_ms'] + ' ms<br>';
        } else if( r['dns_end'] !== undefined && r['dns_start'] !== undefined && r['dns_end'] > 0 ) {
            var dnsTime = r['dns_end'] - r['dns_start'];
            details += '<b>DNS Lookup: </b>' + dnsTime + ' ms<br>';
        }
        if (r['connect_ms'] !== undefined && r['connect_ms'] != -1) {
            details += '<b>Initial Connection: </b>' + r['connect_ms'] + ' ms<br>';
            if (r['is_secure'] !== undefined && r['is_secure'] && r['sslTime'] !== undefined) {
                details += '<b>SSL Negotiation: </b>' + r['sslTime'] + ' ms<br>';
            }
        } else if( r['connect_end'] !== undefined && r['connect_start'] !== undefined && r['connect_end'] > 0 ) {
            var connectTime = r['connect_end'] - r['connect_start'];
            details += '<b>Initial Connection: </b>' + connectTime + ' ms<br>';
            if( r['ssl_end'] !== undefined && r['ssl_start'] !== undefined && r['ssl_end'] > 0 ) {
                var sslTime = r['ssl_end'] - r['ssl_start'];
                details += '<b>SSL Negotiation: </b>' + sslTime + ' ms<br>';
            }
        }
        if (r['ttfb_ms'] !== undefined)
            details += '<b>Time to First Byte: </b>' + r['ttfb_ms'] + ' ms<br>';
        if (r['download_ms'] !== undefined && r['download_ms'] >= 0)
            details += '<b>Content Download: </b>' + r['download_ms'] + ' ms<br>';
        if (r['bytesIn'] !== undefined)
            details += '<b>Bytes In (downloaded): </b>' + (r['bytesIn'] / 1024.0).toFixed(1) + ' KB<br>';
        if (r['bytesOut'] !== undefined)
            details += '<b>Bytes Out (uploaded): </b>' + (r['bytesOut'] / 1024.0).toFixed(1) + ' KB<br>';
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
