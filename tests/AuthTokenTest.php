<?php declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use WebPageTest\AuthToken;

final class AuthTokenTest extends TestCase {
  public function testConstructorSetsValues () : void {
    $options = array(
      'access_token' => 'abcdef123',
      'expires_in' => 4,
      'refresh_token' => 'bcedef1234',
      'scope' => 'ohno',
      'token_type' => 'id'
    );
    $auth_token = new AuthToken($options);
    $this->assertEquals('abcdef123', $auth_token->access_token);
    $this->assertEquals(4, $auth_token->expires_in);
    $this->assertEquals('bcedef1234', $auth_token->refresh_token);
    $this->assertEquals('ohno', $auth_token->scope);
    $this->assertEquals('id', $auth_token->token_type);
  }
}
?>
