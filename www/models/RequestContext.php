<?php declare(strict_types=1);

namespace WebPageTest;

use WebPageTest\User;

class RequestContext {
  private array $raw;
  private ?User $user;

  function __construct (array $global_request) {
    $this->raw = $global_request;
    $this->user = null;
  }

  function getRaw () : array {
    return $this->raw;
  }

  function getUser () : ?User {
    return $this->user;
  }

  function setUser (?User $user) : void {
    if (isset($user)) {
      $this->user = $user;
    }
  }

}
?>
