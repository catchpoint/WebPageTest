<?php

declare(strict_types=1);

namespace WebPageTest\OE\OpportunityTest;

class Util
{
    public static function documentRelativePath($url, $path)
    {
        $basePath = explode('/', $path);
        array_pop($basePath);
        $basePath = implode('/', $basePath);
        if (strpos($url, $basePath) === 0) {
            $url = substr($url, strlen($basePath) + 1);
        }
        return $url;
    }

    public static function is300s($req): bool
    {
        return $req['responseCode'] >= 300 &&  $req['responseCode'] <= 399  && $req['responseCode'] != 304;
    }

    public static function initiatedByRoot($request, $rootURL): bool
    {
        return strcasecmp($request['initiator'], $rootURL) === 0 || $request['initiator'] == '';
    }

    public static function encodeURIComponent($str): string
    {
        $revert = array('%21' => '!', '%2A' => '*', '%27' => "'", '%28' => '(', '%29' => ')');
        return strtr(rawurlencode($str), $revert);
    }
}
