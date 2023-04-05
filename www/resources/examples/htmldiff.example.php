<?php
$EXAMPLES = [
    [
        'title' => 'Error state example',
        'type' => 'fullpage',
        'example' => function () {
            return view('pages.htmldiff', [
                'body_class' => 'result',
                'error_message' =>  'No HTML to speak of',
            ]);
        }
    ],
    [
        'title' => 'Simple example',
        'type' => 'fullpage',
        'example' => function () {
            return view('pages.htmldiff', [
                'body_class' => 'result',
                'rendered_html' => '<div class="test">hello</div>',
                'delivered_html' => '<div class="tester"  >hello</div>',
                'error_message' => null,
            ]);
        }
    ]
];
