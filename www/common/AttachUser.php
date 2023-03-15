<?php

declare(strict_types=1);

use WebPageTest\User;
use WebPageTest\Util;
use WebPageTest\Util\Cache;
use WebPageTest\Util\OAuth as CPOauth;
use WebPageTest\RequestContext;
use WebPageTest\Exception\UnauthorizedException;

(function (RequestContext $request) {
    global $admin;
    global $owner;

    $host = Util::getSetting('host');
    $cp_access_token_cookie_name = Util::getCookieName(CPOauth::$cp_access_token_cookie_key);
    $cp_refresh_token_cookie_name = Util::getCookieName(CPOauth::$cp_refresh_token_cookie_key);

    $user = new User();

    // Signed in, grab info on user
    if ($request->getClient()->isAuthenticated()) {
        try {
            $user = $request->getClient()->getUser();
            $owner = $user->getOwnerId();
            if ($request->getClient()->isAuthenticated()) {
                $user->setAccessToken($request->getClient()->getAccessToken());
            }
            if (isset($_COOKIE[$cp_refresh_token_cookie_name])) {
                $user->setRefreshToken($_COOKIE[$cp_refresh_token_cookie_name]);
            }
        } catch (UnauthorizedException $e) {
            error_log($e->getMessage());
            // if this fails, Refresh and retry
            $refresh_token = $user->getRefreshToken();
            if (is_null($refresh_token)) {
                // if no refresh token, delete the access token, it is no longer useful
                setcookie($cp_access_token_cookie_name, "", time() - 3600, "/", $host);
            } else {
                try {
                    $auth_token = $request->getClient()->refreshAuthToken($refresh_token);
                    $request->getClient()->authenticate($auth_token->access_token);
                    setcookie(
                        $cp_access_token_cookie_name,
                        $auth_token->access_token,
                        time() + $auth_token->expires_in,
                        "/",
                        $host
                    );
                    setcookie(
                        $cp_refresh_token_cookie_name,
                        $auth_token->refresh_token,
                        time() + 60 * 60 * 24 * 30,
                        "/",
                        $host
                    );
                    $user = $request->getClient()->getUser();
                    $owner = $user->getOwnerId();
                    if ($request->getClient()->isAuthenticated()) {
                        $user->setAccessToken($request->getClient()->getAccessToken());
                    }
                    if (isset($_COOKIE[$cp_refresh_token_cookie_name])) {
                        $user->setRefreshToken($_COOKIE[$cp_refresh_token_cookie_name]);
                    }
                } catch (Exception $e) {
                    error_log($e->getMessage());
                    // if this fails, delete all the cookies
                    setcookie($cp_access_token_cookie_name, "", time() - 3600, "/", $host);
                    setcookie($cp_refresh_token_cookie_name, "", time() - 3600, "/", $host);
                }
            }
        } catch (Exception $e) {
            // Any other kind of error, kill it.
            // Delete the cookies. Force the logout. Otherwise you
            // can get into some weird forever redirect states
            error_log($e->getMessage());
            setcookie($cp_access_token_cookie_name, "", time() - 3600, "/", $host);
            setcookie($cp_refresh_token_cookie_name, "", time() - 3600, "/", $host);
        }
    } elseif (!empty($request->getApiKeyInUse())) {
        $user_api_key = $request->getApiKeyInUse();
        $redis_server = Util::getSetting('redis_api_keys');
        // Check the redis-based API keys if it wasn't a local key
        try {
            $redis = new Redis();
            if ($redis->connect($redis_server, 6379, 30)) {
                $account = Cache::fetch("APIkey_$user_api_key");
                if (!isset($account)) {
                    $response = $redis->get("API_$user_api_key");
                    if ($response && strlen($response)) {
                        $account = json_decode($response, true);
                        if (isset($account) && is_array($account)) {
                            Cache::store("APIkey_$user_api_key", $account, 60);
                        }
                    }
                }
                if ($account && is_array($account) && isset($account['accountId']) && isset($account['expiration'])) {
                    // Check the expiration (with a 2-day buffer)
                    if (time() <= $account['expiration'] + 172800) {
                        $owner = $account['accountId'];
                        $user_id = $account['userId'] ?? null;
                        $contact_id = $account['contactId'] ?? null;
                        $user->setPaidClient(true);
                        $user->setOwnerId($owner);
                        $user->setContactId($contact_id);
                        $user->setUserId($user_id);
                    }
                }
            }
        } catch (Exception $e) {
            throw new Exception('Error validating API Key');
        }
    }

    if ($user->isPaid()) {
        //calculate based on paid priority
        $user->setUserPriority((int)Util::getSetting('paid_priority', 0));
    } else {
        $user->setUserPriority((int)Util::getSetting('user_priority', 0));
    }

    $user_email = $user->getEmail();

    if (!$admin && !is_null($user_email) && $user->isVerified()) {
        $admin_users = Util::getSetting("admin_users");
        if ($admin_users) {
            $admin_users = explode(',', $admin_users);
            if (is_array($admin_users) && count($admin_users)) {
                foreach ($admin_users as $substr) {
                    if (stripos($user_email, $substr) !== false) {
                        $user->setAdmin(true);
                        $admin = true;
                        break;
                    }
                }
            }
        }
    }

    $request->setUser($user);
})($request_context);
