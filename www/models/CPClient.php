<?php declare(strict_types=1);

namespace WebPageTest;

use WebPageTest\AuthToken;
use WebPageTest\Exception\ClientException;

class CPClient {
  private \GuzzleHttp\Client $authClient;
  public ?string $client_id;
  public ?string $client_secret;
  public ?string $grant_type;

  function __construct(string $host, array $options = []) {
    $auth_client_options = $options['auth_client_options'] ?? array();
    $this->client_id = $auth_client_options['client_id'] ?? null;
    $this->client_secret = $auth_client_options['client_secret'] ?? null;
    $this->grant_type = $auth_client_options['grant_type'] ?? null;
    $this->authClient = new \GuzzleHttp\Client($auth_client_options);

    $this->host = $host;
  }

  function login (string $username, string $password) : AuthToken {
    if (is_null($this->client_id) || is_null($this->client_secret) || is_null($this->grant_type)) {
      throw new \Exception("Client ID, Client Secret, and Grant Type all must be set in order to login");
    }

    $body = array(
     'form_params' => array(
        'client_id' => $this->client_id,
        'client_secret' => $this->client_secret,
        'grant_type' => $this->grant_type,
        'username' => $username,
        'password' => $password
     )
    );
    try {
      $response = $this->authClient->request('POST', '/auth/connect/token', $body);
    } catch (\Exception $e) {
      throw new ClientException($e->getMessage());
    }
    $json = json_decode((string)$response->getBody());
    return new AuthToken((array)$json);
  }

  function refreshAuthToken (string $refresh_token) : AuthToken {
    if (is_null($this->client_id) || is_null($this->client_secret) || is_null($this->grant_type)) {
      throw new \Exception("Client ID, Client Secret, and Grant Type all must be set in order to login");
    }

    $body = array(
     'form_params' => array(
        'client_id' => $this->client_id,
        'client_secret' => $this->client_secret,
        'grant_type' => 'refresh_token',
        'refresh_token' => $refresh_token
     )
    );
    try {
      $response = $this->authClient->request('POST', '/auth/connect/token', $body);
    } catch (\Exception $e) {
      throw new ClientException($e->getMessage());
    }
    $json = json_decode((string)$response->getBody());
    return new AuthToken((array)$json);
  }

  function revokeToken (string $token, string $type = 'access_token') : void {
    $body = array(
     'form_params' => array(
       'token' => $token,
       'token_type_hint' => $type,
       'client_id' => $this->client_id,
       'client_secret' => $this->client_secret
     )
    );
    try {
      $this->authClient->request('POST', '/auth/connect/revocation', $body);
    } catch (\Exception $e) {
      throw new ClientException($e->getMessage());
    }
  }
}
?>
