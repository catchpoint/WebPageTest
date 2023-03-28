<?php
require_once __DIR__ . '/../vendor/autoload.php';

define('SG', 1);

$dir = realpath(__DIR__ . '/resources/examples/');
$files = scandir($dir);

$ALL_EXAMPLES = [];
foreach ($files as $file) {
    if (strpos($file, '.example.php')) {
        $EXAMPLES = [];
        include($dir . '/' . $file);
        $name = str_replace('.example.php', '', $file);
        $ALL_EXAMPLES[$name] = [];
        foreach ($EXAMPLES as $idx => $ex) {
            $ALL_EXAMPLES[$name][$idx] = $ex;
        }
    }
}

if (!empty($_REQUEST['ex'])) {
    $which = explode(':', $_REQUEST['ex']);
    $example =  @$ALL_EXAMPLES[$which[0]][$which[1]];
    $title = sprintf('%s: %s', $which[0], $example['title']);
    $toc = getTOC();
    $renderedExample = $example['example']();
    if ($example['type'] === 'fullpage') {
        echo str_replace(['<!--TITLE-->', '<!--TOC-->'], [$title, $toc], $renderedExample);;
    } else {
        $page = view('styleguide', [
            'body_class' => 'styleguide-partial',
        ]);
        echo str_replace(['<!--TITLE-->', '<!--TOC-->', '<!--CONTENT-->'], [$title, $toc, $renderedExample], $page);
    }
} else {
    $page = view('styleguide', []);
    echo str_replace(['<!--TITLE-->', '<!--TOC-->'], ['Component explorer', getTOC()], $page);
}


function getTOC()
{
    global $ALL_EXAMPLES;
    $ret = '<ul>';
    foreach ($ALL_EXAMPLES as $file => $examples) {
        foreach ($examples as $idx => $ex) {
            $ret .= sprintf('<li><a href="?ex=%s:%s">%s: %s</a></li>', $file, $idx, $file, $ex['title']);
        }
    }
    $ret .= '</ul>';
    return $ret;
}
