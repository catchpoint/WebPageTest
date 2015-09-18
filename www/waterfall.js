var wptBodyRequest;

/**
 * Delivers an ID for the given event name
 * (javascript version of method in utilc.inc)
 * @param $eventName
 * @returns
 * 		$eventName as id
 */
function getEventNameID(eventName){
	var eventNameID = eventName.replace(/ /g, "_");
	eventNameID = eventNameID.replace(/[^a-zA-Z0-9_-]/g, "");
	return eventNameID;
}

function initDialog(eventName) {
	var eventNameID = getEventNameID(eventName);
	var CloseRequestDialog = function(hash) {
        hash.w.hide();

        if (eventName != -1) {
            var requestCount = wptRequestCount[eventName];
        } else {
            var requestCount = wptRequestCount;
        }
        for (i = 1; i <= requestCount; i++) {
            $("#request-overlay-" + eventNameID + "-" + i).removeClass(
                    "selected");
            $("#request-overlay-" + eventNameID + "-" + i).addClass(
                    "transparent");
        }
        $('#radio' + eventNameID + '1').attr('checked', 'checked');
        $("#request-dialog-radio" + eventNameID).buttonset('refresh');
	}

	// initialize the pop-up dialog
	$('#request-dialog' + eventNameID).jqm({
		overlay : 0,
		onHide : CloseRequestDialog
	}).jqDrag('.jqDrag');
	$('input.jqmdX').hover(function() {
		$(this).addClass('jqmdXFocus');
	}, function() {
		$(this).removeClass('jqmdXFocus');
	}).focus(function() {
		this.hideFocus = true;
		$(this).addClass('jqmdXFocus');
	}).blur(function() {
		$(this).removeClass('jqmdXFocus');
	});

	$("#request-dialog-radio" + eventNameID).buttonset();
	$("#request-dialog-radio" + eventNameID).change(
			function() {
				var panel = $(
						'#request-dialog-radio' + eventNameID
								+ ' input[type=radio]:checked').val();
				$("#dialog-contents" + eventNameID + " div.dialog-tab-content")
						.hide();
    $("#" + panel).show();
			});
}

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

function htmlEncode(value){
    if (value) {
        return jQuery('<div />').text(value).html();
    } else {
        return '';
    }
}
/**
 * Changes the header format (adding bold tags to row types)
 * 
 * @param header
 *            header to reformat
 * @returns {String} reformatted header
 */
function reformatHeaders(header) {
	var rows = header.split("<br>");
	var result = "";
	for ( var i in rows) {
		var entries = rows[i].split(":");
		if (entries.length > 1) {
			result = result + "<b>" + entries[0] + ":</b>" + entries[1];
			if(entries.length > 2){
				for(var j = 2; j < entries.length; j++){
					result = result + ":" + entries[j];
                }
			}
		} else {
			result = result += rows[i];
		}
		result += "<br/>";
	}
	return result;
}

/**
 * Result type for the request details result
 */
var eResultType = {
	DETAILS : 0,
	REQUEST_HEADERS : 1,
	RESPONSE_HEADERS : 2
}

/**
 * Returns the request details according to given result type
 * 
 * @param eventName
 *            eventName of the request
 * @param request
 *            number of the request
 * @param resultType
 *            value of eResultType enum
 * @returns request details belonging to the result type
 */
function getRequestDetails(eventName, request, resultType) {
	var wptRequests;
	if (eventName != -1) {
		wptRequests = wptRequestData[eventName];
	} else {
		wptRequests = wptRequestData;
	}
	if (wptRequests !== undefined && wptRequests[request - 1] !== undefined) {
		var r = wptRequests[request - 1];
		if (resultType == eResultType.DETAILS) {
			var details = '';
            if (r['full_url'] !== undefined) {
                if (wptNoLinks) {
                    details += '<b>URL:</b> ' + htmlEncode(r['full_url']) + '<br>';
                } else {
                    details += "<b>URL:</b> <a rel=\"nofollow\" href=\""
                        + r['full_url'] + "\">" + r['full_url']
                        + "</a><br>";
                }
            }
            if (r['initiator'] !== undefined && r['initiator'].length > 0) {
                details += '<b>Loaded By:</b> ' + htmlEncode(r['initiator']);
                if (r['initiator_line'] !== undefined)
                    details += ':' + htmlEncode(r['initiator_line']);
                details += '<br>';
            }
            if (r['host'] !== undefined)
                details += '<b>Host: </b>' + htmlEncode(r['host']) + '<br>';
            if (r['ip_addr'])
                details += '<b>IP: </b>' + htmlEncode(r['ip_addr']) + '<br>';
            if (r['location'] !== undefined && r['location'] !== null && r['location'].length)
                details += '<b>Location: </b>' + htmlEncode(r['location']) + '<br>';
            if (r['responseCode'] !== undefined)
                    details += '<b>Error/Status Code: </b>' + r['responseCode']
                            + '<br>';
            if (r['client_port'] !== undefined && r['client_port'] !== null && r['client_port'])
                details += '<b>Client Port: </b>' + htmlEncode(r['client_port']) + '<br>';
            if (r['load_start'] !== undefined)
				details += '<b>Start Offset: </b>'
						+ (r['load_start'] / 1000.0).toFixed(3) + ' s<br>';
            if (IsValidDuration(r['dns_ms'])) {
                details += '<b>DNS Lookup: </b>' + r['dns_ms'] + ' ms<br>';
            } else if (r['dns_end'] !== undefined
                    && r['dns_start'] !== undefined && r['dns_end'] > 0) {
                var dnsTime = r['dns_end'] - r['dns_start'];
                details += '<b>DNS Lookup: </b>' + dnsTime + ' ms<br>';
            }
            if (IsValidDuration(r['connect_ms'])) {
                details += '<b>Initial Connection: </b>' + r['connect_ms']
                        + ' ms<br>';
                if (r['is_secure'] !== undefined && r['is_secure']
                        && IsValidDuration(r['ssl_ms'])) {
                    details += '<b>SSL Negotiation: </b>' + r['ssl_ms']
                            + ' ms<br>';
                }
            } else if (r['connect_end'] !== undefined
                        && r['connect_start'] !== undefined && r['connect_end'] > 0) {
                var connectTime = r['connect_end'] - r['connect_start'];
                    details += '<b>Initial Connection: </b>' + connectTime
                            + ' ms<br>';
                if (r['ssl_end'] !== undefined && r['ssl_start'] !== undefined
                        && r['ssl_end'] > 0) {
                    var sslTime = r['ssl_end'] - r['ssl_start'];
                    details += '<b>SSL Negotiation: </b>' + sslTime + ' ms<br>';
                }
            }
            if (IsValidDuration(r['ttfb_ms'])) {
                    details += '<b>Time to First Byte: </b>' + r['ttfb_ms']
                            + ' ms<br>';
            }
            if (IsValidDuration(r['download_ms']))
                    details += '<b>Content Download: </b>' + r['download_ms']
                            + ' ms<br>';
            if (r['bytesIn'] !== undefined)
                    details += '<b>Bytes In (downloaded): </b>'
                            + NumBytesAsDisplayString(r['bytesIn']) + '<br>';
            if (r['bytesOut'] !== undefined)
                    details += '<b>Bytes Out (uploaded): </b>'
                            + NumBytesAsDisplayString(r['bytesOut']) + '<br>';
            if (r['custom_rules'] !== undefined) {
                for (rule in r['custom_rules']) {
                    details += '<b>Custom Rule - ' + rule + ': </b>(';
                        details += r['custom_rules'][rule]['count']
                                + ' matches) - ';
                        details += r['custom_rules'][rule]['value'].replace(/>/g,
                                '&gt;').replace(/</g, '&lt;')
                                + '<br>';
                }
            }
            return details;

        } else if (resultType == eResultType.REQUEST_HEADERS) {
			var requestHeaders = '';
			if (r['headers'] !== undefined) {
				if (r.headers['request'] !== undefined) {
					for (var i = 0; i < r.headers.request.length; i++) {
                        requestHeaders += r.headers.request[i] + '<br>';
                    }
                }
			}
			return reformatHeaders(requestHeaders);

        } else if (resultType == eResultType.RESPONSE_HEADERS) {
			var responseHeaders = '';
			if (r['headers'] !== undefined) {
				if (r.headers['response'] !== undefined) {
					for (var i = 0; i < r.headers.response.length; i++) {
                        responseHeaders += r.headers.response[i] + '<br>';
                    }
                }
            }
			return reformatHeaders(responseHeaders);
		}

	}
	return null;
}

function SelectRequest(eventName, request) {
	var eventNameID = getEventNameID(eventName);
	initDialog(eventName);
	$('#request-dialog' + eventNameID)
			.css(
					'top',
					$("#request-overlay-" + eventNameID + "-" + request)
							.position().top + 20);
	$("#dialog-title" + eventNameID).html(
			'<a href="#request' + eventNameID + '-' + request + '">'
					+ eventName + ' - Request #' + request + '</a>');
	var details = '';
	var requestHeaders = '';
	var responseHeaders = '';
	$("#response-body" + eventNameID).html('');
	$('#response-body-button' + eventNameID).hide();
	$("#response-image").html('');
	$('#response-image-button').hide();
	try {
		if (wptBodyRequest !== undefined)
			wptBodyRequest.abort();
	} catch (err) {
	}
	var wptRequests;
	if (eventName != -1) {
		wptRequests = wptRequestData[eventName];
	} else {
		wptRequests = wptRequestData;
	}
	if (wptRequests[request - 1] !== undefined) {
		var r = wptRequests[request - 1];
        if (r['body_url'] !== undefined && r['body_url'].length) {
            details += '<a href="' + htmlEncode(r['body_url']) + '" target="_blank">Open response body in new window</a><br>'
            try {
				$("#response-body" + eventNameID).text('Loading...');
				$('#response-body-button' + eventNameID).show();
                wptBodyRequest = new XMLHttpRequest();
                wptBodyRequest.open('GET', r['body_url'], true);
                wptBodyRequest.onreadystatechange = function() {
                if (wptBodyRequest.readyState == 4) {
                    if (wptBodyRequest.status == 200) {
							$("#response-body" + eventNameID).text(
									wptBodyRequest.responseText);
                    } else {
							$("#response-body" + eventNameID).text('');
                    }
                }
              }
              wptBodyRequest.send();
            } catch (err) {
            }
		} else if (r['contentType'] !== undefined
				&& r['contentType'].indexOf('image') >= 0) {
			$('#response-body-button' + eventNameID).show();
            if (wptNoLinks) {
				$("#response-body" + eventNameID).html(
						'<img style="max-width:100%; max-height:100%;" src="'
								+ r['full_url'] + '">');
            } else {
				$("#response-body" + eventNameID)
						.html(
								'<a href="'
										+ r['full_url']
										+ '"><img style="max-width:100%; max-height:100%;" src="'
										+ r['full_url'] + '"></a>');
            }
        } else {
            $("#response-body").html('Not Available.<br><br>Turn on the "Save Response Bodies" option in the advanced settings to capture text resources.');
        }
    }
	$("#request-details" + eventNameID).html(getRequestDetails(eventName, request, eResultType.DETAILS));
	$("#request-headers" + eventNameID).html(getRequestDetails(eventName, request, eResultType.REQUEST_HEADERS));
	$("#response-headers" + eventNameID).html(getRequestDetails(eventName, request,	eResultType.RESPONSE_HEADERS));
	$('#request-dialog' + eventNameID).jqmShow();

    // highlight the selected request
	if (eventName != -1) {
		var requestCount = wptRequestCount[eventName];
	} else {
		var requestCount = wptRequestCount;
	}
	for (i = 1; i <= requestCount; i++) {
        if (i == request)
			$("#request-overlay-" + eventNameID + "-" + i).addClass("selected");
        else
			$("#request-overlay-" + eventNameID + "-" + i).removeClass(
					"selected");
    }
}

// support for the multi-waterfall translucency
$(".waterfall-transparency").change(function() {
    var newValue = this.value;
    var id = this.name;
    $("#" + id).css({ opacity: newValue });
});

$(".waterfall-transparency").on('input', function() {
    var newValue = this.value;
    var id = this.name;
    $("#" + id).css({ opacity: newValue });
});
