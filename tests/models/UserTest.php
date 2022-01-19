<?php declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use WebPageTest\User;

final class UserTest extends TestCase {
  public function testConstructorSetsValues() : void {
    $user = new User();
    $this->assertTrue($user->is_anon());
    $this->assertFalse($user->is_admin());
    $this->assertFalse($user->is_paid_api_user());
  }

  public function testSettingEmail () : void {
    $user = new User();
    $email = 'foo@bar.com';
    $user->set_email($email);
    $this->assertEquals($email, $user->get_email());
    $this->assertFalse($user->is_anon());
  }

  public function testSettingOwnerId () : void {
    $user = new User();
    $owner_id = 1234;
    $user->set_owner_id($owner_id);
    $this->assertEquals($owner_id, $user->get_owner_id());
    $this->assertTrue($user->is_paid_api_user());
  }

  public function testSettingAdmin () : void {
    $user = new User();
    $this->assertFalse($user->is_admin());
    $user->set_admin(true);
    $this->assertTrue($user->is_admin());
  }
}
