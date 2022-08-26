<?php

declare(strict_types=1);

namespace WebPageTest\Handlers;

use stdClass;
use PHPUnit\Framework\TestCase;
use WebPageTest\CPClient;
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

    public function testPostUpdatePlanSummary(): void
    {
        $body = [
            'subscription_id' => 'abcdef',
            'plan' => 'ap74'
        ];

        $client = $this->createMock(CPClient::class);
        $client->expects($this->once())
          ->method('updatePlan')
          ->with('abcdef', 'ap74');

        $req = new RequestContext([]);
        $req->setClient($client); // intelephense gets made about MockObject getting passed here
        $url = Account::postUpdatePlanSummary($req, $body);

        $this->assertEquals('http://127.0.0.1/account', $url);
    }

    public function testValidateChangeContactInfo(): void
    {
        $expected = new stdClass();
        $expected->first_name = "Glooby";
        $expected->last_name = "Plz";
        $expected->id = "5";
        $expected->company_name = "Catchpoint";

        $body = [
          'first-name' => "Glooby",
          'last-name' => "Plz",
          'id' => "5",
          'company-name' => "Catchpoint"
        ];

        $actual = Account::validateChangeContactInfo($body);

        $this->assertEquals($expected, $actual);
    }

    public function testValidateChangeContactInfoMissingId(): void
    {
        $body = [
          'first-name' => "Glooby",
          'last-name' => "Plz",
          'company-name' => "Catchpoint"
        ];

        $this->expectException(ClientException::class);
        Account::validateChangeContactInfo($body);
    }

    public function testValidateChangeContactInfoMissingFirstName(): void
    {
        $body = [
          'id' => "5",
          'last-name' => "Plz",
          'company-name' => "Catchpoint"
        ];

        $this->expectException(ClientException::class);
        Account::validateChangeContactInfo($body);
    }

    public function testValidateChangeContactInfoMissingLastName(): void
    {
        $body = [
          'id' => "5",
          'first-name' => "Plz",
          'company-name' => "Catchpoint"
        ];

        $this->expectException(ClientException::class);
        Account::validateChangeContactInfo($body);
    }

    public function testValidateChangeContactInfoNoCompanyName(): void
    {
        $expected = new stdClass();
        $expected->first_name = "Glooby";
        $expected->last_name = "Plz";
        $expected->id = "5";

        $body = [
          'id' => "5",
          'first-name' => "Glooby",
          'last-name' => "Plz"
        ];

        $actual = Account::validateChangeContactInfo($body);
        $this->assertEquals($expected, $actual);
    }
}
