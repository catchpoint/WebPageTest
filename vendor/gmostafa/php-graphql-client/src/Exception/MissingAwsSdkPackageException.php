<?php

namespace GraphQL\Exception;

use RunTimeException;

/**
 * Class MissingAwsSdkPackageException
 *
 * @package GraphQL\Exception
 */
class MissingAwsSdkPackageException extends RunTimeException
{
    /**
     * @codeCoverageIgnore
     *
     * MissingAwsSdkPackageException constructor.
     */
    public function __construct()
    {
        parent::__construct(
            'To be able to use AWS IAM authorization you should 
            install "aws/aws-sdk-php" as a project dependency.'
        );
    }
}
