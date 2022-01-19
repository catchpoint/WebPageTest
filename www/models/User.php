<?php declare(strict_types=1);

namespace WebPageTest;

class User {
  private ?string $email;
  private bool $is_admin;
  private int $owner_id;

  function __construct () {
    $this->email = null;
    $this->is_admin = false;
    $this->owner_id = 2445; // owner id of 2445 is for unpaid users
  }

  public function getEmail () : ?string {
    return $this->email;
  }

  public function setEmail (?string $email) : void {
    if (isset($email)) {
      $this->email = $email;
    }
  }

  public function setAdmin (bool $is_admin) : void {
    $this->is_admin = $is_admin;
  }

  public function getOwnerId () : int {
    return $this->owner_id;
  }

  /**
   * @var string|int $owner_id
   */
  public function setOwnerId ($owner_id) : void {
    $this->owner_id = intval($owner_id);
  }

  /**
   * 2445 is the owner id for any user that is unpaid
   */
  public function isPaidApiUser () : bool {
    return $this->owner_id != 2445;
  }

  public function isAdmin () : bool {
    return $this->is_admin;
  }

  public function isAnon () : bool {
    return $this->email == null;
  }

}
