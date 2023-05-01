<?php

declare(strict_types=1);

namespace WebPageTest\Exception;

use WebPageTest\Exception\ClientException;
use WebPageTest\Util;

class AuthenticationException extends ClientException
{
    public function __construct()
    {
        $support_link = Util::getSetting('support_link', 'https://support.catchpoint.com');
        $message = "There was a problem with your account, please try logging in" .
                   " again. If you receive this error multiple times, please" .
                   " <a href='{$support_link}'>contact our support team</a>";
        $route = "/";
        parent::__construct($message, $route);
    }
}
