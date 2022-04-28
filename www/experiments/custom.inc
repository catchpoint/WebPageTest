<?php

$category = "Custom";
$assessment[$category]["opportunities"][] = array(
    "title" =>  "Add HTML to document",
    "desc" =>  "These experiments allow you to add arbitrary html to a page, which can for example, enable to you test the impact of adding script tags.",
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
    "inputttext" => true
);



$assessment[$category]["opportunities"][] = array(
    "title" =>  "Find and Replace Text",
    "desc" =>  "This experiment allows you to find and replace arbitrary text or html in a request.",
    "examples" =>  array(),
    "experiments" =>  array(
        (object) [
            'id' => '026',
            'title' => 'Find/Replace Text',
            "desc" => '<p>This experiment will find and replace occurrences of text in the page, with the option of using regular expressions, capturing parentheses, and flags as well</p>',
            "expvar" => 'swap',
            "expfields" => array(
                (object) [
                    'label' => 'find',
                    'name' => 'pattern',
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
);


?>