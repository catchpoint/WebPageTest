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
        if (!empty($basePath) && strpos($url, $basePath) === 0) {
            $url = substr($url, strlen($basePath) + 1);
        }
        return $url;
    }

    /**
     * @param \ArrayAccess|array $req
     *
     * @psalm-param \ArrayAccess|array{responseCode: mixed,...} $req
     */
    public static function is300s($req): bool
    {
        return $req['responseCode'] >= 300 &&  $req['responseCode'] <= 399  && $req['responseCode'] != 304;
    }

    public static function initiatedByRoot($request, $rootURL): bool
    {
        $initiator = $request['initiator'] ?? '';
        return strcasecmp($initiator, $rootURL) === 0 || $initiator == '';
    }

    /**
     * @psalm-param '</head>'|'<meta name="viewport" content="width=device-width,initial-scale=1"></head>' $str
     */
    public static function encodeURIComponent(string $str): string
    {
        $revert = array('%21' => '!', '%2A' => '*', '%27' => "'", '%28' => '(', '%29' => ')');
        return strtr(rawurlencode($str), $revert);
    }
}
