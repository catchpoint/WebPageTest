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
        $this->assertFalse($user->isPaidApiUser());
    }

    public function testSettingEmail(): void
    {
        $user = new User();
        $email = 'foo@bar.com';
        $user->setEmail($email);
        $this->assertEquals($email, $user->getEmail());
        $this->assertFalse($user->isAnon());
    }

    public function testSettingOwnerId(): void
    {
        $user = new User();
        $owner_id = 1234;
        $user->setOwnerId($owner_id);
        $this->assertEquals($owner_id, $user->getOwnerId());
        $this->assertTrue($user->isPaidApiUser());
    }

    public function testSettingAdmin(): void
    {
        $user = new User();
        $this->assertFalse($user->isAdmin());
        $user->setAdmin(true);
        $this->assertTrue($user->isAdmin());
    }
}
