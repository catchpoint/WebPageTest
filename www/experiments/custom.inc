<?php

$requests = $testStepResult->getRequests();
global $request_context;

AssessmentRegistry::getInstance()->register(AssessmentRegistry::Custom, [
    "title" =>  "Add HTML to document",
    "desc" =>  "These experiments allow you to add arbitrary html to a page, which can for example, enable to you test the impact of adding scripts, 3rd-party tags, or resource hints.",
    "examples" =>  array(),
    "experiments" =>  array(
        (object) [
            'id' => '019',
            'title' => 'Add HTML to start of <code>head</code>',
            "desc" => '<p>This experiment adds arbitrary HTML text to the start of the head of the tested website.</p>',
            "expvar" => 'insertheadstart'
        ],
        (object) [
            'id' => '020',
            'title' => 'Add HTML to end of <code>head</code>',
            "desc" => '<p>This experiment adds arbitrary HTML text to the end of the head of the tested website.</p>',
            "expvar" => 'insertheadend'
        ],
        (object) [
            'id' => '021',
            'title' => 'Add HTML to end of <code>body</code>',
            "desc" => '<p>This experiment adds arbitrary HTML text to the end of the body of the tested website.</p>',
            "expvar" => 'insertbodyend'
        ],
    ),
    "good" =>  null,
    "inputttext" => true,
]);

AssessmentRegistry::getInstance()->register(AssessmentRegistry::Custom, [
    "title" =>  "Find and Replace Text",
    "desc" =>  "This experiment allows you to find and replace arbitrary text or html in a request.",
    "examples" =>  array(),
    "experiments" =>  array(
        (object) [
            'id' => '026',
            'title' => 'Find/Replace Text',
            "desc" => '<p>This experiment will find and replace occurrences of text in the page, with the option of using regular expressions, capturing parentheses, and flags as well</p>',
            "expvar" => 'findreplace',
            "expfields" => array(
                (object) [
                    'label' => 'find',
                    'type' => 'text'
                ],
                (object) [
                    'label' => 'replace',
                    'name' => 'replacement',
                    'type' => 'text'
                ],
                (object) [
                    'label' => 'Use Regular Expressions?',
                    'name' => 'useRegExp',
                    'type' => 'checkbox'
                ],
                (object) [
                    'label' => 'RegExp Flags (default: gi)',
                    'name' => 'flags',
                    'type' => 'text'
                ]
            )
        ]
    ),
    "good" =>  null,
    "inputttext" => true
]);

if ($requests[0]['body_url']) {
    AssessmentRegistry::getInstance()->register(AssessmentRegistry::Custom, [
        "title" =>  "Edit Response HTML",
        "desc" =>  "This experiment allows you to freely edit the text of the initial HTML response",
        "examples" =>  array(),
        "experiments" =>  array(
            (object) [
                'id' => '054',
                'title' => 'Edit Response HTML',
                "desc" => '<p>This experiment will replace the initial HTML with the submitted value as if it was served that way initially.</p>',
                "expvar" => 'editresponsehtml',
                'textinputvalue' => htmlentities(file_get_contents('https://' . $request_context->getHost() . $requests[0]['body_url'])),
                "fullscreenfocus" => true
            ]
        ),
        "good" =>  null,
        "inputttext" => true
    ]);
}

AssessmentRegistry::getInstance()->register(AssessmentRegistry::Custom, [
    "title" =>  "Delivery Optimizations",
    "desc" =>  "These experiments allow you change attributes and manipulate how assets are delivered. Note expected syntax examples when using.",
    "examples" =>  array(),
    "experiments" =>  array(
        (object) [
            'id' => '027',
            'expvar' => 'deferjs',
            'title' => 'Defer Render-Blocking Scripts',
            "desc" => '<p>This experiment adds a <code>defer</code> attribute to render-blocking scripts, causing the browser to fetch them in parallel while showing the page. Deferred scripts still execute in the order they are defined in source.</p>',
            'textfield' => false,
            "expfields" => array(
                (object) [
                    'label' => 'File/URL',
                    'type' => 'text'
                ]
            ),
            'addmore' => true,
            'hint' => 'site.js'
        ],
        (object) [
            'id' => '028',
            'expvar' => 'asyncjs',
            'title' => 'Async Blocking Scripts',
            "desc" => '<p>This experiment adds a <code>async</code> attribute to render-blocking scripts, causing the browser to fetch them in parallel while showing the page. Async scripts are not guaranteed to execute in the order they are defined in source.</p>',
            "expfields" => array(
                (object) [
                    'label' => 'File/URL',
                    'type' => 'text'
                ]
            ),
            'addmore' => true,
            'hint' => 'site.js'
        ],
        (object) [
            'id' => '055',
            'expvar' => 'disablescripts',
            'title' => 'Disable JavaScript',
            "desc" => '<p>This experiment effectively disables JavaScript (and enables noscript elements) to test a site\'s JavaScript dependence. It works by changing <code>script</code> elements into <code>scrapt</code> elements, and <code>noscript</code> elements into <code>noscrapt</code> elements so that the page weight remains and behaviors mimic a JS-disabled environment.</p>',
            'textfield' => false,
            'expval' => array(''),
            "hideassets" => true,
            'instruction' => false,
            'hint' => 'no value necessary'
        ],
        (object) [
            'id' => '029',
            'expvar' => 'asynccss',
            'title' => 'Load CSS Async',
            "desc" => '<p>This experiment loads specified stylesheets in a way that allows the page to begin rendering while they are still loading. Note that this may cause a flash of unstyled content.</p>',
            "expfields" => array(
                (object) [
                    'label' => 'File/URL',
                    'type' => 'text'
                ]
            ),
            'addmore' => true,
            'hint' => 'site.css'
        ],
        (object) [
            'id' => '030',
            'expvar' => 'imageaspectratio',
            'title' => 'Add Image Aspect Ratio',
            "desc" => '<p>This experiment adds <code>width="..."</code> and <code>height="..."</code> attributes to specified images, matching their natural width and height, to provide an aspect ratio.</p>',
            "expfields" => array(
                (object) [
                    'label' => 'Src value & config: <em>(<code>foo.jpg|w500|h600</code>)</em>',
                    'type' => 'text'
                ]
            ),
            'addmore' => true,
            'hint' => 'foo.jpg|w500|h600'
        ],
        (object) [
            'id' => '031',
            'expvar' => 'inline',
            'title' => 'Inline External Files',
            "desc" => '<p>This experiment embeds the contents of specified external scripts or stylesheets directly into the HTML. This increases the size of the HTML, but can often allow page page to display sooner by avoiding server round trips. <strong>Note:</strong> The inline experiment may break relative references to images and other assets inside the file. These would need proper path changes or absolute URLs in production.</p>',
            "expfields" => array(
                (object) [
                    'label' => 'Src or Href',
                    'type' => 'text'
                ]
            ),
            'addmore' => true,
            'hint' => 'site.css'
        ],
        (object) [
            'id' => '032',
            'expvar' => 'addpreload',
            'title' => 'Preload Files',
            "desc" => '<p>This experiment adds a <code>&lt;link rel="preload" type="image" href="..."&gt;</code> to the <code>head</code> of your HTML document, causing browsers to request a file earlier and at a higher priority than they otherwise might.</p>',

            "expfields" => array(
                (object) [
                    'label' => 'Url and config: <em>(<code>path/to/file.jpg|as_image</code>)</em>',
                    'type' => 'text'
                ]
            ),
            'addmore' => true,
            'hint' => 'path/to/foo.jpg'
        ],
        (object) [
            'id' => '033',
            'expvar' => 'removepreload',
            'title' => 'Remove Preloads',
            "desc" => '<p>This experiment removes specified unused preloads from the page, allowing other critical resources to be requested earlier.</p>',

            "expfields" => array(
                (object) [
                    'label' => 'File/URL',
                    'type' => 'text'
                ]
            ),
            'addmore' => true,
            'hint' => 'site.js'
        ],
        (object) [
            'id' => '034',
            'expvar' => 'addpreconnect',
            'title' => 'Preconnect Domains',
            "desc" => '<p>This experiment will add a <code>link</code> with <code>rel="preconnect"</code> for specified hosts, which saves time for those steps when the resource is later requested.</p>',

            "expfields" => array(
                (object) [
                    'label' => 'Domain',
                    'type' => 'text'
                ]
            ),
            'addmore' => true,
            'hint' => 'https://www.webpagetest.org'
        ],
        (object) [
            'id' => '035',
            'expvar' => 'addloadinglazy',
            'title' => 'Lazy Load Images',
            "desc" => '<p>This experiment adds <code>loading="lazy"</code> attributes to specified images.</p>',

            "expfields" => array(
                (object) [
                    'label' => 'File/URL',
                    'type' => 'text'
                ]
            ),
            'addmore' => true,
            'hint' => 'myimage.jpg'
        ],
        (object) [
            'id' => '036',
            'expvar' => 'removeloadinglazy',
            'title' => 'Remove Lazy Loading',
            "desc" => '<p>This experiment removes <code>loading="lazy"</code> attributes from specified images.</p>',

            "expfields" => array(
                (object) [
                    'label' => 'File/URL',
                    'type' => 'text'
                ]
            ),
            'addmore' => true,
            'hint' => 'myimage.jpg'
        ],
        (object) [
            'id' => '037',
            'expvar' => 'minifycss',
            'title' => 'Minify CSS',
            "desc" => '<p>This experiment removes whitespace from same-domain CSS files.</p>',
            'textfield' => false,
            'expval' => array(''),
            "hideassets" => true,
            'instruction' => false,

            'hint' => 'no value necessary'
        ],
        (object) [
            'id' => '038',
            'expvar' => 'addpriorityhint',
            'title' => 'Add Priority Hint',
            "desc" => '<p><em>(Chromium-only)</em> This experiment adds an <code>fetchpriority="high"</code> attribute to specified  images, causing them to request earlier at a higher priority.</p>',

            "expfields" => array(
                (object) [
                    'label' => 'Src/Href and config: <em>(<code>foo.jpg|i_high</code> or <code>foo.jpg|i_low</code>)</em>',
                    'type' => 'text'
                ]
            ),
            'addmore' => true,
            'hint' => 'foo.jpg|i_high'
        ],
        (object) [
            'id' => '039',
            'expvar' => 'removepriorityhint',
            'title' => 'Remove Priority Hint',
            "desc" => '<p><em>(Chrome-only)</em> This experiment removes an existing <code>fetchpriority</code> attribute to specified images, causing them to request at their default priority.</p>',

            "expfields" => array(
                (object) [
                    'label' => 'File/URL',
                    'type' => 'text'
                ]
            ),
            'addmore' => true,
            'hint' => 'foo.jpg'
        ],
        (object) [
            'id' => '040',
            'expvar' => 'fontdisplayswap',
            'title' => 'Add <code>font-display: swap</code>',
            "desc" => '<p>This experiment changes the way a custom font loads so that text can appear while fonts are loading</p>',
            'expval' => array(''),
            "hideassets" => true,

            'hint' => 'foo.jpg'
        ],
        (object) [
            "id" => '049',
            'title' => 'Make Hosts Timeout',
            "desc" => '<p>This experiment directs specified hosts to WebPageTest\'s blackhole server, which will hang indefinitely until timing out. Use this experiment to test your site\'s ability to serve content if these services hang.</p>',
            "expvar" => 'experiment-spof',
            "expfields" => array(
                (object) [
                    'label' => 'File/URL',
                    'type' => 'text'
                ]
            ),
            'addmore' => true,
            'hint' => 'example.com'
        ],
        (object) [
            "id" => '050',
            'title' => 'Block Requests',
            "desc" => '<p>This experiment causes specified requests to fail immediately. Use this experiment to test your site\'s ability to serve content if these services are unavailable.</p>',
            "expvar" => 'experiment-block',
            "expfields" => array(
                (object) [
                    'label' => 'File/URL',
                    'type' => 'text'
                ]
            ),
            'addmore' => true,
            'hint' => '/path/to/foo.jpg'
        ],
        (object) [
            "id" => '051',
            'title' => 'Self-Host Requests',
            "desc" => '<p>This experiment will fetch these requests server-side and reference them on the same domain.  Note: the overrides happen at the host level, so any requests from that host will now be self-hosted.</p>',
            "expvar" => 'experiment-overrideHost',
            "expfields" => array(
                (object) [
                    'label' => 'Hostname',
                    'type' => 'text'
                ]
            ),
            'addmore' => true,
            'hint' => 'example.com'
        ],
    ),
    "good" =>  null,
    "inputttext" => true
]);
