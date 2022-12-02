<?php

declare(strict_types=1);

namespace WebPageTest;

/**
 * This should be an enum, but we don't have enums yet because we're on PHP 7.4.
 * Soon enough we will be on 8 and then we can have enums
 *
 */
class Environment
{
    public static string $Development = 'development';
    public static string $QA = 'qa';
    public static string $Production = 'production';
}
