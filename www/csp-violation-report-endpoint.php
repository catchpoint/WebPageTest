<?php
// Send `204 No Content` status code.
http_response_code(204);
// collect data from post request
$data = file_get_contents('php://input');
if ($data = json_decode($data)) {
    // Remove slashes from the JSON-formatted data.
    $data = json_encode(
        $data,
        JSON_UNESCAPED_SLASHES
    );
    # set options for syslog daemon
    openlog('report-uri', LOG_NDELAY, LOG_USER);

    # send warning about csp report
    syslog(LOG_WARNING, $data);
}
