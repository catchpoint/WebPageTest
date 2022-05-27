<?php

declare(strict_types=1);

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
}
