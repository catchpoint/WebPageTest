<?php

namespace GraphQL\Tests\Auth;

use GraphQL\Auth\AwsIamAuth;
use GraphQL\Exception\AwsRegionNotSetException;
use GuzzleHttp\Psr7\Request;
use PHPUnit\Framework\TestCase;

class AwsIamAuthTest extends TestCase
{
    /**
     * @var AwsIamAuth
     */
    protected $auth;

    protected function setUp(): void
    {
        $this->auth = new AwsIamAuth();
    }

    /**
     * @covers \GraphQL\Auth\AwsIamAuth::run
     * @covers \GraphQL\Exception\AwsRegionNotSetException::__construct
     */
    public function testRunMissingRegion()
    {
        $this->expectException(AwsRegionNotSetException::class);
        $request = new Request('POST', '');
        $this->auth->run($request, []);
    }

    /**
     * @covers \GraphQL\Auth\AwsIamAuth::run
     * @covers \GraphQL\Auth\AwsIamAuth::getSignature
     * @covers \GraphQL\Auth\AwsIamAuth::getCredentials
     */
    public function testRunSuccess()
    {
        $request = $this->auth->run(
            new Request('POST', ''),
            ['aws_region' => 'us-east-1']
        );
        $headers = $request->getHeaders();
        $this->assertArrayHasKey('X-Amz-Date', $headers);
        $this->assertArrayHasKey('X-Amz-Security-Token', $headers);
        $this->assertArrayHasKey('Authorization', $headers);
    }
}
