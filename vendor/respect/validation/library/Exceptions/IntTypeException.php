<?php

/*
 * This file is part of Respect/Validation.
 *
 * (c) Alexandre Gomes Gaigalas <alganet@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE file
 * that was distributed with this source code.
 */

declare(strict_types=1);

namespace Respect\Validation\Exceptions;

/**
 * Exception class for IntType rule.
 *
 * @author Henrique Moody <henriquemoody@gmail.com>
 */
final class IntTypeException extends ValidationException
{
    /**
     * {@inheritDoc}
     */
    protected $defaultTemplates = [
        self::MODE_DEFAULT => [
            self::STANDARD => '{{name}} must be of type integer',
        ],
        self::MODE_NEGATIVE => [
            self::STANDARD => '{{name}} must not be of type integer',
        ],
    ];
}
