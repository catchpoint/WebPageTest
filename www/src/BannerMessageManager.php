<?php

declare(strict_types=1);

namespace WebPageTest;

use WebPageTest\Util;

class BannerMessageManager
{
    public function __construct()
    {
    }

    public function get(): array
    {
        return Util::getBannerMessage();
    }

    public function put(string $message_type, array $message): void
    {
        Util::setBannerMessage($message_type, $message);
    }
}
