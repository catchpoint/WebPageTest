<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require __DIR__ . '/resources/view.php';

echo view('pages.consolelog', [
    'title' => 'Console Log',
    'page_title' => 'WebPageTest Console Log',
]);