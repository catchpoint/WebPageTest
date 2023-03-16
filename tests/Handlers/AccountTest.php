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
use WebPageTest\BannerMessageManager;
use WebPageTest\CPGraphQlTypes\ChargifyAddressInput;
use WebPageTest\CPGraphQlTypes\Customer;
use WebPageTest\CPGraphQlTypes\ApiKeyList;
use WebPageTest\PaidPageInfo;

/**
 * These are std lib functions in php that are called in this
 * handler that set no bearing on whether or not the function
 * worked/did what it was supposed to. This just cancels them
 * out for the test
 */
function setcookie($name, $value, $expiration, $path, $domain)
{
}
function error_log($str)
{
}

define('FRIENDLY_URLS', true);


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
        $response = Account::postPlanUpgrade($req, $post_body);

        $this->assertEquals('http://127.0.0.2/account/plan_summary', $response->getTargetUrl());
    }

    public function testValidatePostUpdatePlanSummary(): void
    {
        $expected = new stdClass();
        $expected->subscription_id = 'abcdef';
        $expected->plan = 'ap74';
        $expected->is_upgrade = true;
        $expected->runs = 5000;

        $post_body = [
            'subscription_id' => 'abcdef',
            'plan' => 'ap74',
            'is_upgrade' => '1',
            'runs' => '5000'
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
        $expected->runs = 1000;

        $post_body = [
            'subscription_id' => 'abcdef',
            'plan' => 'ap74',
            'is_upgrade' => '',
            'runs' => 1000
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
        $body->runs = 1000;

        $client = $this->createMock(CPClient::class);
        $client->expects($this->once())
            ->method('updatePlan')
            ->with('abcdef', 'ap74');

        $bmm = $this->createMock(BannerMessageManager::class);
        $bmm->expects($this->once())
            ->method('put')
            ->with('form', [
                'type' => 'success',
                'text' => 'Your plan has been successfully updated!'
            ]);


        $req = new RequestContext([], [], ['host' => '127.0.0.2']);
        $req->setClient($client); // intelephense gets mad about MockObject getting passed here
        $req->setBannerMessageManager($bmm); // intelephense gets mad about MockObject getting passed here
        $response = Account::postUpdatePlanSummary($req, $body);

        $this->assertEquals('http://127.0.0.2/account', $response->getTargetUrl());
    }

    public function testPostUpdatePlanSummaryError(): void
    {
        $body = new stdClass();
        $body->subscription_id = 'abcdef';
        $body->plan = 'ap74';
        $body->is_upgrade = true;

        $client = $this->getMockBuilder(CPClient::class)
            ->disableOriginalConstructor()
            ->disableOriginalClone()
            ->disableArgumentCloning()
            ->disallowMockingUnknownTypes()
            ->getMock();

        $client = $this->createMock(CPClient::class);
        $client->method('updatePlan')
            ->willThrowException(new \Exception('Plan name incorrect'));

        $bmm = $this->createMock(BannerMessageManager::class);
        $bmm->expects($this->once())
            ->method('put')
            ->with('form', [
                'type' => 'error',
                'text' => 'There was an error updating your plan. Please try again or contact customer service.'
            ]);


        $req = new RequestContext([], [], ['host' => '127.0.0.2']);
        $req->setClient($client); // intelephense gets mad about MockObject getting passed here
        $req->setBannerMessageManager($bmm); // intelephense gets mad about MockObject getting passed here
        $response = Account::postUpdatePlanSummary($req, $body);

        $this->assertEquals('http://127.0.0.2/account', $response->getTargetUrl());
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

    public function testValidateChangeContactInfoEmptyCompanyName(): void
    {
        $expected = new stdClass();
        $expected->first_name = "Bloopy";
        $expected->last_name = "Pineapples";
        $expected->company_name = "";
        $expected->id = "5";

        $body = [
            'id' => "5",
            'first-name' => "Bloopy",
            'last-name' => "Pineapples",
            'company-name' => ""
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

        $bmm = $this->createMock(BannerMessageManager::class);

        $bmm->expects($this->once())
            ->method('put')
            ->with('form', [
                'type' => "success",
                'text' => "Your password has been updated!"
            ]);

        $req->setClient($client);
        $req->setBannerMessageManager($bmm);

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

        $bmm = $this->createMock(BannerMessageManager::class);

        $bmm->expects($this->once())
            ->method('put')
            ->with('form', [
                'type' => "error",
                'text' => "Password update failed"
            ]);

        $req->setBannerMessageManager($bmm);

        $this->assertEquals("http://127.0.0.2/account", Account::changePassword($req, $body));
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

    public function testValidatePreviewCost(): void
    {
        $post = [
            'plan' => 'ap1',
            'street-address' => '123 Main St',
            'city' => 'New York',
            'state' => 'NY',
            'country' => 'US',
            'zipcode' => '12345-1234'
        ];

        $expected = new stdClass();
        $expected->plan = 'ap1';
        $expected->city = 'New York';
        $expected->country = 'US';
        $expected->state = 'NY';
        $expected->street_address = '123 Main St';
        $expected->zipcode = '12345-1234';

        $this->assertEquals($expected, Account::validatePreviewCost($post));
    }

    public function testValidatePreviewCostError(): void
    {
        $post = [
            'plan' => 'ap1',
            'city' => 'New York',
            'state' => 'NY',
            'country' => 'US',
            'zipcode' => '12345-1234'
        ];

        $expected = new stdClass();
        $expected->plan = 'ap1';
        $expected->city = 'New York';
        $expected->country = 'US';
        $expected->state = 'NY';
        $expected->street_address = '123 Main St';
        $expected->zipcode = '12345-1234';

        $this->expectException(ClientException::class);
        Account::validatePreviewCost($post);
    }

    public function testPreviewCost(): void
    {
        $address = new ChargifyAddressInput([
            'city' => 'New York',
            'country' => 'US',
            'state' => 'NY',
            'street_address' => '123 Main St',
            'zipcode' => '12345-1234'
        ]);

        $body = new stdClass();
        $body->plan = 'ap1';
        $body->city = $address->getCity();
        $body->country = $address->getCountry();
        $body->state = $address->getState();
        $body->street_address = $address->getStreetAddress();
        $body->zipcode = $address->getZipcode();

        $req = new RequestContext([]);

        $client = $this->createMock(CPClient::class);
        $client->expects($this->once())
            ->method('getChargifySubscriptionPreview')
            ->with($body->plan, $address);

        $req->setClient($client);

        Account::previewCost($req, $body);
    }

    public function testUpdatePaymentMethod(): void
    {
        $nonce = bin2hex(random_bytes(10));

        $body = new stdClass();
        $body->token = $nonce;
        $body->city = 'New York';
        $body->country = 'US';
        $body->state = 'NY';
        $body->street_address = '123 Main St';
        $body->zipcode = '12345-1234';

        $address = new ChargifyAddressInput([
            'city' => 'New York',
            'country' => 'US',
            'state' => 'NY',
            'street_address' => '123 Main St',
            'zipcode' => '12345-1234'
        ]);

        $req = new RequestContext([], [], ['host' => '127.0.0.2']);

        $client = $this->createMock(CPClient::class);
        $client->expects($this->once())
            ->method('updatePaymentMethod')
            ->with($body->token, $address);

        $bmm = $this->createMock(BannerMessageManager::class);
        $bmm->expects($this->once())
            ->method('put')
            ->with('form', [
                'type' => 'success',
                'text' => 'Your payment method has successfully been updated!'
            ]);

        $req->setClient($client);
        $req->setBannerMessageManager($bmm);

        $url = Account::updatePaymentMethod($req, $body);
        $this->assertEquals('http://127.0.0.2/account', $url);
    }

    public function testUpdatePaymentMethodError(): void
    {
        $nonce = bin2hex(random_bytes(10));

        $body = new stdClass();
        $body->token = $nonce;
        $body->city = 'New York';
        $body->country = 'US';
        $body->state = 'NY';
        $body->street_address = '123 Main St';
        $body->zipcode = '12345-1234';

        $req = new RequestContext([], [], ['host' => '127.0.0.2']);

        $client = $this->createMock(CPClient::class);
        $client->expects($this->once())
            ->method('updatePaymentMethod')
            ->willThrowException(new \Exception('BAD'));

        $bmm = $this->createMock(BannerMessageManager::class);
        $bmm->expects($this->once())
            ->method('put')
            ->with('form', [
                'type' => 'error',
                'text' => "There was an error updating your payment method. Please try again or contact customer service."
            ]);

        $req->setClient($client);
        $req->setBannerMessageManager($bmm);

        $url = Account::updatePaymentMethod($req, $body);
        $this->assertEquals('http://127.0.0.2/account', $url);
    }

    public function testResendEmailVerification(): void
    {
        $req = new RequestContext([], [], ['host' => '127.0.0.2']);

        $client = $this->createMock(CPClient::class);
        $client->expects($this->once())
            ->method('resendEmailVerification');

        $req->setClient($client);

        $this->assertEquals('http://127.0.0.2/account', Account::resendEmailVerification($req));
    }

    public function testResendEmailVerificationError(): void
    {
        $req = new RequestContext([], [], ['host' => '127.0.0.2']);

        $client = $this->createMock(CPClient::class);
        $client->expects($this->once())
            ->method('resendEmailVerification')
            ->willThrowException(new \Exception('Resend did not work'));

        $req->setClient($client);

        $this->expectException(ClientException::class);
        Account::resendEmailVerification($req);
    }

    public function testGetAccountPageDefaultFree(): void
    {
        $page = "";

        $req = new RequestContext([]);
        $user = new User();
        $user->setContactId(12345);
        $req->setUser($user);

        $client = $this->createMock(CPClient::class);
        $client->expects($this->once())
            ->method('getFullWptPlanSet');
        $client->expects($this->once())
            ->method('getUserContactInfo')
            ->with(12345)
            ->willReturn([
                'firstName' => "Goober",
                'lastName' => "Goob",
                'companyName' => ""
            ]);
        $req->setClient($client);

        $bmm = $this->createMock(BannerMessageManager::class);
        $bmm->expects($this->once())
            ->method('get')
            ->willReturn([]);
        $req->setBannerMessageManager($bmm);

        $_GLOBALS['request_context'] = $req;
        Account::getAccountPage($req, $page);
    }

    public function testGetAccountPageDefaultFreeCompanyNull(): void
    {
        $page = "";

        $req = new RequestContext([]);
        $user = new User();
        $user->setContactId(12345);
        $req->setUser($user);

        $client = $this->createMock(CPClient::class);
        $client->expects($this->once())
            ->method('getFullWptPlanSet');
        $client->expects($this->once())
            ->method('getUserContactInfo')
            ->with(12345)
            ->willReturn([
                'firstName' => "Goober",
                'lastName' => "Goob",
                'companyName' => null
            ]);
        $req->setClient($client);

        $bmm = $this->createMock(BannerMessageManager::class);
        $bmm->expects($this->once())
            ->method('get')
            ->willReturn([]);
        $req->setBannerMessageManager($bmm);

        Account::getAccountPage($req, $page);
    }

    public function testGetUpdatePaymentMethodAddressPage(): void
    {
        $page = "update_payment_method";

        $req = new RequestContext([]);
        $user = new User();
        $user->setPaidClient(true);
        $user->setPaymentStatus('ACTIVE');
        $user->setContactId(12345);
        $req->setUser($user);

        $client = $this->createMock(CPClient::class);
        $client->expects($this->once())
            ->method('getUserContactInfo')
            ->with(12345)
            ->willReturn([
                'firstName' => "Goober",
                'lastName' => "Goob",
                'companyName' => null
            ]);
        $customer = new Customer([
            'customerId' => '',
            'subscriptionId' => '',
            'wptPlanId' => '',
            'subscriptionPrice' => 10.00,
            'status' => 'ACTIVE',
            'wptPlanName' => '',
            'monthlyRuns' => 8
        ]);
        $wpt_api_key_list = new ApiKeyList();
        $paid_page_info = new PaidPageInfo($customer, $wpt_api_key_list);
        $client->expects($this->once())
            ->method('getPaidAccountPageInfo')
            ->willReturn($paid_page_info);
        $req->setClient($client);

        $bmm = $this->createMock(BannerMessageManager::class);
        $bmm->expects($this->once())
            ->method('get')
            ->willReturn([]);
        $req->setBannerMessageManager($bmm);

        Account::getAccountPage($req, $page);
    }
}
