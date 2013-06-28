setInterval( "UpdateStatus()", 10000 ); // update the status every 10 seconds
UpdateStatus();

/* Update the status of the current test */
function UpdateStatus()
{
    var url = '/testStatus.php?test=' + testId;
    $.getJSON(url, function(data) {
        $("#status").text(data.statusCode);
    });
}