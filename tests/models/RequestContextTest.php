<?php declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use WebPageTest\RequestContext;
use WebPageTest\User;

final class RequestContextTest extends TestCase {
  public function testConstructorSetsValues() : void {
    $global_req = [];
    $request = new RequestContext($global_req);
    $this->assertEquals($global_req, $request->getRaw());
  }
  public function testSetGetUser() : void {
    $global_req = [];
    $email = 'foo@foo.com';
    $user = new User();
    $user->setEmail($email);
    $request = new RequestContext($global_req);
    $request->setUser($user);
    $this->assertEquals($email, $request->getUser()->getEmail());
  }
}

?>
