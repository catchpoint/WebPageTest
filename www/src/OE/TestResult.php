<?php

declare(strict_types=1);

namespace WebPageTest\OE;

class TestResult
{
    private string $title;
    private string $desc;
    private array $examples;
    private array $experiments;
    private bool $good;

    public function __construct(array $args = [])
    {
        $this->title = $args['title'] ?? "";
        $this->desc = $args['desc'] ?? "";
        $this->examples = $args['examples'] ?? [];
        $this->experiments = $args['experiments'] ?? [];
        $this->good = true;
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
}
