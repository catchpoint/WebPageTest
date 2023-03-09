<?php

declare(strict_types=1);

namespace WebPageTest\Util;

class PlanHelper
{
    private static array $benefits = [];

    public static function getBenefits(string $id): array
    {
        return self::$benefits[$id] ?? [];
    }
}
