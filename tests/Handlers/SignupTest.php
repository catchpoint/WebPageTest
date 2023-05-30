<?php

declare(strict_types=1);

namespace WebPageTest\Handlers;

use PHPUnit\Framework\TestCase;
use WebPageTest\RequestContext;
use WebPageTest\CPSignupClient;
use WebPageTest\Handlers\Signup as SignupHandler;
use WebPageTest\PlanList;
use WebPageTest\Exception\ClientException;

final class SignupTest extends TestCase
{
    public function testGetStepOne(): void
    {
        $request_context = new RequestContext([]);
        $client = $this->createMock(CPSignupClient::class);
        $client->expects($this->once())
            ->method('getWptPlans')
            ->willReturn(new PlanList());
        $request_context->setSignupClient($client);
        $vars = [];

        SignupHandler::getStepOne($request_context, $vars);
    }

    public function testValidatePostStepTwoNoBodyContent(): void
    {
        $request_context = new RequestContext([]);
        $client = $this->createMock(CPSignupClient::class);
        $request_context->setSignupClient($client);

        $vars = [];

        $this->expectException(ClientException::class);
        $this->expectExceptionMessage("Password required");
        SignupHandler::validatePostStepTwo($vars);
    }

    public function testValidatePostStepTwoMismatchPassword(): void
    {
        $request_context = new RequestContext([]);
        $client = $this->createMock(CPSignupClient::class);
        $request_context->setSignupClient($client);

        $vars = [
          'password' => 'abc123fH!',
          'confirm-password' => 'abc123fH'
        ];

        $this->expectException(ClientException::class);
        $this->expectExceptionMessage("Passwords must match");
        SignupHandler::validatePostStepTwo($vars);
    }

    public function testValidatePostStepTwoPasswordBreaksRules(): void
    {
        $request_context = new RequestContext([]);
        $client = $this->createMock(CPSignupClient::class);
        $request_context->setSignupClient($client);

        $vars = [
          'password' => 'abc123fH!>',
          'confirm-password' => 'abc123fH!>'
        ];

        $this->expectException(ClientException::class);
        $this->expectExceptionMessage('The requirements are at least 8 characters, including a number, lowercase letter, uppercase letter and symbol. No <, >.');
        SignupHandler::validatePostStepTwo($vars);
    }

    public function testValidatePostStepTwoMissingFirstName(): void
    {
        $request_context = new RequestContext([]);
        $client = $this->createMock(CPSignupClient::class);
        $request_context->setSignupClient($client);

        $vars = [
          'password' => 'abc123fH!',
          'confirm-password' => 'abc123fH!'
        ];

        $this->expectException(ClientException::class);
        $this->expectExceptionMessage('First and Last Name must be filled in');
        SignupHandler::validatePostStepTwo($vars);
    }

    public function testValidatePostStepTwoMissingLastName(): void
    {
        $request_context = new RequestContext([]);
        $client = $this->createMock(CPSignupClient::class);
        $request_context->setSignupClient($client);

        $vars = [
          'password' => 'abc123fH!',
          'confirm-password' => 'abc123fH!',
          'first-name' => 'Bobbina'
        ];

        $this->expectException(ClientException::class);
        $this->expectExceptionMessage('First and Last Name must be filled in');
        SignupHandler::validatePostStepTwo($vars);
    }

    public function testValidatePostStepTwoNoTermsService(): void
    {
        $request_context = new RequestContext([]);
        $client = $this->createMock(CPSignupClient::class);
        $request_context->setSignupClient($client);

        $vars = [
          'password' => 'abc123fH!',
          'confirm-password' => 'abc123fH!',
          'first-name' => 'Bobbina',
          'last-name' => 'Dobalina'
        ];

        $this->expectException(ClientException::class);
        $this->expectExceptionMessage('Must accept terms and conditions');
        SignupHandler::validatePostStepTwo($vars);
    }

    public function testValidatePostStepTwoReturnsProperBodyWhenFree(): void
    {
        $request_context = new RequestContext([]);
        $client = $this->createMock(CPSignupClient::class);
        $request_context->setSignupClient($client);

        $password = 'abc123fH!';
        $confirm_password = 'abc123fH!';
        $first_name = 'Bobbina';
        $last_name = 'Dobalina';
        $terms_service = 'on';
        $plan = 'free';

        $vars = [
          'password' => $password,
          'confirm-password' => $confirm_password,
          'first-name' => $first_name,
          'last-name' => $last_name,
          'terms-service' => $terms_service,
          'plan' => $plan
        ];

        $body = SignupHandler::validatePostStepTwo($vars);
        $this->assertEquals($body->password, $password);
        $this->assertEquals($body->first_name, $first_name);
        $this->assertEquals($body->last_name, $last_name);
        $this->assertEquals($body->plan, $plan);
        $this->assertNull($body->company_name);
        $this->assertNull($body->street_address);
        $this->assertNull($body->city);
        $this->assertNull($body->state_code);
        $this->assertNull($body->country_code);
        $this->assertNull($body->zipcode);
    }
}
