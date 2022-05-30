<?php

declare(strict_types=1);

namespace WebPageTest;

class User
{
    private ?string $email;
    private bool $is_admin;
    private ?string $owner_id;
    private ?string $access_token;
    private ?int $user_id;
    private bool $is_paid_and_in_good_standing;
    private bool $is_verified;
    private bool $is_wpt_enterprise_client;

    public function __construct()
    {
        $this->email = null;
        $this->is_admin = false;
        $this->owner_id = "2445"; // owner id of 2445 was for unpaid users
        $this->access_token = null;
        $this->user_id = null;
        $this->is_paid_and_in_good_standing = false;
        $this->is_verified = false;
        $this->user_priority = 9; //default to lowest possible priority
        $this->is_wpt_enterprise_client = false;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(?string $email): void
    {
        if (isset($email)) {
            $this->email = $email;
        }
    }

    public function setAdmin(bool $is_admin): void
    {
        $this->is_admin = $is_admin;
    }

    public function getOwnerId(): ?string
    {
        return $this->owner_id;
    }

    /**
     * @var string|int $owner_id
     */
    public function setOwnerId($owner_id): void
    {
        $this->owner_id = strval($owner_id);
    }

    public function isPaid(): bool
    {
        return $this->is_paid_and_in_good_standing;
    }

    public function setPaid(bool $is_paid): void
    {
        $this->is_paid_and_in_good_standing = $is_paid;
    }

    public function isAdmin(): bool
    {
        return $this->is_admin;
    }

    public function isAnon(): bool
    {
        return $this->email == null;
    }

    public function getAccessToken(): ?string
    {
        return $this->access_token;
    }

    public function setAccessToken(?string $access_token): void
    {
        if (isset($access_token)) {
            $this->access_token = $access_token;
        }
    }

    public function getRefreshToken(): ?string
    {
        return $this->refresh_token;
    }

    public function setRefreshToken(?string $refresh_token): void
    {
        if (isset($refresh_token)) {
            $this->refresh_token = $refresh_token;
        }
    }

    public function getUserId(): ?int
    {
        return $this->user_id;
    }

    public function setUserId(?int $user_id): void
    {
        if (isset($user_id)) {
            $this->user_id = $user_id;
        }
    }

    public function isVerified(): bool
    {
        return $this->is_verified;
    }

    public function setVerified(bool $is_verified): void
    {
        $this->is_verified = $is_verified;
    }

    public function isWptEnterpriseClient(): bool
    {
        return $this->is_wpt_enterprise_client;
    }

    public function setEnterpriseClient(bool $is_wpt_enterprise_client): void
    {
        $this->is_wpt_enterprise_client = $is_wpt_enterprise_client;
    }

    public function setUserPriority(int $user_priority): void
    {
        $this->user_priority = $user_priority;
    }

    public function getUserPriority(): ?int
    {
        return $this->user_priority;
    }
}
