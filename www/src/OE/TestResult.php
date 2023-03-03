<?php

declare(strict_types=1);

namespace WebPageTest\OE;

class TestResult
{
    private string $name;
    private string $title;
    private string $desc;
    private array $examples;
    private array $experiments;
    private bool $good;
    private bool $hideassets;
    private bool $inputttext;
    private array $custom_attributes;

    public function __construct(array $args = [])
    {
        $this->name = $args['name'] ?? "";
        $this->title = $args['title'] ?? "";
        $this->desc = $args['desc'] ?? "";
        $this->examples = $args['examples'] ?? [];
        $this->experiments = $args['experiments'] ?? [];
        $this->hideassets = $args['hideassets'] ?? false;
        $this->inputttext = $args['inputttext'] ?? false;
        $this->good = $args['good'] ?? true;
        $this->custom_attributes = $args['custom_attributes'] ?? [];
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function getDescription(): string
    {
        return $this->desc;
    }

    public function getExamples(): array
    {
        return $this->examples;
    }

    public function getExperiments(): array
    {
        return $this->experiments;
    }

    public function isGood(): bool
    {
        return $this->good;
    }

    public function hideAssets(): bool
    {
        return $this->hideassets;
    }

    public function inputTText(): bool
    {
        return $this->hideassets;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getCustomAttributes(): array
    {
        return $this->custom_attributes;
    }

    public function getCustomAttribute(string $key)
    {
        return $this->custom_attributes[$key] ?? null;
    }
}
