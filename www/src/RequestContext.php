<?php

declare(strict_types=1);

namespace WebPageTest;

use WebPageTest\User;
use WebPageTest\CPClient;
use WebPageTest\CPSignupClient;
use WebPageTest\Util;
use WebPageTest\BannerMessageManager;
use WebPageTest\Environment;

class RequestContext
{
    private array $raw;
    private ?User $user;
    private ?CPClient $client;
    private ?CPSignupClient $signup_client;
    private bool $ssl_connection;
    private string $url_protocol;
    private string $request_method;
    private string $request_uri;
    private string $host;
    private ?BannerMessageManager $banner_message_manager;
    // Should use an enum, TODO
    private string $environment;
    private string $api_key_in_use;

    private string $user_api_key_header = 'X-WPT-API-KEY';

    public function __construct(array $global_request, array $server = [], array $options = [])
    {
        $this->raw = $global_request;
        $this->user = null;
        $this->client = null;
        $this->signup_client = null;
        $this->banner_message_manager = null;

        $https = isset($server['HTTPS']) && $server['HTTPS'] == 'on';
        $httpssl = isset($server['HTTP_SSL']) && $server['HTTP_SSL'] == 'On';
        $forwarded_proto = isset($server['HTTP_X_FORWARDED_PROTO']) && $server['HTTP_X_FORWARDED_PROTO'] == 'https';
        $this->ssl_connection = $https || $httpssl || $forwarded_proto;

        $this->url_protocol = $this->ssl_connection ? 'https' : 'http';
        $this->request_method = isset($server['REQUEST_METHOD']) ? strtoupper($server['REQUEST_METHOD']) : '';
        $this->request_uri = $server['REQUEST_URI'] ?? '/';

        $this->host = $options['host'] ?? Util::getSetting('host', "");

        $this->environment = Environment::$Production;
        $this->api_key_in_use = "";
    }

    public function getRaw(): array
    {
        return $this->raw;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }
    public function setUser(?User $user): void
    {
        if (isset($user)) {
            $this->user = $user;
        }
    }

    public function getClient(): ?CPClient
    {
        return $this->client;
    }

    public function setClient(?CPClient $client): void
    {
        if (isset($client)) {
            $this->client = $client;
        }
    }

    public function getSignupClient(): ?CPSignupClient
    {
        return $this->signup_client;
    }

    public function setSignupClient(?CPSignupClient $client): void
    {
        if (isset($client)) {
            $this->signup_client = $client;
        }
    }

    public function getBannerMessageManager(): ?BannerMessageManager
    {
        return $this->banner_message_manager;
    }

    public function setBannerMessageManager(?BannerMessageManager $manager): void
    {
        if (isset($manager)) {
            $this->banner_message_manager = $manager;
        }
    }

    public function isSslConnection(): bool
    {
        return $this->ssl_connection;
    }

    public function getUrlProtocol(): string
    {
        return $this->url_protocol;
    }

    public function getRequestMethod(): string
    {
        return $this->request_method;
    }

    public function getRequestUri(): string
    {
        return $this->request_uri;
    }

    public function getHost(): string
    {
        return $this->host;
    }

    public function setEnvironment(?string $env = ''): void
    {
      // This should really be a match, but we're on 7.4
        switch ($env) {
            case 'development':
                $this->environment = Environment::$Development;
                break;
            case 'qa':
                $this->environment = Environment::$QA;
                break;
            case 'production':
                $this->environment = Environment::$Production;
                break;
            default:
                $this->environment = Environment::$Production;
                break;
        }
    }

    public function getEnvironment(): string
    {
        return $this->environment;
    }

    /**
     * This returns an API key if one is in use, if not, it returns an empty string
     *
     * @return string the api key
     * */
    public function getApiKeyInUse(): string
    {
        if (empty($this->api_key_in_use)) {
            $user_api_key = $this->getRaw()['k'] ?? "";
            if (empty($user_api_key)) {
                $user_api_key_header = $this->user_api_key_header;
                $request_headers = getallheaders();
                $matching_headers = array_filter($request_headers, function ($k) use ($user_api_key_header) {
                    return strtolower($k) == strtolower($user_api_key_header);
                }, ARRAY_FILTER_USE_KEY);
                if (!empty($matching_headers)) {
                    $user_api_key = array_values($matching_headers)[0];
                }
            }

            $this->api_key_in_use = $user_api_key;
        }

        return $this->api_key_in_use;
    }
}
