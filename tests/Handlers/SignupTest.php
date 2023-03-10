<?php

declare(strict_types=1);

namespace WebPageTest\Handlers;

use PHPUnit\Framework\TestCase;
use WebPageTest\RequestContext;
use WebPageTest\CPSignupClient;
use WebPageTest\Handlers\Signup as SignupHandler;
use WebPageTest\PlanList;

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
}
