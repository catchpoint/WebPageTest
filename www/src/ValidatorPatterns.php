<?php

declare(strict_types=1);

namespace WebPageTest;

class ValidatorPatterns
{
  /**
   * contact_info may not have <, >, or &#
   */
    public static function getContactInfo(): string
    {
        return '^([^<>&]|&([^#]|$))+$';
    }
    public static function getNoAngleBrackets(): string
    {
        return '^([^<>])+$';
    }
    public static function getPassword(): string
    {
        return '^(?=.*[a-z].*)(?=.*[A-Z].*)(?=.*[0-9].*)(?=.*[\W_].*)(?!.*[<>].*)(?!.*[\s].*).{8,}$';
    }
}
