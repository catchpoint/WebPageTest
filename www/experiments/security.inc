<?php 

echo observationHTML(
    "Several security vulnerabilies found by Snyk",
    "Snyk has found 2 security vulnerabilities, 1 high priority, and 1 low.",
    array(
        "<strong>Strict Transport Security:</strong>A HSTS Policy informing the HTTP client how long to cache the HTTPS only policy and whether this applies to subdomains.",
        "<strong>X Content Type Options:</strong> The only defined value, \"nosniff\", prevents Internet Explorer from MIME-sniffing a response away from the declared content-type. "
    ),
    array(
        (object) [
            'title' => 'Add strict transport security.',
            "desc" => 'This experiment will add a blah blah to your HTML document, causing browsers to  blah blah',
            "expvar" => 'preload',
            "expval" => $lcpSource . "|as_image"
        ],
        (object) [
            'title' => 'Add X Content Type Options',
            "desc" => 'This experiment will add a blah blah to your HTML document, causing browsers to  blah blah',
            "expvar" => 'addimportance',
            "expval" => $lcpSource . "|i_high"
        ]
        ),
        false
);


?>