<?php

declare(strict_types=1);

namespace WebPageTest\Handlers;

use stdClass;
use PHPUnit\Framework\TestCase;
use WebPageTest\CPClient;
use WebPageTest\Handlers\Account;
use WebPageTest\Exception\ClientException;
use WebPageTest\RequestContext;
use WebPageTest\User;

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

        $req = new RequestContext([], [], ['host' => '127.0.0.2']);
        $url = Account::postPlanUpgrade($req, $post_body);
        $this->assertEquals('http://127.0.0.2/account/plan_summary', $url);
    }

    public function testValidatePostUpdatePlanSummary(): void
    {
        $expected = new stdClass();
        $expected->subscription_id = 'abcdef';
        $expected->plan = 'ap74';
        $expected->is_upgrade = "1";

        $post_body = [
            'subscription_id' => 'abcdef',
            'plan' => 'ap74',
            'is_upgrade' => true
        ];

        $actual = Account::validatePostUpdatePlanSummary($post_body);
        $this->assertEquals($expected, $actual);
    }

    public function testValidatePostUpdatePlanSummaryNoUpgrade(): void
    {
        $expected = new stdClass();
        $expected->subscription_id = 'abcdef';
        $expected->plan = 'ap74';
        $expected->is_upgrade = false;

        $post_body = [
            'subscription_id' => 'abcdef',
            'plan' => 'ap74',
            'is_upgrade' => ''
        ];

        $actual = Account::validatePostUpdatePlanSummary($post_body);
        $this->assertEquals($expected, $actual);
    }

    public function testPostUpdatePlanSummary(): void
    {
        $body = new stdClass();
        $body->subscription_id = 'abcdef';
        $body->plan = 'ap74';
        $body->is_upgrade = true;

        $client = $this->createMock(CPClient::class);
        $client->expects($this->once())
            ->method('updatePlan')
            ->with('abcdef', 'ap74');

        $req = new RequestContext([], [], ['host' => '127.0.0.2']);
        $req->setClient($client); // intelephense gets made about MockObject getting passed here
        $url = Account::postUpdatePlanSummary($req, $body);

        $this->assertEquals('http://127.0.0.2/account', $url);
    }

    public function testValidateChangeContactInfo(): void
    {
        $expected = new stdClass();
        $expected->first_name = "Bloopy";
        $expected->last_name = "Pineapples";
        $expected->id = "5";
        $expected->company_name = "Catchpoint";

        $body = [
          'first-name' => "Bloopy",
          'last-name' => "Pineapples",
          'id' => "5",
          'company-name' => "Catchpoint"
        ];

        $actual = Account::validateChangeContactInfo($body);

        $this->assertEquals($expected, $actual);
    }

    public function testValidateChangeContactInfoMissingId(): void
    {
        $body = [
          'first-name' => "Bloopy",
          'last-name' => "Pineapples",
          'company-name' => "Catchpoint"
        ];

        $this->expectException(ClientException::class);
        Account::validateChangeContactInfo($body);
    }

    public function testValidateChangeContactInfoMissingFirstName(): void
    {
        $body = [
          'id' => "5",
          'last-name' => "Pineapples",
          'company-name' => "Catchpoint"
        ];

        $this->expectException(ClientException::class);
        Account::validateChangeContactInfo($body);
    }

    public function testValidateChangeContactInfoMissingLastName(): void
    {
        $body = [
          'id' => "5",
          'first-name' => "Pineapples",
          'company-name' => "Catchpoint"
        ];

        $this->expectException(ClientException::class);
        Account::validateChangeContactInfo($body);
    }

    public function testValidateChangeContactInfoNoCompanyName(): void
    {
        $expected = new stdClass();
        $expected->first_name = "Bloopy";
        $expected->last_name = "Pineapples";
        $expected->id = "5";

        $body = [
          'id' => "5",
          'first-name' => "Bloopy",
          'last-name' => "Pineapples"
        ];

        $actual = Account::validateChangeContactInfo($body);
        $this->assertEquals($expected, $actual);
    }

    public function testChangeContactInfo(): void
    {

        $body = new stdClass();
        $body->first_name = "Bloopy";
        $body->last_name = "Pineapples";
        $body->company_name = "Moose";
        $body->id = "5";

        $email = 'gloobsemailz@mail.biz';

        $req = new RequestContext([], [], ['host' => '127.0.0.2']);

        $client = $this->createMock(CPClient::class);
        $client->expects($this->once())
          ->method('updateUserContactInfo')
          ->with('5', [
            'email' => $email,
            'first_name' => $body->first_name,
            'last_name' => $body->last_name,
            'company_name' => $body->company_name
          ]);

        $req->setClient($client);

        $user = new User();
        $user->setEmail($email);
        $req->setUser($user);

        $url = Account::changeContactInfo($req, $body);
        $this->assertEquals('http://127.0.0.2/account', $url);
    }

    public function testChangeContactInfoNoCompanyName(): void
    {

        $body = new stdClass();
        $body->first_name = "Bloopy";
        $body->last_name = "Pineapples";
        $body->id = "5";

        $email = 'emailz@mail.biz';

        $req = new RequestContext([], [], ['host' => '127.0.0.2']);

        $client = $this->createMock(CPClient::class);
        $client->expects($this->once())
          ->method('updateUserContactInfo')
          ->with('5', [
            'email' => $email,
            'first_name' => $body->first_name,
            'last_name' => $body->last_name,
            'company_name' => ""
          ]);

        $req->setClient($client);

        $user = new User();
        $user->setEmail($email);
        $req->setUser($user);

        $url = Account::changeContactInfo($req, $body);
        $this->assertEquals('http://127.0.0.2/account', $url);
    }

    public function testValidateChangePasswordNoMatch(): void
    {
        $good_pass_1 = 'hAuw@ViEja*DA_MHo4mCxW@ys';
        $good_pass_2 = 'WiJtGMAqsgxE!4.@qCVnoiBQN';
        $good_pass_3 = 'hf9YBewsCeKp.DVY.72Kq-c7_';

        $body = [
        'current-password' => $good_pass_1,
        'new-password' => $good_pass_2,
        'confirm-new-password' => $good_pass_3
        ];

        $this->expectException(ClientException::class);
        Account::validateChangePassword($body);
    }

    public function testValidateChangePasswordBadLengthShort(): void
    {
        $short_pw = 'HTor_v6';
        $good_pass_1 = 'hAuw@ViEja*DA_MHo4mCxW@ys';

        $body = [
        'current-password' => $good_pass_1,
        'new-password' => $short_pw,
        'confirm-new-password' => $short_pw
        ];

        $this->expectException(ClientException::class);
        Account::validateChangePassword($body);
    }

    public function testValidateChangePasswordBadLengthLong(): void
    {
        $long_pw = '-aHC_FZG7GzDeiBnmsiM3-t7egZtLfKn4';
        $good_pass_1 = 'hAuw@ViEja*DA_MHo4mCxW@ys';

        $body = [
        'current-password' => $good_pass_1,
        'new-password' => $long_pw,
        'confirm-new-password' => $long_pw
        ];

        $this->expectException(ClientException::class);
        Account::validateChangePassword($body);
    }

    public function testValidateChangePassword(): void
    {
        $good_pass_1 = 'hAuw@ViEja*DA_MHo4mCxW@ys';
        $good_pass_2 = 'WiJtGMAqsgxE!4.@qCVnoiBQN';

        $body = [
        'current-password' => $good_pass_1,
        'new-password' => $good_pass_2,
        'confirm-new-password' => $good_pass_2
        ];

        $expected = new stdClass();
        $expected->current_password = $good_pass_1;
        $expected->new_password = $good_pass_2;

        $actual = Account::validateChangePassword($body);
        $this->assertEquals($expected, $actual);
    }

    public function testChangePassword(): void
    {
        $new_pw = 'hAuw@ViEja*DA_MHo4mCxW@ys';
        $current_pw = 'WiJtGMAqsgxE!4.@qCVnoiBQN';

        $body = new stdClass();
        $body->new_password = $new_pw;
        $body->current_password = $current_pw;

        $req = new RequestContext([], [], ['host' => '127.0.0.2']);

        $client = $this->createMock(CPClient::class);
        $client->expects($this->once())
          ->method('changePassword')
          ->with($new_pw, $current_pw);
        $req->setClient($client);

        $this->assertEquals("http://127.0.0.2/account", Account::changePassword($req, $body));
    }

    public function testChangePasswordError(): void
    {
        $new_pw = 'hAuw@ViEja*DA_MHo4mCxW@ys';
        $current_pw = 'WiJtGMAqsgxE!4.@qCVnoiBQN';

        $body = new stdClass();
        $body->new_password = $new_pw;
        $body->current_password = $current_pw;

        $req = new RequestContext([], [], ['host' => '127.0.0.2']);

        $client = $this->getMockBuilder(CPClient::class)
                     ->disableOriginalConstructor()
                     ->disableOriginalClone()
                     ->disableArgumentCloning()
                     ->disallowMockingUnknownTypes()
                     ->getMock();

        $client = $this->createMock(CPClient::class);
        $client->method('changePassword')
          ->willThrowException(new \Exception('Password failed to change'));
        $req->setClient($client);

        $this->expectException(ClientException::class);
        Account::changePassword($req, $body);
    }

    public function testValidateSubscribeToAccount(): void
    {
        $post = [
            'nonce' => 'abcdef',
            'plan' => 'ap1',
            'city' => 'New York',
            'country' => 'US',
            'state' => 'NY',
            'street-address' => '123 Main St',
            'zipcode' => '12345-123'
        ];

        $expected = new stdClass();
        $expected->nonce = 'abcdef';
        $expected->plan = 'ap1';
        $expected->city = 'New York';
        $expected->country = 'US';
        $expected->state = 'NY';
        $expected->street_address = '123 Main St';
        $expected->zipcode = '12345-123';

        $actual = Account::validateSubscribeToAccount($post);
        $this->assertEquals($expected, $actual);
    }

    public function testValidateSubscribeToAccountError(): void
    {
        $post = [
            'nonce' => 'abcdef',
            'plan' => 'ap1',
            'city' => 'New York',
            'country' => 'US',
            'state' => 'NY',
            'zipcode' => '12345-123'
        ];

        $this->expectException(ClientException::class);
        Account::validateSubscribeToAccount($post);
    }
}
