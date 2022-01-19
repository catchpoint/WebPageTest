<?php declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use WebPageTest\RequestContext;

final class RequestContextTest extends TestCase {
  public function testConstructorSetsValues() : void {
    $global_req = [];
    $request = new RequestContext($global_req);
    $this->assertEquals($global_req, $request->getRaw());
  }
}

?>
