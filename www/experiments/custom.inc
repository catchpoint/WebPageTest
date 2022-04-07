<?php

$category = "Custom";
$assessment[$category]["opportunities"][] = array(
    "title" =>  "Add HTML to document",
    "desc" =>  "These experiments allow you to add arbitrary html to page, which can for example, enable to you test the impact of adding script tags.",
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



?>