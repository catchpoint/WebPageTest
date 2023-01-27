<?php

declare(strict_types=1);

namespace WebPageTest;

use PHPUnit\Framework\TestCase;
use WebPageTest\User;

final class UserTest extends TestCase
{
    public function testConstructorSetsValues(): void
    {
        $user = new User();
        $this->assertTrue($user->isAnon());
        $this->assertFalse($user->isAdmin());
        $this->assertFalse($user->isPaid());
        $this->assertNull($user->getEmail());
        $this->assertNull($user->getAccessToken());
        $this->assertNull($user->getUserId());
        $this->assertFalse($user->isVerified());
    }

    public function testSettingEmail(): void
    {
        $user = new User();
        $email = 'foo@bar.com';
        $user->setEmail($email);
        $this->assertEquals($email, $user->getEmail());
        $this->assertFalse($user->isAnon());
    }

    public function testSettingAdmin(): void
    {
        $user = new User();
        $this->assertFalse($user->isAdmin());
        $user->setAdmin(true);
        $this->assertTrue($user->isAdmin());
    }

    public function testSettingPriority(): void
    {
        $user = new User();
        $this->assertEquals($user->getUserPriority(), 9);
        $user->setUserPriority(0);
        $this->assertEquals($user->getUserPriority(), 0);
    }

    public function testGetSetFirstName(): void
    {
        $user = new User();
        $this->assertEquals("", $user->getFirstName());
        $user->setFirstName();
        $this->assertEquals("", $user->getFirstName());
        $user->setFirstName("Gooby");
        $this->assertEquals("Gooby", $user->getFirstName());
    }

    public function testGetSetLastName(): void
    {
        $user = new User();
        $this->assertEquals("", $user->getLastName());
        $user->setLastName();
        $this->assertEquals("", $user->getLastName());
        $user->setLastName("Pls");
        $this->assertEquals("Pls", $user->getLastName());
    }

    public function testSetGetIsPaid(): void
    {
        $user = new User();
        $this->assertFalse($user->isPaid());
        $user->setPaidClient(true);
        $this->assertFalse($user->isPaid());
        $user->setPaymentStatus('ACTIVE');
        $this->assertTrue($user->isPaid());
    }

    public function testSetGetIsPaidNoStatusPassed(): void
    {
        $user = new User();
        $this->assertFalse($user->isPaid());
        $user->setPaidClient(true);
        $this->assertFalse($user->isPaid());
        $user->setPaymentStatus();
        $this->assertFalse($user->isPaid());
    }

    public function testSetGetIsPaidNullStatusPassed(): void
    {
        $user = new User();
        $this->assertFalse($user->isPaid());
        $user->setPaidClient(true);
        $this->assertFalse($user->isPaid());
        $user->setPaymentStatus(null);
        $this->assertFalse($user->isPaid());
    }

    public function testSetGetIsPaidCanceledStatusPassed(): void
    {
        $user = new User();
        $this->assertFalse($user->isPaid());
        $user->setPaidClient(true);
        $this->assertFalse($user->isPaid());
        $user->setPaymentStatus('CANCELED');
        $this->assertFalse($user->isPaid());
        $this->assertTrue($user->isCanceled());
    }

    public function testSetGetIsPaidPendingStatusPassed(): void
    {
        $user = new User();
        $this->assertFalse($user->isPaid());
        $user->setPaidClient(true);
        $this->assertFalse($user->isPaid());
        $user->setPaymentStatus('PENDING_CANCELATION');
        $this->assertTrue($user->isPaid());
        $this->assertTrue($user->isCanceled());
        $this->assertTrue($user->isPendingCancelation());
    }
}
