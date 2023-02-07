<?php

declare(strict_types=1);

namespace WebPageTest;

use IteratorAggregate;
use Traversable;
use Countable;
use ArrayIterator;
use WebPageTest\Plan;

/**
 *
 * @implements IteratorAggregate<Plan>
 * @implements Countable<Plan>
 *
 * */
class PlanList implements IteratorAggregate, Countable
{
    private array $list;
    private array $monthly_plans;
    private array $annual_plans;

    public function __construct(Plan ...$plans)
    {
        usort($plans, function ($a, $b) {
            if ($a->getPrice() == $b->getPrice()) {
                return 0;
            }
            return ($a->getPrice() < $b->getPrice()) ? -1 : 1;
        });

        $this->monthly_plans = [];
        $this->annual_plans = [];

        foreach ($plans as $plan) {
            if ($plan->getBillingFrequency() == "Monthly") {
                $this->monthly_plans[] = $plan;
            } else {
                $this->annual_plans[] = $plan;
            }
        }

        $this->list = $plans;
    }

    public function add(Plan $plan)
    {
        $this->list[] = $plan;
    }

    public function getMonthlyPlans(): array
    {
        return $this->monthly_plans;
    }

    public function getAnnualPlans(): array
    {
        return $this->annual_plans;
    }

    public function toArray(): array
    {
        return $this->list;
    }

    public function getIterator(): Traversable
    {
        return new ArrayIterator($this->list);
    }

    public function count(): int
    {
        return count($this->list);
    }
}
