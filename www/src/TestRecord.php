<?php

declare(strict_types=1);

namespace WebPageTest;

/**
 * A test history object, as tracked by CP
 */
class TestRecord implements \JsonSerializable
{
    private int $id;
    private string $test_id;
    private string $url;
    private string $location;
    private string $label;
    private string $test_start_time;
    private string $user;
    private ?string $api_key;
    private int $test_runs;

    public function __construct(array $options = [])
    {
        $this->id = $options['id'] ?? 0;
        $this->test_id = $options['testId'] ?? '';
        $this->url = $options['url'] ?? '';
        $this->location = $options['location'] ?? '';
        $this->label = $options['label'] ?? '';
        $this->test_start_time = $options['testStartTime'] ?? '';
        $this->user = $options['user'] ?? '';
        $this->api_key = $options['apiKey'] ?? null;
        $this->test_runs = $options['testRuns'] ?? 1;
    }

    public function getId(): int
    {
        return $this->id;
    }

    public function getTestId(): string
    {
        return $this->test_id;
    }

    public function getUrl(): string
    {
        return $this->url;
    }

    public function getLocation(): string
    {
        return $this->location;
    }

    public function getLabel(): string
    {
        return $this->label;
    }

    public function getStartTime(): string
    {
        return $this->test_start_time;
    }

    public function getUser(): string
    {
        return $this->user;
    }

    public function getApiKey(): ?string
    {
        return $this->api_key;
    }

    public function getTestRuns(): int
    {
        return $this->test_runs;
    }

    public function jsonSerialize(): array
    {
        return [
        'id' => $this->id,
        'testId' => $this->test_id,
        'url' => $this->url,
        'location' => $this->location,
        'label' => $this->label,
        'testStartTime' => $this->test_start_time,
        'user' => $this->user,
        'apiKey' => $this->api_key,
        'testRuns' => $this->test_runs
        ];
    }
}
