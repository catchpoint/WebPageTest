<?php

declare(strict_types=1);

namespace WebPageTest\Handlers;

use PHPUnit\Framework\TestCase;
use WebPageTest\Handlers\Account;
use WebPageTest\Exception\ClientException;
use WebPageTest\RequestContext;

function setcookie($name, $value, $expiration, $path, $domain)
{
}


final class AccountTest extends TestCase
{
    public function testValidatePlanUpgrade(): void
    {
        $post_body = [
            'plan' => 'ap1'
        ];

        $vars = Account::validatePlanUpgrade($post_body);
        $this->assertEquals('ap1', $vars->plan);
    }

    public function testValidatePlanUpgradeWrongBody(): void
    {
        $post_body = [
            'plume' => 'ap1'
        ];

        $this->expectException(ClientException::class);
        Account::validatePlanUpgrade($post_body);
    }

    public function testPostPlanUpgrade(): void
    {

        $post_body = (object)[
            'plan' => 'ap1'
        ];
        $req = new RequestContext([]);
        $url = Account::postPlanUpgrade($req, $post_body);
        $this->assertEquals('http://127.0.0.1/account/plan_summary', $url);
    }
}
