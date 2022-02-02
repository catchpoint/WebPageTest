<?php

namespace GraphQL\Auth;

use Aws\Credentials\Credentials;
use Aws\Credentials\CredentialProvider;
use Aws\Signature\SignatureV4;
use GraphQL\Exception\AwsRegionNotSetException;
use GraphQL\Exception\MissingAwsSdkPackageException;
use GuzzleHttp\Psr7\Request;

class AwsIamAuth implements AuthInterface
{
    protected const SERVICE_NAME = 'appsync';

    /**
     * @codeCoverageIgnore
     *
     * AwsIamAuth constructor.
     */
    public function __construct()
    {
        if (!class_exists('\Aws\Signature\SignatureV4')) {
            throw new MissingAwsSdkPackageException();
        }
    }

    /**
     * @param Request $request
     * @param array $options
     * @return Request
     */
    public function run(Request $request, array $options = []): Request
    {
        $region = $options['aws_region'] ?? null;
        if ($region === null) {
            throw new AwsRegionNotSetException();
        }
        return $this->getSignature($region)->signRequest(
            $request, $this->getCredentials(),
            self::SERVICE_NAME
        );
    }

    /**
     * @param string $region
     * @return SignatureV4
     */
    protected function getSignature(string $region): SignatureV4
    {
        return new SignatureV4(self::SERVICE_NAME, $region);
    }

    /**
     * @return Credentials
     */
    protected function getCredentials(): Credentials
    {
        $provider = CredentialProvider::defaultProvider();
        return $provider()->wait();
    }
}
