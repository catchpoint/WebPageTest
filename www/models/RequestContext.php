<?php declare(strict_types=1);

namespace WebPageTest;

use WebPageTest\User;
use WebPageTest\CPClient;

class RequestContext {
  private array $raw;
  private ?User $user;
  private ?CPClient $client;

  function __construct (array $global_request) {
    $this->raw = $global_request;
    $this->user = null;
    $this->client = null;
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

  function getClient () : ?CPClient {
    return $this->client;
  }

  function setClient (?CPClient $client) : void {
    if (isset($client)) {
      $this->client = $client;
    }
  }
}
?>
