<?php

declare(strict_types=1);

namespace WebPageTest;

class User
{
    private ?string $email;
    private bool $is_admin;
    private int $owner_id;

    function __construct()
    {
        $this->email = null;
        $this->is_admin = false;
        $this->owner_id = 2445; // owner id of 2445 is for unpaid users
    }

    public function get_email(): ?string
    {
        return $this->email;
    }

    public function set_email(?string $email): void
    {
        if (isset($email)) {
            $this->email = $email;
        }
    }

    public function set_admin(bool $is_admin): void
    {
        $this->is_admin = $is_admin;
    }

    public function get_owner_id(): int
    {
        return $this->owner_id;
    }

  /**
   * @var string|int $owner_id
   */
    public function set_owner_id($owner_id): void
    {
        $this->owner_id = intval($owner_id);
    }

  /**
   * 2445 is the owner id for any user that is unpaid
   */
    public function is_paid_api_user(): bool
    {
        return $this->owner_id != 2445;
    }

    public function is_admin(): bool
    {
        return $this->is_admin;
    }

    public function is_anon(): bool
    {
        return $this->email == null;
    }
}
